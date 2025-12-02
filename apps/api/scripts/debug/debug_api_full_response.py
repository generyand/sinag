"""
Debug script to see what the actual API returns for assessment data
"""
import sys
sys.path.insert(0, '.')

from app.db.base import SessionLocal
from app.services.assessment_service import AssessmentService
import json

assessment_service = AssessmentService()

db = SessionLocal()

# Get the full assessment data as the API would return it
assessment_data = assessment_service.get_assessment_for_blgu_with_full_data(db, 1)

if assessment_data:
    print("Assessment Data Structure:")
    print(f"Assessment ID: {assessment_data['assessment']['id']}")
    print(f"Updated at: {assessment_data['assessment']['updated_at']}")
    print()
    
    for area in assessment_data['governance_areas']:
        print(f"Area {area['id']}: {area['name']}")
        
        def print_indicator(ind, level=0):
            indent = "  " * level
            print(f"{indent}Indicator {ind['id']}: {ind['name'][:50]}")
            
            response = ind.get('response')
            if response:
                print(f"{indent}  Response ID: {response.get('id')}")
                print(f"{indent}  is_completed: {response.get('is_completed')}")
                
            movs = ind.get('movs', [])
            print(f"{indent}  MOVs: {len(movs)} files")
            for i, mov in enumerate(movs, 1):
                print(f"{indent}    {i}. ID={mov.get('id')}, name={mov.get('filename')}")
            
            for child in ind.get('children', []):
                print_indicator(child, level + 1)
        
        for indicator in area['indicators']:
            print_indicator(indicator)
        print()

db.close()

