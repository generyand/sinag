import hashlib
from pathlib import Path

import pytest

from app.services.gar_export_service import GARExportService

REFERENCE_ISO_LOGO_SHA256 = "569e277e2aad7298cc10817d94cc3ce2f22a9fbf69dcd3f08ca7080d3a996cfe"


class _FakeCanvas:
    def __init__(self):
        self.image_calls: list[dict[str, float | str | bool]] = []

    def saveState(self):
        return None

    def restoreState(self):
        return None

    def setFont(self, *_args, **_kwargs):
        return None

    def drawCentredString(self, *_args, **_kwargs):
        return None

    def setFillColor(self, *_args, **_kwargs):
        return None

    def getPageNumber(self):
        return 1

    def stringWidth(self, text, _font_name, font_size):
        widths = {
            "“Matino, Mahusay at Maaasahan”": 118.0,
            "MLGRC, Liga Bldg., Municipal Hall Compound": 154.0,
            "Prk. 9 Brgy. Poblacion, Sulop, Davao del Sur": 165.0,
            "sulopdilg2021@gmail.com": 98.0,
        }
        return widths.get(text, len(text) * font_size * 0.4)

    def drawImage(
        self,
        image,
        x,
        y,
        width,
        height,
        preserveAspectRatio=True,
        mask="auto",
    ):
        self.image_calls.append(
            {
                "image": image,
                "x": x,
                "y": y,
                "width": width,
                "height": height,
                "preserveAspectRatio": preserveAspectRatio,
                "mask": mask,
            }
        )


class _FakeColors:
    blue = "blue"
    black = "black"


def test_iso_footer_logo_asset_matches_reference_file():
    asset_path = (
        Path(__file__).resolve().parents[2] / "app" / "static" / "logos" / "iso_9001_2015.png"
    )

    assert asset_path.exists()
    assert hashlib.sha256(asset_path.read_bytes()).hexdigest() == REFERENCE_ISO_LOGO_SHA256


def test_get_footer_logo_positions_places_logos_beside_footer_text():
    service = GARExportService()
    page_width = 595.2756

    left_x, right_x = service._get_footer_logo_positions(
        page_width=page_width,
        text_block_width=165.0,
        mlgrc_logo_width=42.0,
        iso_logo_width=42.0,
        logo_gap=12.0,
    )

    assert left_x == pytest.approx((page_width / 2.0) - (165.0 / 2.0) - 12.0 - 42.0)
    assert right_x == pytest.approx((page_width / 2.0) + (165.0 / 2.0) + 12.0)
    assert left_x > 0.6 * 72
    assert right_x < page_width - (0.6 * 72) - 42.0


def test_draw_pdf_footer_uses_text_relative_logo_positions():
    service = GARExportService()
    canvas = _FakeCanvas()
    page_width = 595.2756
    footer_y = 0.35 * 72

    service._draw_pdf_footer(
        canvas=canvas,
        page_width=page_width,
        footer_y=footer_y,
        mlgrc_logo="mlgrc.png",
        iso_logo="iso_9001_2015.png",
        colors_module=_FakeColors,
    )

    assert len(canvas.image_calls) == 2

    left_logo_call, right_logo_call = canvas.image_calls
    assert left_logo_call["image"] == "mlgrc.png"
    assert right_logo_call["image"] == "iso_9001_2015.png"
    assert left_logo_call["x"] > 0.6 * 72
    assert right_logo_call["x"] < page_width - (0.6 * 72) - right_logo_call["width"]
