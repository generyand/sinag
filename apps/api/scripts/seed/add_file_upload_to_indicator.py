#!/usr/bin/env python3
"""
Script to add file_upload field to an existing indicator's form schema.

Usage:
    python add_file_upload_to_indicator.py <indicator_id>

Example:
    python add_file_upload_to_indicator.py 15
"""

import sys

from app.db.base import SessionLocal
from app.db.models.governance_area import Indicator


def add_file_upload_to_indicator(indicator_id: int):
    """Add a file_upload field to an indicator's form schema."""
    db = SessionLocal()

    try:
        # Get the indicator
        indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()

        if not indicator:
            print(f"❌ Indicator {indicator_id} not found")
            return

        print(f"📋 Indicator: {indicator.name}")
        print(f"   Governance Area ID: {indicator.governance_area_id}")

        # Check if form_schema exists
        if not indicator.form_schema:
            print("❌ This indicator has no form_schema")
            return

        # Get or create sections
        sections = indicator.form_schema.get("sections", [])

        if not sections:
            print("⚠️  No sections found. Creating a new section...")
            sections = [
                {
                    "section_id": "mov_section",
                    "title": "Means of Verification",
                    "description": "Upload supporting documents for this indicator",
                    "order": 1,
                    "fields": [],
                }
            ]

        # Add file_upload field to the first section
        target_section = sections[0]
        fields = target_section.get("fields", [])

        # Check if file_upload field already exists
        has_file_upload = any(f.get("field_type") == "file_upload" for f in fields)

        if has_file_upload:
            print("✅ This indicator already has a file_upload field")
            return

        # Find the next order number
        max_order = max([f.get("order", 0) for f in fields], default=0)

        # Add the file_upload field
        file_upload_field = {
            "field_id": "mov_files",
            "field_type": "file_upload",
            "label": "Upload Supporting Documents (MOV)",
            "help_text": "Upload Means of Verification documents (PDF, DOCX, XLSX, images, or video). Maximum file size: 50MB",
            "required": False,
            "order": max_order + 1,
            "allowed_file_types": [
                ".pdf",
                ".docx",
                ".xlsx",
                ".jpg",
                ".jpeg",
                ".png",
                ".mp4",
            ],
            "max_file_size_mb": 50,
        }

        fields.append(file_upload_field)
        target_section["fields"] = fields

        # Update the indicator
        indicator.form_schema = {"sections": sections}
        db.commit()

        print(f"✅ Successfully added file_upload field to indicator {indicator_id}")
        print(f"   Section: {target_section.get('title', 'Unnamed Section')}")
        print("   Field ID: mov_files")
        print(f"   Field Order: {max_order + 1}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db.rollback()
    finally:
        db.close()


def list_indicators_without_file_upload():
    """List all indicators that don't have file_upload fields."""
    db = SessionLocal()

    try:
        indicators = db.query(Indicator).all()

        print("📋 Indicators WITHOUT file_upload field:\n")

        count = 0
        for indicator in indicators:
            if not indicator.form_schema:
                continue

            sections = indicator.form_schema.get("sections", [])
            has_file_upload = False

            for section in sections:
                fields = section.get("fields", [])
                for field in fields:
                    if field.get("field_type") == "file_upload":
                        has_file_upload = True
                        break
                if has_file_upload:
                    break

            if not has_file_upload:
                count += 1
                print(f"  {indicator.id:3d}. {indicator.name}")

        print(f"\nTotal: {count} indicators without file_upload")

    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python add_file_upload_to_indicator.py <indicator_id>")
        print("  python add_file_upload_to_indicator.py list")
        print("\nExamples:")
        print("  python add_file_upload_to_indicator.py 15")
        print("  python add_file_upload_to_indicator.py list")
        sys.exit(1)

    if sys.argv[1] == "list":
        list_indicators_without_file_upload()
    else:
        try:
            indicator_id = int(sys.argv[1])
            add_file_upload_to_indicator(indicator_id)
        except ValueError:
            print("❌ Invalid indicator ID. Must be a number.")
            sys.exit(1)
