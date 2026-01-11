"""
Image Processing Service

Handles EXIF orientation correction and image rotation for uploaded images.
Ensures images display correctly regardless of the device used to capture them.
"""

import io
import logging

from PIL import ExifTags, Image

logger = logging.getLogger(__name__)

# EXIF orientation tag ID
ORIENTATION_TAG = next(
    (tag for tag, name in ExifTags.TAGS.items() if name == "Orientation"),
    None,
)

# Rotation/flip operations for each EXIF orientation value
# See: https://sirv.com/help/articles/rotate-photos-to-be-upright/
EXIF_ORIENTATION_TRANSFORMS = {
    2: (Image.Transpose.FLIP_LEFT_RIGHT,),
    3: (Image.Transpose.ROTATE_180,),
    4: (Image.Transpose.FLIP_TOP_BOTTOM,),
    5: (Image.Transpose.TRANSPOSE,),
    6: (Image.Transpose.ROTATE_270,),
    7: (Image.Transpose.TRANSVERSE,),
    8: (Image.Transpose.ROTATE_90,),
}


class ImageProcessingService:
    """
    Service for processing uploaded images.

    Primary function is to correct EXIF orientation so images
    display correctly in all viewers including canvas-based annotators.
    """

    def correct_exif_orientation(
        self,
        file_contents: bytes,
        content_type: str,
    ) -> tuple[bytes, bool]:
        """
        Correct EXIF orientation by physically rotating the image pixels.

        Mobile cameras often save photos with EXIF orientation metadata instead
        of actually rotating the pixels. This causes images to appear rotated
        in viewers that don't respect EXIF data (like HTML canvas).

        Args:
            file_contents: Raw image bytes
            content_type: MIME type of the image

        Returns:
            tuple[bytes, bool]: (processed_bytes, was_corrected)
            - processed_bytes: The image bytes (corrected if needed, original otherwise)
            - was_corrected: True if orientation was corrected

        Note:
            - Only processes JPEG and PNG images
            - Preserves image quality (uses quality=95 for JPEG)
            - Returns original bytes if no correction needed or on error
        """
        # Only process images
        if content_type not in ("image/jpeg", "image/png"):
            return file_contents, False

        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(file_contents))

            # Get EXIF data
            exif = image.getexif()
            if not exif or ORIENTATION_TAG not in exif:
                logger.debug("No EXIF orientation tag found, skipping correction")
                return file_contents, False

            if ORIENTATION_TAG is None:
                return file_contents, False
            orientation = exif.get(ORIENTATION_TAG)

            # Orientation 1 means normal (no rotation needed)
            if orientation == 1 or orientation not in EXIF_ORIENTATION_TRANSFORMS:
                logger.debug(f"EXIF orientation is {orientation}, no correction needed")
                return file_contents, False

            # Apply transforms to physically rotate the pixels
            transforms = EXIF_ORIENTATION_TRANSFORMS[orientation]
            rotated_img = image
            for transform in transforms:
                rotated_img = rotated_img.transpose(transform)

            # Set orientation to normal since we've physically rotated the image
            exif[ORIENTATION_TAG] = 1

            # Save to bytes
            output = io.BytesIO()

            # Determine format and save options
            if content_type == "image/jpeg":
                # Preserve JPEG quality
                rotated_img.save(
                    output,
                    format="JPEG",
                    quality=95,  # High quality to minimize compression artifacts
                    exif=exif.tobytes(),
                )
            else:  # PNG
                # PNG doesn't typically have EXIF but handle it anyway
                rotated_img.save(output, format="PNG")

            output.seek(0)
            corrected_bytes = output.read()

            logger.info(
                f"Corrected EXIF orientation {orientation} for image "
                f"({len(file_contents)} -> {len(corrected_bytes)} bytes)"
            )

            return corrected_bytes, True

        except Exception as e:
            logger.warning(f"Failed to correct EXIF orientation: {e!s}. Returning original image.")
            return file_contents, False

    def rotate_image(
        self,
        file_contents: bytes,
        content_type: str,
        degrees: int = 90,
    ) -> tuple[bytes, bool]:
        """
        Rotate an image by the specified degrees clockwise.

        Args:
            file_contents: Raw image bytes
            content_type: MIME type of the image
            degrees: Rotation angle in degrees clockwise (90, 180, 270). Default: 90

        Returns:
            tuple[bytes, bool]: (rotated_bytes, was_rotated)
            - rotated_bytes: The rotated image bytes (or original on error)
            - was_rotated: True if rotation was successful

        Note:
            - Only processes JPEG and PNG images
            - Preserves image quality (uses quality=95 for JPEG)
            - Preserves EXIF data, resets orientation tag to 1
            - Returns original bytes on error
        """
        # Only process images
        if content_type not in ("image/jpeg", "image/png"):
            logger.warning(f"Cannot rotate non-image file type: {content_type}")
            return file_contents, False

        # Validate rotation angle
        valid_rotations = {90, 180, 270}
        if degrees not in valid_rotations:
            logger.warning(f"Invalid rotation angle: {degrees}. Must be 90, 180, or 270.")
            return file_contents, False

        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(file_contents))

            # Map degrees to Pillow rotation
            # Pillow's ROTATE constants are counter-clockwise, so:
            # 90° CW = 270° CCW (ROTATE_270)
            # 180° CW = 180° CCW (ROTATE_180)
            # 270° CW = 90° CCW (ROTATE_90)
            rotation_map = {
                90: Image.Transpose.ROTATE_270,
                180: Image.Transpose.ROTATE_180,
                270: Image.Transpose.ROTATE_90,
            }

            # Apply rotation
            rotated_image = image.transpose(rotation_map[degrees])

            # Get EXIF data if present
            exif = image.getexif()

            # Save to bytes
            output = io.BytesIO()

            if content_type == "image/jpeg":
                if exif:
                    # Reset orientation since we physically rotated
                    if ORIENTATION_TAG and ORIENTATION_TAG in exif:
                        exif[ORIENTATION_TAG] = 1
                    rotated_image.save(
                        output,
                        format="JPEG",
                        quality=95,
                        exif=exif.tobytes(),
                    )
                else:
                    rotated_image.save(output, format="JPEG", quality=95)
            else:  # PNG
                rotated_image.save(output, format="PNG")

            output.seek(0)
            rotated_bytes = output.read()

            logger.info(
                f"Rotated image {degrees} degrees clockwise "
                f"({len(file_contents)} -> {len(rotated_bytes)} bytes)"
            )

            return rotated_bytes, True

        except Exception as e:
            logger.warning(f"Failed to rotate image: {e!s}. Returning original.")
            return file_contents, False


# Singleton instance
image_processing_service = ImageProcessingService()
