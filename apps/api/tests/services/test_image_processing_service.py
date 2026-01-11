"""
Tests for ImageProcessingService EXIF orientation correction.

Tests the correction of EXIF orientation metadata in uploaded images.
Mobile phone cameras often save photos with EXIF orientation metadata
instead of physically rotating the pixels, causing display issues.
"""

import io

import pytest
from PIL import Image

from app.services.image_processing_service import (
    ORIENTATION_TAG,
    ImageProcessingService,
    image_processing_service,
)


class TestImageProcessingService:
    """Test suite for EXIF orientation correction."""

    @pytest.fixture
    def service(self):
        """Fixture providing ImageProcessingService instance."""
        return ImageProcessingService()

    def _create_test_image(
        self,
        width: int = 100,
        height: int = 50,
        color: str = "red",
        orientation: int | None = None,
        format: str = "JPEG",
    ) -> bytes:
        """
        Create a test image with optional EXIF orientation.

        Args:
            width: Image width
            height: Image height
            color: Fill color
            orientation: EXIF orientation value (1-8), or None for no EXIF
            format: Image format (JPEG, PNG)

        Returns:
            Image bytes
        """
        img = Image.new("RGB", (width, height), color=color)

        output = io.BytesIO()

        if orientation is not None and format == "JPEG":
            # Add EXIF with orientation
            exif = img.getexif()
            exif[ORIENTATION_TAG] = orientation
            img.save(output, format=format, exif=exif.tobytes())
        else:
            img.save(output, format=format)

        output.seek(0)
        return output.read()

    # Test 1: Orientation 6 (90 degrees CW) is corrected
    def test_orientation_6_rotates_image(self, service):
        """Orientation 6 (rotate 90 CW) should physically rotate the image."""
        # Create 100x50 image with orientation 6 (will appear 50x100 after correction)
        original = self._create_test_image(width=100, height=50, orientation=6)

        result, was_corrected = service.correct_exif_orientation(original, "image/jpeg")

        assert was_corrected is True

        # Verify dimensions changed (90 degree rotation swaps width/height)
        result_img = Image.open(io.BytesIO(result))
        assert result_img.size == (50, 100), (
            "Image dimensions should be swapped after 90deg rotation"
        )

        # Verify EXIF orientation is now 1 (normal)
        exif = result_img.getexif()
        assert exif.get(ORIENTATION_TAG) == 1, (
            "EXIF orientation should be set to 1 after correction"
        )

    # Test 2: Orientation 8 (90 degrees CCW) is corrected
    def test_orientation_8_rotates_image(self, service):
        """Orientation 8 (rotate 90 CCW) should physically rotate the image."""
        original = self._create_test_image(width=100, height=50, orientation=8)

        result, was_corrected = service.correct_exif_orientation(original, "image/jpeg")

        assert was_corrected is True
        result_img = Image.open(io.BytesIO(result))
        assert result_img.size == (50, 100)

    # Test 3: Orientation 3 (180 degrees) is corrected
    def test_orientation_3_rotates_180(self, service):
        """Orientation 3 (rotate 180) should rotate but keep same dimensions."""
        original = self._create_test_image(width=100, height=50, orientation=3)

        result, was_corrected = service.correct_exif_orientation(original, "image/jpeg")

        assert was_corrected is True
        result_img = Image.open(io.BytesIO(result))
        # 180 degree rotation preserves dimensions
        assert result_img.size == (100, 50)

    # Test 4: Orientation 1 (normal) is not modified
    def test_orientation_1_not_modified(self, service):
        """Orientation 1 (normal) should not be modified."""
        original = self._create_test_image(orientation=1)

        result, was_corrected = service.correct_exif_orientation(original, "image/jpeg")

        assert was_corrected is False
        # Result should be the original bytes
        assert result == original

    # Test 5: Image without EXIF is not modified
    def test_no_exif_not_modified(self, service):
        """Images without EXIF orientation should not be modified."""
        original = self._create_test_image(orientation=None)

        result, was_corrected = service.correct_exif_orientation(original, "image/jpeg")

        assert was_corrected is False

    # Test 6: PNG images without EXIF are not modified
    def test_png_without_exif_not_modified(self, service):
        """PNG images without EXIF should pass through unchanged."""
        original = self._create_test_image(format="PNG", orientation=None)

        result, was_corrected = service.correct_exif_orientation(original, "image/png")

        assert was_corrected is False

    # Test 7: PDF files are not processed
    def test_pdf_not_processed(self, service):
        """PDF files should not be processed (only images)."""
        pdf_bytes = b"%PDF-1.4\n%more content"

        result, was_corrected = service.correct_exif_orientation(pdf_bytes, "application/pdf")

        assert was_corrected is False
        assert result == pdf_bytes

    # Test 8: Other non-image content types are not processed
    def test_non_image_content_type_not_processed(self, service):
        """Non-image content types should not be processed."""
        content = b"some content"

        result, was_corrected = service.correct_exif_orientation(content, "text/plain")

        assert was_corrected is False
        assert result == content

    # Test 9: Corrupted image returns original bytes
    def test_corrupted_image_returns_original(self, service):
        """Corrupted images should return original bytes without error."""
        corrupted = b"not a valid image at all"

        result, was_corrected = service.correct_exif_orientation(corrupted, "image/jpeg")

        assert was_corrected is False
        assert result == corrupted

    # Test 10: All flip orientations work
    @pytest.mark.parametrize(
        "orientation,description",
        [
            (2, "flip horizontal"),
            (4, "flip vertical"),
            (5, "transpose"),
            (7, "transverse"),
        ],
    )
    def test_flip_orientations(self, service, orientation, description):
        """Flip orientations (2, 4, 5, 7) should be corrected."""
        original = self._create_test_image(orientation=orientation)

        result, was_corrected = service.correct_exif_orientation(original, "image/jpeg")

        assert was_corrected is True, (
            f"Orientation {orientation} ({description}) should be corrected"
        )
        result_img = Image.open(io.BytesIO(result))
        exif = result_img.getexif()
        assert exif.get(ORIENTATION_TAG) == 1

    # Test 11: JPEG quality is preserved (not overly compressed)
    def test_jpeg_quality_preserved(self, service):
        """Corrected JPEG should not be excessively compressed."""
        # Create a larger image to see compression effects
        original = self._create_test_image(width=500, height=300, orientation=6)
        original_size = len(original)

        result, was_corrected = service.correct_exif_orientation(original, "image/jpeg")

        assert was_corrected is True
        result_size = len(result)
        # Result size should be reasonable (not drastically smaller due to low quality)
        # We use quality=95, so sizes should be similar
        assert result_size > original_size * 0.5, (
            "Result should not be drastically smaller (quality preserved)"
        )

    # Test 12: Singleton instance works
    def test_singleton_instance(self):
        """The module-level singleton should work correctly."""
        original = self._create_test_image(orientation=6)

        result, was_corrected = image_processing_service.correct_exif_orientation(
            original, "image/jpeg"
        )

        assert was_corrected is True


