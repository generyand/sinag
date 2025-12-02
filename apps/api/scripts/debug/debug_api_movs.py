from app.db.base import SessionLocal
from app.services.assessment_service import assessment_service
import json

db = SessionLocal()

# Get assessment data as API would return
assessment_data = assessment_service.get_assessment_for_blgu_with_full_data(db, 1)

if assessment_data:
    for area in assessment_data.get('governance_areas', []):
        if area['id'] == 1:
            for indicator in area['indicators']:
                # Check both parent and children
                def check_movs(ind, indent=""):
                    movs_field = ind.get('movs', [])
                    print(f"{indent}{ind.get('code', ind.get('id'))} - {ind.get('name', 'unnamed')[:50]}")
                    print(f"{indent}  movs field: {len(movs_field)} items")
                    if movs_field:
                        for i, mov in enumerate(movs_field, 1):
                            print(f"{indent}    {i}. ID={mov.get('id')}, filename={mov.get('filename')}")
                    
                    # Check children
                    for child in ind.get('children', []):
                        check_movs(child, indent + "  ")
                
                check_movs(indicator)
                print()

db.close()

