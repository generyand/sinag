"""
Create a test indicator with proper file_upload field for testing Epic 4.0
"""

from app.db.base import SessionLocal
from app.db.models import GovernanceArea, Indicator


def create_test_indicator():
    db = SessionLocal()

    try:
        # Get a governance area (use the first one)
        governance_area = db.query(GovernanceArea).first()

        if not governance_area:
            print("❌ No governance area found. Please create one first.")
            return

        # Create test indicator with file upload field
        indicator = Indicator(
            name="MOV Upload Test Indicator",
            description="Test indicator for Epic 4.0 MOV upload system with drag-and-drop interface",
            governance_area_id=governance_area.id,
            form_schema={
                "sections": [
                    {
                        "section_id": "test_section",
                        "title": "MOV Upload Test Section",
                        "description": "This section contains a file upload field to test the new MOV upload system",
                        "order": 1,
                        "fields": [
                            {
                                "field_id": "test_text_field",
                                "field_type": "text_input",
                                "label": "Test Text Field",
                                "help_text": "This is a regular text field for context",
                                "required": False,
                                "order": 1,
                            },
                            {
                                "field_id": "test_mov_upload",
                                "field_type": "file_upload",
                                "label": "Upload Files for BESWMC Documents",
                                "help_text": "Upload supporting documents (PDF, DOCX, XLSX, images, or video). Maximum file size: 50MB",
                                "required": False,
                                "order": 2,
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
                            },
                            {
                                "field_id": "test_radio_field",
                                "field_type": "radio_button",
                                "label": "Do you have the documents?",
                                "help_text": "Select Yes if you uploaded documents",
                                "required": False,
                                "order": 3,
                                "options": [
                                    {"value": "yes", "label": "Yes"},
                                    {"value": "no", "label": "No"},
                                    {"value": "na", "label": "N/A"},
                                ],
                            },
                        ],
                    }
                ]
            },
        )

        db.add(indicator)
        db.commit()
        db.refresh(indicator)

        print("✅ Test indicator created successfully!")
        print(f"📋 Indicator ID: {indicator.id}")
        print(f"📁 Indicator Name: {indicator.name}")
        print(f"🏛️ Governance Area: {governance_area.name} (ID: {governance_area.id})")
        print(
            f"\n🔗 Test URL: http://localhost:3000/blgu/assessment/{{assessment_id}}/indicator/{indicator.id}"
        )
        print("\n💡 Replace {assessment_id} with your actual assessment ID")

    except Exception as e:
        db.rollback()
        print(f"❌ Error creating indicator: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_test_indicator()
