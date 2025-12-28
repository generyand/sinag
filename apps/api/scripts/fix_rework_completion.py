"""
One-time script to fix is_completed for indicators that have MOVs uploaded.

This script recomputes completion status for all incomplete responses using the
completeness_validation_service - the same logic used by the actual application.
"""

from sqlalchemy.orm import joinedload

from app.db.base import SessionLocal
from app.db.models.assessment import AssessmentResponse, MOVFile
from app.services.completeness_validation_service import completeness_validation_service


def fix_completion():
    """Fix is_completed for all incomplete responses with uploaded MOVs."""
    db = SessionLocal()
    try:
        # Find all incomplete responses
        incomplete_responses = (
            db.query(AssessmentResponse)
            .options(
                joinedload(AssessmentResponse.indicator),
                joinedload(AssessmentResponse.assessment),
            )
            .filter(AssessmentResponse.is_completed == False)
            .all()
        )

        print(f"Found {len(incomplete_responses)} incomplete responses to check")

        fixed_count = 0
        for response in incomplete_responses:
            indicator = response.indicator
            if not indicator or not indicator.form_schema:
                continue

            form_schema = indicator.form_schema

            # Get MOV files for this response
            mov_files = (
                db.query(MOVFile)
                .filter(
                    MOVFile.assessment_id == response.assessment_id,
                    MOVFile.indicator_id == response.indicator_id,
                    MOVFile.deleted_at.is_(None),
                )
                .all()
            )

            if not mov_files:
                # No MOVs, skip
                continue

            # Run the completion validation (same logic as the app)
            try:
                result = completeness_validation_service.validate_completeness(
                    form_schema=form_schema,
                    response_data=response.response_data or {},
                    uploaded_movs=mov_files,
                )

                if result["is_complete"]:
                    print(
                        f"  Response {response.id} (assessment {response.assessment_id}, "
                        f"indicator {response.indicator_id}): "
                        f"{result['filled_field_count']}/{result['required_field_count']} complete - FIXING"
                    )
                    response.is_completed = True
                    fixed_count += 1

            except Exception as e:
                print(f"  Error validating response {response.id}: {e}")
                continue

        db.commit()
        print(f"\n✅ Fixed {fixed_count} responses")

    except Exception as e:
        print(f"Error: {e}")
        import traceback

        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    fix_completion()
