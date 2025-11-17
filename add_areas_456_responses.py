"""
Add assessment responses for indicators in Areas 4-6
so validators for those areas can test the workflow
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), 'apps', 'api', '.env')
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise Exception(f"DATABASE_URL not found in environment. Tried loading from: {dotenv_path}")
engine = create_engine(DATABASE_URL)

def main():
    with engine.connect() as conn:
        trans = conn.begin()

        try:
            assessment_id = 146

            print(f"Adding indicators from Areas 4-6 to assessment {assessment_id}...")
            print("="*70)

            # Get indicators from areas 4-6
            indicators = conn.execute(text("""
                SELECT i.id, i.indicator_code, i.name, ga.id as area_id, ga.name as area_name
                FROM indicators i
                JOIN governance_areas ga ON i.governance_area_id = ga.id
                WHERE i.parent_id IS NOT NULL
                AND ga.id IN (4, 5, 6)
                ORDER BY ga.id, i.indicator_code
                LIMIT 20
            """)).fetchall()

            print(f"\nFound {len(indicators)} indicators to add:\n")

            area_counts = {}
            for ind in indicators:
                area_id = ind[3]
                area_counts[area_id] = area_counts.get(area_id, 0) + 1

            for area_id, count in sorted(area_counts.items()):
                area_name = next(i[4] for i in indicators if i[3] == area_id)
                print(f"  Area {area_id}: {area_name:40} - {count} indicators")

            # Add responses
            print(f"\nAdding {len(indicators)} assessment responses...")

            added_count = 0
            for ind in indicators:
                # Check if response already exists
                existing = conn.execute(
                    text("""
                        SELECT id FROM assessment_responses
                        WHERE assessment_id = :assessment_id
                        AND indicator_id = :indicator_id
                    """),
                    {"assessment_id": assessment_id, "indicator_id": ind[0]}
                ).fetchone()

                if existing:
                    print(f"  ⏭️  Skipping {ind[1]} - already exists")
                    continue

                conn.execute(
                    text("""
                        INSERT INTO assessment_responses (
                            assessment_id, indicator_id,
                            validation_status, assessor_remarks,
                            response_data,
                            is_completed, requires_rework,
                            created_at, updated_at
                        )
                        VALUES (
                            :assessment_id, :indicator_id,
                            :validation_status, :assessor_remarks,
                            :response_data,
                            :is_completed, :requires_rework,
                            NOW(), NOW()
                        )
                    """),
                    {
                        "assessment_id": assessment_id,
                        "indicator_id": ind[0],
                        "validation_status": "PASS",
                        "assessor_remarks": f"Assessor has validated {ind[1]} - {ind[2]}. All requirements met.",
                        "response_data": '{"test": true}',
                        "is_completed": True,
                        "requires_rework": False
                    }
                )
                added_count += 1
                print(f"  ✅ Added {ind[1]} - {ind[2][:50]}")

            trans.commit()

            print(f"\n✅ Successfully added {added_count} responses!")
            print("="*70)

            # Show final distribution
            final_dist = conn.execute(text("""
                SELECT ga.id, ga.name, COUNT(ar.id) as response_count
                FROM assessment_responses ar
                JOIN indicators i ON ar.indicator_id = i.id
                JOIN governance_areas ga ON i.governance_area_id = ga.id
                WHERE ar.assessment_id = :assessment_id
                GROUP BY ga.id, ga.name
                ORDER BY ga.id
            """), {"assessment_id": assessment_id}).fetchall()

            print("\n📊 FINAL ASSESSMENT COVERAGE:")
            print("="*70)
            total = 0
            for r in final_dist:
                print(f"Area {r[0]}: {r[1]:40} - {r[2]:2} indicators")
                total += r[2]
            print("="*70)
            print(f"TOTAL: {total} indicators")
            print("="*70)

            print("\n✅ All validators (Areas 1-6) can now test the workflow!")

        except Exception as e:
            trans.rollback()
            print(f"\n❌ Error: {e}")
            raise

if __name__ == "__main__":
    main()
