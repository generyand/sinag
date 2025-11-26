# GAR Export Service
# Generates Excel and PDF exports for GAR reports

import io
import logging
from typing import Optional

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from app.schemas.gar import GARResponse, GARGovernanceArea, GARIndicator, GARChecklistItem


class GARExportService:
    """Service for exporting GAR reports to Excel and PDF."""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

        # Define colors matching the official GAR format
        self.colors = {
            "met": "90EE90",  # Light green
            "considered": "FFFF00",  # Yellow
            "unmet": "FF6B6B",  # Light red
            "header_bg": "90EE90",  # Light green for area headers
            "overall_bg": "90EE90",  # Light green for overall result
        }

        # Define border style
        self.thin_border = Border(
            left=Side(style="thin"),
            right=Side(style="thin"),
            top=Side(style="thin"),
            bottom=Side(style="thin"),
        )

    def generate_excel(self, gar_data: GARResponse) -> io.BytesIO:
        """
        Generate Excel file for GAR report.

        Args:
            gar_data: GAR response data

        Returns:
            BytesIO buffer containing the Excel file
        """
        wb = Workbook()
        ws = wb.active
        ws.title = "GAR Report"

        # Set column widths
        ws.column_dimensions["A"].width = 80  # Indicators column
        ws.column_dimensions["B"].width = 15  # Result column

        current_row = 1

        # Add header
        current_row = self._add_header(ws, gar_data, current_row)

        # Add each governance area
        for area in gar_data.governance_areas:
            current_row = self._add_governance_area(ws, area, current_row)
            current_row += 1  # Add spacing between areas

        # Add summary table if multiple areas
        if len(gar_data.governance_areas) > 1:
            current_row = self._add_summary_table(ws, gar_data, current_row)

        # Save to buffer
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        return buffer

    def _add_header(self, ws, gar_data: GARResponse, start_row: int) -> int:
        """Add GAR header with barangay info."""
        row = start_row

        # Title
        ws.merge_cells(f"A{row}:B{row}")
        cell = ws[f"A{row}"]
        cell.value = gar_data.cycle_year
        cell.font = Font(bold=True, size=14)
        cell.alignment = Alignment(horizontal="center")
        row += 1

        # Subtitle
        ws.merge_cells(f"A{row}:B{row}")
        cell = ws[f"A{row}"]
        cell.value = "GOVERNANCE ASSESSMENT REPORT"
        cell.font = Font(bold=True, size=12)
        cell.alignment = Alignment(horizontal="center")
        row += 1

        # Barangay info
        ws.merge_cells(f"A{row}:B{row}")
        cell = ws[f"A{row}"]
        cell.value = f"Barangay {gar_data.barangay_name}, {gar_data.municipality}, {gar_data.province}"
        cell.font = Font(bold=True, italic=True, size=11)
        cell.alignment = Alignment(horizontal="center")
        row += 2  # Extra spacing

        return row

    def _add_governance_area(self, ws, area: GARGovernanceArea, start_row: int) -> int:
        """Add a single governance area section to the worksheet."""
        row = start_row

        # Area header (e.g., "CGA 1: FINANCIAL ADMINISTRATION AND SUSTAINABILITY")
        area_prefix = "CGA" if area.area_type == "Core" else "EGA"
        area_num = area.area_number if area.area_type == "Core" else area.area_number - 3
        area_title = f"{area_prefix} {area_num}: {area.area_name.upper()}"

        ws.merge_cells(f"A{row}:B{row}")
        cell = ws[f"A{row}"]
        cell.value = area_title
        cell.font = Font(bold=True, size=11)
        cell.fill = PatternFill(start_color=self.colors["header_bg"], end_color=self.colors["header_bg"], fill_type="solid")
        cell.border = self.thin_border
        ws[f"B{row}"].border = self.thin_border
        row += 1

        # Column headers
        ws[f"A{row}"].value = "INDICATORS"
        ws[f"A{row}"].font = Font(bold=True)
        ws[f"A{row}"].border = self.thin_border
        ws[f"A{row}"].alignment = Alignment(horizontal="center")

        ws[f"B{row}"].value = "RESULT"
        ws[f"B{row}"].font = Font(bold=True)
        ws[f"B{row}"].border = self.thin_border
        ws[f"B{row}"].alignment = Alignment(horizontal="center")
        row += 1

        # Add result legend in header
        ws[f"B{row - 1}"].value = "RESULT\n(met, considered, unmet)"
        ws[f"B{row - 1}"].alignment = Alignment(horizontal="center", wrap_text=True)

        # Add indicators and checklist items
        for indicator in area.indicators:
            row = self._add_indicator_row(ws, indicator, row)

            # Add checklist items under this indicator
            for item in indicator.checklist_items:
                row = self._add_checklist_row(ws, item, row)

        # Add Overall Result row
        ws[f"A{row}"].value = "OVERALL RESULT"
        ws[f"A{row}"].font = Font(bold=True)
        ws[f"A{row}"].fill = PatternFill(start_color=self.colors["overall_bg"], end_color=self.colors["overall_bg"], fill_type="solid")
        ws[f"A{row}"].border = self.thin_border

        ws[f"B{row}"].border = self.thin_border
        if area.overall_result:
            result_color = self.colors["met"] if area.overall_result == "Passed" else self.colors["unmet"]
            ws[f"B{row}"].fill = PatternFill(start_color=result_color, end_color=result_color, fill_type="solid")
        row += 1

        return row

    def _add_indicator_row(self, ws, indicator: GARIndicator, row: int) -> int:
        """Add an indicator row to the worksheet."""
        # Indicator name with code
        indent = "  " * indicator.indent_level
        cell_value = f"{indent}{indicator.indicator_code} {indicator.indicator_name}"

        ws[f"A{row}"].value = cell_value
        ws[f"A{row}"].border = self.thin_border
        ws[f"A{row}"].alignment = Alignment(wrap_text=True, vertical="top")

        # Make header indicators bold
        if indicator.is_header:
            ws[f"A{row}"].font = Font(bold=True)
            ws[f"A{row}"].fill = PatternFill(start_color="E8F5E9", end_color="E8F5E9", fill_type="solid")

        # Result cell
        ws[f"B{row}"].border = self.thin_border
        if indicator.validation_status and not indicator.is_header:
            color = self._get_status_color(indicator.validation_status)
            if color:
                ws[f"B{row}"].fill = PatternFill(start_color=color, end_color=color, fill_type="solid")

        return row + 1

    def _add_checklist_row(self, ws, item: GARChecklistItem, row: int) -> int:
        """Add a checklist item row to the worksheet."""
        # Skip info_text items that are just labels
        if item.item_type == "info_text" and not item.validation_result:
            # Still show info_text as headers/labels
            ws[f"A{row}"].value = f"    {item.label}"
            ws[f"A{row}"].border = self.thin_border
            ws[f"A{row}"].font = Font(italic=True)
            ws[f"B{row}"].border = self.thin_border
            return row + 1

        # Regular checklist item
        ws[f"A{row}"].value = f"    {item.label}"
        ws[f"A{row}"].border = self.thin_border
        ws[f"A{row}"].alignment = Alignment(wrap_text=True, vertical="top")

        # Result cell with color
        ws[f"B{row}"].border = self.thin_border
        if item.validation_result:
            color = self._get_result_color(item.validation_result)
            if color:
                ws[f"B{row}"].fill = PatternFill(start_color=color, end_color=color, fill_type="solid")

        return row + 1

    def _add_summary_table(self, ws, gar_data: GARResponse, start_row: int) -> int:
        """Add summary table at the bottom of the report."""
        row = start_row + 1  # Add spacing

        # Core Governance Areas header
        ws[f"A{row}"].value = "Core Governance Area"
        ws[f"A{row}"].font = Font(bold=True)
        ws[f"A{row}"].border = self.thin_border

        ws[f"B{row}"].value = "Result"
        ws[f"B{row}"].font = Font(bold=True)
        ws[f"B{row}"].border = self.thin_border
        row += 1

        # Core areas
        for item in gar_data.summary:
            if item.area_type == "Core":
                ws[f"A{row}"].value = item.area_name
                ws[f"A{row}"].border = self.thin_border

                ws[f"B{row}"].border = self.thin_border
                if item.result:
                    color = self.colors["met"] if item.result == "Passed" else self.colors["unmet"]
                    ws[f"B{row}"].fill = PatternFill(start_color=color, end_color=color, fill_type="solid")
                row += 1

        # Essential Governance Areas header
        ws[f"A{row}"].value = "Essential Governance Area"
        ws[f"A{row}"].font = Font(bold=True)
        ws[f"A{row}"].border = self.thin_border

        ws[f"B{row}"].value = "Result"
        ws[f"B{row}"].font = Font(bold=True)
        ws[f"B{row}"].border = self.thin_border
        row += 1

        # Essential areas
        for item in gar_data.summary:
            if item.area_type == "Essential":
                ws[f"A{row}"].value = item.area_name
                ws[f"A{row}"].border = self.thin_border

                ws[f"B{row}"].border = self.thin_border
                if item.result:
                    color = self.colors["met"] if item.result == "Passed" else self.colors["unmet"]
                    ws[f"B{row}"].fill = PatternFill(start_color=color, end_color=color, fill_type="solid")
                row += 1

        return row

    def _get_status_color(self, status: str) -> Optional[str]:
        """Get color for validation status."""
        if status == "Pass":
            return self.colors["met"]
        elif status == "Conditional":
            return self.colors["considered"]
        elif status == "Fail":
            return self.colors["unmet"]
        return None

    def _get_result_color(self, result: str) -> Optional[str]:
        """Get color for checklist validation result."""
        return self.colors.get(result)

    def generate_pdf(self, gar_data: GARResponse) -> io.BytesIO:
        """
        Generate PDF file for GAR report.

        Args:
            gar_data: GAR response data

        Returns:
            BytesIO buffer containing the PDF file
        """
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

            buffer = io.BytesIO()
            # Use landscape orientation for more width
            doc = SimpleDocTemplate(
                buffer,
                pagesize=landscape(A4),
                topMargin=0.5*inch,
                bottomMargin=0.5*inch,
                leftMargin=0.5*inch,
                rightMargin=0.5*inch,
            )
            elements = []
            styles = getSampleStyleSheet()

            # Title style
            title_style = ParagraphStyle(
                'Title',
                parent=styles['Heading1'],
                fontSize=14,
                alignment=1,  # Center
                spaceAfter=6,
            )

            # Cell text style for wrapping
            cell_style = ParagraphStyle(
                'CellStyle',
                parent=styles['Normal'],
                fontSize=9,
                leading=11,
            )

            # Add header
            elements.append(Paragraph(gar_data.cycle_year, title_style))
            elements.append(Paragraph("GOVERNANCE ASSESSMENT REPORT", title_style))
            elements.append(Paragraph(
                f"<i>Barangay {gar_data.barangay_name}, {gar_data.municipality}, {gar_data.province}</i>",
                title_style
            ))
            elements.append(Spacer(1, 20))

            # Color definitions for PDF
            met_color = colors.Color(0.56, 0.93, 0.56)  # Light green
            considered_color = colors.Color(1, 1, 0)  # Yellow
            unmet_color = colors.Color(1, 0.42, 0.42)  # Light red
            header_color = colors.Color(0.56, 0.93, 0.56)  # Light green

            # Add each governance area
            for area in gar_data.governance_areas:
                # Area header
                area_prefix = "CGA" if area.area_type == "Core" else "EGA"
                area_num = area.area_number if area.area_type == "Core" else area.area_number - 3
                area_title = f"{area_prefix} {area_num}: {area.area_name.upper()}"

                # Build table data using Paragraph for text wrapping
                table_data = []
                table_data.append([Paragraph(f"<b>{area_title}</b>", cell_style), ""])  # Area header row
                table_data.append([Paragraph("<b>INDICATORS</b>", cell_style), Paragraph("<b>RESULT</b>", cell_style)])  # Column headers

                # Style commands for this table
                style_commands = [
                    # Area header
                    ('SPAN', (0, 0), (1, 0)),
                    ('BACKGROUND', (0, 0), (1, 0), header_color),
                    ('ALIGN', (0, 0), (1, 0), 'CENTER'),

                    # Column headers
                    ('BACKGROUND', (0, 1), (1, 1), colors.lightgrey),
                    ('ALIGN', (0, 1), (1, 1), 'CENTER'),

                    # Grid
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 4),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ]

                row_idx = 2  # Start after headers

                # Add indicators and checklist items
                for indicator in area.indicators:
                    indent = "&nbsp;&nbsp;" * indicator.indent_level
                    indicator_text = f"{indent}<b>{indicator.indicator_code}</b> {indicator.indicator_name}"

                    # Use Paragraph for text wrapping
                    table_data.append([Paragraph(indicator_text, cell_style), ""])

                    # Color for indicator
                    if indicator.validation_status and not indicator.is_header:
                        if indicator.validation_status == "Pass":
                            style_commands.append(('BACKGROUND', (1, row_idx), (1, row_idx), met_color))
                        elif indicator.validation_status == "Conditional":
                            style_commands.append(('BACKGROUND', (1, row_idx), (1, row_idx), considered_color))
                        elif indicator.validation_status == "Fail":
                            style_commands.append(('BACKGROUND', (1, row_idx), (1, row_idx), unmet_color))

                    if indicator.is_header:
                        style_commands.append(('BACKGROUND', (0, row_idx), (0, row_idx), colors.Color(0.9, 0.97, 0.9)))

                    row_idx += 1

                    # Add checklist items
                    for item in indicator.checklist_items:
                        item_text = f"&nbsp;&nbsp;&nbsp;&nbsp;{item.label}"
                        table_data.append([Paragraph(item_text, cell_style), ""])

                        # Color for checklist item
                        if item.validation_result:
                            if item.validation_result == "met":
                                style_commands.append(('BACKGROUND', (1, row_idx), (1, row_idx), met_color))
                            elif item.validation_result == "considered":
                                style_commands.append(('BACKGROUND', (1, row_idx), (1, row_idx), considered_color))
                            elif item.validation_result == "unmet":
                                style_commands.append(('BACKGROUND', (1, row_idx), (1, row_idx), unmet_color))

                        row_idx += 1

                # Add overall result row
                table_data.append([Paragraph("<b>OVERALL RESULT</b>", cell_style), ""])
                style_commands.append(('BACKGROUND', (0, row_idx), (0, row_idx), header_color))
                if area.overall_result:
                    result_color = met_color if area.overall_result == "Passed" else unmet_color
                    style_commands.append(('BACKGROUND', (1, row_idx), (1, row_idx), result_color))

                # Create table with wider indicator column
                col_widths = [9.0*inch, 1.2*inch]
                table = Table(table_data, colWidths=col_widths)
                table.setStyle(TableStyle(style_commands))
                elements.append(table)
                elements.append(Spacer(1, 20))

            # Build PDF
            doc.build(elements)
            buffer.seek(0)

            return buffer

        except ImportError:
            self.logger.error("reportlab not installed. PDF export unavailable.")
            raise ImportError("PDF export requires reportlab. Install with: pip install reportlab")


# Singleton instance
gar_export_service = GARExportService()
