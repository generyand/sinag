# GAR Export Service
# Generates Excel and PDF exports for GAR reports

import io
import logging
from typing import Optional

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from app.schemas.gar import GARResponse, GARGovernanceArea, GARIndicator, GARChecklistItem
from app.schemas.bbi import AssessmentBBIComplianceResponse


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
            # BBI compliance colors (DILG MC 2024-417)
            "bbi_highly_functional": "90EE90",  # Light green (75%+)
            "bbi_moderately_functional": "FFD700",  # Gold/amber (50-74%)
            "bbi_low_functional": "FF6B6B",  # Light red (<50%)
            "bbi_header_bg": "B0C4DE",  # Light steel blue
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

        # Add BBI compliance section (DILG MC 2024-417)
        if gar_data.bbi_compliance and gar_data.bbi_compliance.bbi_results:
            current_row = self._add_bbi_compliance_table(ws, gar_data.bbi_compliance, current_row)

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

    def _add_bbi_compliance_table(
        self, ws, bbi_data: AssessmentBBIComplianceResponse, start_row: int
    ) -> int:
        """Add BBI compliance table per DILG MC 2024-417."""
        row = start_row + 2  # Add spacing

        # Section title
        ws.merge_cells(f"A{row}:B{row}")
        cell = ws[f"A{row}"]
        cell.value = "BBI FUNCTIONALITY COMPLIANCE (DILG MC 2024-417)"
        cell.font = Font(bold=True, size=11)
        cell.fill = PatternFill(
            start_color=self.colors["bbi_header_bg"],
            end_color=self.colors["bbi_header_bg"],
            fill_type="solid",
        )
        cell.border = self.thin_border
        ws[f"B{row}"].border = self.thin_border
        row += 1

        # Column headers
        ws[f"A{row}"].value = "BBI"
        ws[f"A{row}"].font = Font(bold=True)
        ws[f"A{row}"].border = self.thin_border
        ws[f"A{row}"].alignment = Alignment(horizontal="center")

        ws[f"B{row}"].value = "COMPLIANCE"
        ws[f"B{row}"].font = Font(bold=True)
        ws[f"B{row}"].border = self.thin_border
        ws[f"B{row}"].alignment = Alignment(horizontal="center")
        row += 1

        # BBI results
        for bbi in bbi_data.bbi_results:
            # BBI name
            ws[f"A{row}"].value = f"{bbi.bbi_abbreviation} - {bbi.bbi_name}"
            ws[f"A{row}"].border = self.thin_border
            ws[f"A{row}"].alignment = Alignment(wrap_text=True, vertical="center")

            # Compliance percentage and rating
            ws[f"B{row}"].value = f"{round(bbi.compliance_percentage)}%"
            ws[f"B{row}"].border = self.thin_border
            ws[f"B{row}"].alignment = Alignment(horizontal="center", vertical="center")

            # Color based on rating
            rating_color = self._get_bbi_rating_color(bbi.compliance_rating)
            if rating_color:
                ws[f"B{row}"].fill = PatternFill(
                    start_color=rating_color, end_color=rating_color, fill_type="solid"
                )
            row += 1

        # Average compliance row
        ws[f"A{row}"].value = "AVERAGE COMPLIANCE"
        ws[f"A{row}"].font = Font(bold=True)
        ws[f"A{row}"].border = self.thin_border
        ws[f"A{row}"].fill = PatternFill(
            start_color=self.colors["bbi_header_bg"],
            end_color=self.colors["bbi_header_bg"],
            fill_type="solid",
        )

        avg_pct = bbi_data.summary.average_compliance_percentage
        ws[f"B{row}"].value = f"{round(avg_pct)}%"
        ws[f"B{row}"].font = Font(bold=True)
        ws[f"B{row}"].border = self.thin_border
        ws[f"B{row}"].alignment = Alignment(horizontal="center")

        # Color for average
        avg_rating = self._determine_rating_from_percentage(avg_pct)
        avg_color = self._get_bbi_rating_color(avg_rating)
        if avg_color:
            ws[f"B{row}"].fill = PatternFill(
                start_color=avg_color, end_color=avg_color, fill_type="solid"
            )
        row += 1

        # Summary counts row
        row += 1
        ws[f"A{row}"].value = (
            f"Summary: {bbi_data.summary.highly_functional_count} Highly Functional, "
            f"{bbi_data.summary.moderately_functional_count} Moderately Functional, "
            f"{bbi_data.summary.low_functional_count} Low Functional"
        )
        ws[f"A{row}"].font = Font(italic=True, size=9)
        ws.merge_cells(f"A{row}:B{row}")
        row += 1

        # Rating legend
        ws[f"A{row}"].value = "Rating: 75%+ = Highly Functional, 50-74% = Moderately Functional, <50% = Low Functional"
        ws[f"A{row}"].font = Font(italic=True, size=9)
        ws.merge_cells(f"A{row}:B{row}")

        return row + 1

    def _get_bbi_rating_color(self, rating: str) -> Optional[str]:
        """Get color for BBI compliance rating."""
        rating_upper = rating.upper() if rating else ""
        if "HIGHLY" in rating_upper:
            return self.colors["bbi_highly_functional"]
        elif "MODERATELY" in rating_upper:
            return self.colors["bbi_moderately_functional"]
        elif "LOW" in rating_upper:
            return self.colors["bbi_low_functional"]
        return None

    def _determine_rating_from_percentage(self, percentage: float) -> str:
        """Determine rating tier from percentage."""
        if percentage >= 75:
            return "HIGHLY_FUNCTIONAL"
        elif percentage >= 50:
            return "MODERATELY_FUNCTIONAL"
        return "LOW_FUNCTIONAL"

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

            # Add summary table if multiple areas (All Areas view)
            if len(gar_data.governance_areas) > 1:
                elements.append(Spacer(1, 20))

                # Build summary table
                summary_data = []
                summary_style_commands = [
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ]

                # Core Governance Areas header
                summary_data.append([
                    Paragraph("<b>Core Governance Area</b>", cell_style),
                    Paragraph("<b>Result</b>", cell_style)
                ])
                summary_style_commands.append(('BACKGROUND', (0, 0), (1, 0), colors.lightgrey))

                row_idx = 1
                # Core areas
                for item in gar_data.summary:
                    if item.area_type == "Core":
                        summary_data.append([Paragraph(item.area_name, cell_style), ""])
                        if item.result:
                            result_color = met_color if item.result == "Passed" else unmet_color
                            summary_style_commands.append(('BACKGROUND', (1, row_idx), (1, row_idx), result_color))
                        row_idx += 1

                # Essential Governance Areas header
                summary_data.append([
                    Paragraph("<b>Essential Governance Area</b>", cell_style),
                    Paragraph("<b>Result</b>", cell_style)
                ])
                summary_style_commands.append(('BACKGROUND', (0, row_idx), (1, row_idx), colors.lightgrey))
                row_idx += 1

                # Essential areas
                for item in gar_data.summary:
                    if item.area_type == "Essential":
                        summary_data.append([Paragraph(item.area_name, cell_style), ""])
                        if item.result:
                            result_color = met_color if item.result == "Passed" else unmet_color
                            summary_style_commands.append(('BACKGROUND', (1, row_idx), (1, row_idx), result_color))
                        row_idx += 1

                # Create summary table
                summary_col_widths = [6.0*inch, 1.5*inch]
                summary_table = Table(summary_data, colWidths=summary_col_widths)
                summary_table.setStyle(TableStyle(summary_style_commands))
                elements.append(summary_table)

            # Add BBI compliance section (DILG MC 2024-417)
            if gar_data.bbi_compliance and gar_data.bbi_compliance.bbi_results:
                elements.append(Spacer(1, 30))

                # BBI compliance colors for PDF
                bbi_highly_color = colors.Color(0.56, 0.93, 0.56)  # Light green
                bbi_mod_color = colors.Color(1, 0.84, 0)  # Gold/amber
                bbi_low_color = colors.Color(1, 0.42, 0.42)  # Light red
                bbi_header_color = colors.Color(0.69, 0.77, 0.87)  # Light steel blue

                # Build BBI table
                bbi_table_data = []
                bbi_style_commands = [
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ]

                # Section header
                bbi_table_data.append([
                    Paragraph("<b>BBI FUNCTIONALITY COMPLIANCE (DILG MC 2024-417)</b>", cell_style),
                    ""
                ])
                bbi_style_commands.append(('SPAN', (0, 0), (1, 0)))
                bbi_style_commands.append(('BACKGROUND', (0, 0), (1, 0), bbi_header_color))
                bbi_style_commands.append(('ALIGN', (0, 0), (1, 0), 'CENTER'))

                # Column headers
                bbi_table_data.append([
                    Paragraph("<b>BBI</b>", cell_style),
                    Paragraph("<b>COMPLIANCE</b>", cell_style)
                ])
                bbi_style_commands.append(('BACKGROUND', (0, 1), (1, 1), colors.lightgrey))
                bbi_style_commands.append(('ALIGN', (0, 1), (1, 1), 'CENTER'))

                row_idx = 2
                # BBI results
                for bbi in gar_data.bbi_compliance.bbi_results:
                    bbi_table_data.append([
                        Paragraph(f"{bbi.bbi_abbreviation} - {bbi.bbi_name}", cell_style),
                        f"{round(bbi.compliance_percentage)}%"
                    ])
                    bbi_style_commands.append(('ALIGN', (1, row_idx), (1, row_idx), 'CENTER'))

                    # Color based on rating
                    rating = bbi.compliance_rating.upper() if bbi.compliance_rating else ""
                    if "HIGHLY" in rating:
                        bbi_style_commands.append(('BACKGROUND', (1, row_idx), (1, row_idx), bbi_highly_color))
                    elif "MODERATELY" in rating:
                        bbi_style_commands.append(('BACKGROUND', (1, row_idx), (1, row_idx), bbi_mod_color))
                    elif "LOW" in rating:
                        bbi_style_commands.append(('BACKGROUND', (1, row_idx), (1, row_idx), bbi_low_color))
                    row_idx += 1

                # Average compliance row
                avg_pct = gar_data.bbi_compliance.summary.average_compliance_percentage
                bbi_table_data.append([
                    Paragraph("<b>AVERAGE COMPLIANCE</b>", cell_style),
                    f"{round(avg_pct)}%"
                ])
                bbi_style_commands.append(('BACKGROUND', (0, row_idx), (0, row_idx), bbi_header_color))
                bbi_style_commands.append(('ALIGN', (1, row_idx), (1, row_idx), 'CENTER'))

                # Color for average
                if avg_pct >= 75:
                    bbi_style_commands.append(('BACKGROUND', (1, row_idx), (1, row_idx), bbi_highly_color))
                elif avg_pct >= 50:
                    bbi_style_commands.append(('BACKGROUND', (1, row_idx), (1, row_idx), bbi_mod_color))
                else:
                    bbi_style_commands.append(('BACKGROUND', (1, row_idx), (1, row_idx), bbi_low_color))

                # Create BBI table
                bbi_col_widths = [6.0*inch, 1.5*inch]
                bbi_table = Table(bbi_table_data, colWidths=bbi_col_widths)
                bbi_table.setStyle(TableStyle(bbi_style_commands))
                elements.append(bbi_table)

                # Summary and legend
                summary_text = (
                    f"Summary: {gar_data.bbi_compliance.summary.highly_functional_count} Highly Functional, "
                    f"{gar_data.bbi_compliance.summary.moderately_functional_count} Moderately Functional, "
                    f"{gar_data.bbi_compliance.summary.low_functional_count} Low Functional"
                )
                legend_style = ParagraphStyle(
                    'BBILegend',
                    parent=styles['Normal'],
                    fontSize=8,
                    fontStyle='italic',
                    spaceAfter=4,
                )
                elements.append(Spacer(1, 8))
                elements.append(Paragraph(summary_text, legend_style))
                elements.append(Paragraph(
                    "Rating: 75%+ = Highly Functional, 50-74% = Moderately Functional, &lt;50% = Low Functional",
                    legend_style
                ))

            # Build PDF
            doc.build(elements)
            buffer.seek(0)

            return buffer

        except ImportError:
            self.logger.error("reportlab not installed. PDF export unavailable.")
            raise ImportError("PDF export requires reportlab. Install with: pip install reportlab")


# Singleton instance
gar_export_service = GARExportService()