class TestImageRotation:
    """Test suite for image rotation functionality."""

    @pytest.fixture
    def service(self):
        """Fixture providing ImageProcessingService instance."""
        return ImageProcessingService()

    def _create_test_image(
        self,
        width: int = 100,
        height: int = 50,
        color: str = "red",
        orientation: int | None = None,
        format: str = "JPEG",
    ) -> bytes:
        """
        Create a test image with optional EXIF orientation.

        Args:
            width: Image width
            height: Image height
            color: Fill color
            orientation: EXIF orientation value (1-8), or None for no EXIF
            format: Image format (JPEG, PNG)

        Returns:
            Image bytes
        """
        img = Image.new("RGB", (width, height), color=color)

        output = io.BytesIO()

        if orientation is not None and format == "JPEG":
            # Add EXIF with orientation
            exif = img.getexif()
            exif[ORIENTATION_TAG] = orientation
            img.save(output, format=format, exif=exif.tobytes())
        else:
            img.save(output, format=format)

        output.seek(0)
        return output.read()

    # Test 13: Rotate 90 degrees clockwise
    def test_rotate_90_degrees_clockwise(self, service):
        """90 degree CW rotation should swap width/height."""
        # Create 100x50 image, after 90 CW rotation should be 50x100
        original = self._create_test_image(width=100, height=50, orientation=None)

        result, was_rotated = service.rotate_image(original, "image/jpeg", 90)

        assert was_rotated is True
        result_img = Image.open(io.BytesIO(result))
        assert result_img.size == (50, 100), "90° CW rotation should swap dimensions"

    # Test 14: Rotate 180 degrees
    def test_rotate_180_degrees(self, service):
        """180 degree rotation should preserve dimensions."""
        original = self._create_test_image(width=100, height=50, orientation=None)

        result, was_rotated = service.rotate_image(original, "image/jpeg", 180)

        assert was_rotated is True
        result_img = Image.open(io.BytesIO(result))
        assert result_img.size == (100, 50), "180° rotation should preserve dimensions"

    # Test 15: Rotate 270 degrees clockwise
    def test_rotate_270_degrees_clockwise(self, service):
        """270 degree CW rotation should swap width/height."""
        original = self._create_test_image(width=100, height=50, orientation=None)

        result, was_rotated = service.rotate_image(original, "image/jpeg", 270)

        assert was_rotated is True
        result_img = Image.open(io.BytesIO(result))
        assert result_img.size == (50, 100), "270° CW rotation should swap dimensions"

    # Test 16: Invalid rotation angle rejected
    def test_invalid_rotation_angle_rejected(self, service):
        """Invalid rotation angles (not 90, 180, 270) should return original."""
        original = self._create_test_image(orientation=None)

        result, was_rotated = service.rotate_image(original, "image/jpeg", 45)

        assert was_rotated is False
        assert result == original

    # Test 17: Zero degrees rejected
    def test_zero_degrees_rejected(self, service):
        """0 degrees should be rejected as it's a no-op."""
        original = self._create_test_image(orientation=None)

        result, was_rotated = service.rotate_image(original, "image/jpeg", 0)

        assert was_rotated is False
        assert result == original

    # Test 18: Non-image content type not processed
    def test_non_image_content_type_not_processed(self, service):
        """Non-image content types should not be processed."""
        content = b"some non-image content"

        result, was_rotated = service.rotate_image(content, "application/pdf", 90)

        assert was_rotated is False
        assert result == content

    # Test 19: Text content type not processed
    def test_text_content_type_not_processed(self, service):
        """Text content types should not be processed."""
        content = b"plain text content"

        result, was_rotated = service.rotate_image(content, "text/plain", 90)

        assert was_rotated is False
        assert result == content

    # Test 20: Corrupted image returns original
    def test_corrupted_image_returns_original(self, service):
        """Corrupted images should return original bytes without error."""
        corrupted = b"not a valid image at all"

        result, was_rotated = service.rotate_image(corrupted, "image/jpeg", 90)

        assert was_rotated is False
        assert result == corrupted

    # Test 21: PNG rotation works
    def test_png_rotation_works(self, service):
        """PNG images should be rotatable."""
        original = self._create_test_image(width=100, height=50, format="PNG")

        result, was_rotated = service.rotate_image(original, "image/png", 90)

        assert was_rotated is True
        result_img = Image.open(io.BytesIO(result))
        assert result_img.size == (50, 100)
        assert result_img.format == "PNG"

    # Test 22: JPEG quality preserved after rotation
    def test_jpeg_quality_preserved(self, service):
        """Rotated JPEG should not be excessively compressed."""
        # Create larger image to see compression effects
        original = self._create_test_image(width=500, height=300, orientation=None)
        original_size = len(original)

        result, was_rotated = service.rotate_image(original, "image/jpeg", 90)

        assert was_rotated is True
        result_size = len(result)
        # Result size should be reasonable (not drastically smaller due to low quality)
        assert result_size > original_size * 0.5, "Result should preserve quality"

    # Test 23: EXIF orientation tag reset to 1 after rotation
    def test_exif_orientation_reset_after_rotation(self, service):
        """EXIF orientation should be reset to 1 after rotation."""
        # Create image with orientation 6 (which would normally need correction)
        original = self._create_test_image(width=100, height=50, orientation=6)

        result, was_rotated = service.rotate_image(original, "image/jpeg", 90)

        assert was_rotated is True
        result_img = Image.open(io.BytesIO(result))
        exif = result_img.getexif()
        assert exif.get(ORIENTATION_TAG) == 1, "Orientation should be reset to 1"

    # Test 24: Image without EXIF can be rotated
    def test_image_without_exif_rotates(self, service):
        """Images without EXIF data should still rotate correctly."""
        # Create PNG (no EXIF)
        original = self._create_test_image(width=100, height=50, format="PNG")

        result, was_rotated = service.rotate_image(original, "image/png", 90)

        assert was_rotated is True
        result_img = Image.open(io.BytesIO(result))
        assert result_img.size == (50, 100)

    # Test 25: Multiple rotations compound correctly
    def test_multiple_rotations_compound(self, service):
        """Two 90° rotations should equal one 180° rotation."""
        original = self._create_test_image(width=100, height=50, orientation=None)

        # Rotate 90° twice
        result1, _ = service.rotate_image(original, "image/jpeg", 90)
        result2, _ = service.rotate_image(result1, "image/jpeg", 90)

        # Single 180° rotation
        result180, _ = service.rotate_image(original, "image/jpeg", 180)

        # Both should have same dimensions (back to original 100x50)
        result2_img = Image.open(io.BytesIO(result2))
        result180_img = Image.open(io.BytesIO(result180))
        assert result2_img.size == result180_img.size == (100, 50)

    # Test 26: Singleton instance works for rotation
    def test_singleton_instance_rotation(self):
        """The module-level singleton should work for rotation."""
        img = Image.new("RGB", (100, 50), color="blue")
        output = io.BytesIO()
        img.save(output, format="JPEG")
        output.seek(0)
        original = output.read()

        result, was_rotated = image_processing_service.rotate_image(original, "image/jpeg", 90)

        assert was_rotated is True
        result_img = Image.open(io.BytesIO(result))
        assert result_img.size == (50, 100)
