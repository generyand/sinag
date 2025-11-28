"""
Cleanup Test Data Script
========================
This script removes test data created by seed scripts from the database
and Supabase Storage.

IMPORTANT: Run with --dry-run first to see what will be deleted!

Usage:
    python scripts/database/cleanup-test-data.py --dry-run    # Preview what will be deleted
    python scripts/database/cleanup-test-data.py              # Actually delete test data
    python scripts/database/cleanup-test-data.py --storage-only  # Only clean Supabase Storage

Test data patterns that will be cleaned:
- Users: tester@gmail.com, test.complete@blgu.local, validator.area*@dilg.gov.ph
- Assessments: Linked to test users
- Assessment Responses: Linked to test assessments
- MOV Files: Linked to test assessments (both DB records and Supabase Storage)
- MOV Annotations: Linked to test MOV files
- Feedback Comments: Linked to test assessment responses
"""

import sys
import os
from pathlib import Path
from datetime import datetime

# Add the apps/api directory to the Python path
api_dir = Path(__file__).resolve().parent.parent.parent / "apps" / "api"
sys.path.insert(0, str(api_dir))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables from apps/api/.env
dotenv_path = api_dir / ".env"
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv('DATABASE_URL')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not DATABASE_URL:
    raise Exception(f"DATABASE_URL not found in environment. Tried loading from: {dotenv_path}")

# Create database engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Test user email patterns to clean up
TEST_USER_PATTERNS = [
    "tester@gmail.com",
    "test.complete@blgu.local",
    "validator.area2@dilg.gov.ph",
    "validator.area3@dilg.gov.ph",
    "validator.area4@dilg.gov.ph",
    "validator.area5@dilg.gov.ph",
    "validator.area6@dilg.gov.ph",
]


def get_supabase_client():
    """Initialize Supabase client for storage operations."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("  Supabase credentials not found. Skipping storage cleanup.")
        return None

    try:
        from supabase import create_client
        return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    except Exception as e:
        print(f"  Failed to initialize Supabase client: {e}")
        return None


def cleanup_storage_files(supabase, assessment_ids: list, dry_run: bool = True):
    """
    Delete MOV files from Supabase Storage for given assessments.

    Storage path structure: {assessment_id}/{indicator_id}/{filename}
    """
    if not supabase:
        print("  Supabase client not available. Skipping storage cleanup.")
        return 0

    bucket_name = "mov-files"
    deleted_count = 0

    for assessment_id in assessment_ids:
        try:
            # List all files in the assessment folder
            folder_path = f"{assessment_id}/"
            files = supabase.storage.from_(bucket_name).list(folder_path)

            if not files:
                continue

            # Recursively list all files (including in subfolders)
            all_files = []

            # First level - indicator folders
            for item in files:
                if item.get('id'):  # It's a folder
                    subfolder = f"{assessment_id}/{item['name']}/"
                    subfiles = supabase.storage.from_(bucket_name).list(subfolder)
                    for subfile in subfiles or []:
                        if not subfile.get('id'):  # It's a file, not a folder
                            all_files.append(f"{assessment_id}/{item['name']}/{subfile['name']}")
                else:  # It's a file
                    all_files.append(f"{assessment_id}/{item['name']}")

            if all_files:
                print(f"    Assessment {assessment_id}: {len(all_files)} files found")

                if not dry_run:
                    # Delete files in batches
                    result = supabase.storage.from_(bucket_name).remove(all_files)
                    deleted_count += len(all_files)
                    print(f"      Deleted {len(all_files)} files")
                else:
                    for f in all_files[:5]:  # Show first 5 files
                        print(f"      - {f}")
                    if len(all_files) > 5:
                        print(f"      ... and {len(all_files) - 5} more files")
                    deleted_count += len(all_files)

        except Exception as e:
            print(f"    Error processing assessment {assessment_id}: {e}")

    return deleted_count


def cleanup_test_data(dry_run: bool = True, storage_only: bool = False):
    """
    Main cleanup function that removes test data from database and storage.

    Args:
        dry_run: If True, only show what would be deleted without actually deleting
        storage_only: If True, only clean Supabase Storage (skip database cleanup)
    """
    print("=" * 80)
    print("TEST DATA CLEANUP SCRIPT")
    print("=" * 80)
    print(f"Mode: {'DRY RUN (no changes will be made)' if dry_run else 'LIVE DELETE'}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()

    if dry_run:
        print("Run with no arguments to actually delete the data.")
        print()

    with engine.connect() as conn:
        trans = conn.begin()

        try:
            # Step 1: Find test users
            print("Step 1: Finding test users...")
            print("-" * 40)

            placeholders = ", ".join([f":email{i}" for i in range(len(TEST_USER_PATTERNS))])
            params = {f"email{i}": email for i, email in enumerate(TEST_USER_PATTERNS)}

            test_users = conn.execute(
                text(f"""
                    SELECT id, email, name, role, barangay_id, validator_area_id
                    FROM users
                    WHERE email IN ({placeholders})
                """),
                params
            ).fetchall()

            if not test_users:
                print("  No test users found.")
                print("\n Test data cleanup complete (nothing to clean).")
                return

            print(f"  Found {len(test_users)} test user(s):")
            for user in test_users:
                print(f"    - {user[1]} (ID: {user[0]}, Role: {user[3]})")

            test_user_ids = [user[0] for user in test_users]

            # Step 2: Find assessments linked to test users
            print("\nStep 2: Finding assessments linked to test users...")
            print("-" * 40)

            user_placeholders = ", ".join([f":uid{i}" for i in range(len(test_user_ids))])
            user_params = {f"uid{i}": uid for i, uid in enumerate(test_user_ids)}

            test_assessments = conn.execute(
                text(f"""
                    SELECT id, blgu_user_id, status, created_at
                    FROM assessments
                    WHERE blgu_user_id IN ({user_placeholders})
                """),
                user_params
            ).fetchall()

            if not test_assessments:
                print("  No test assessments found.")
            else:
                print(f"  Found {len(test_assessments)} test assessment(s):")
                for assessment in test_assessments:
                    print(f"    - Assessment ID: {assessment[0]}, User ID: {assessment[1]}, Status: {assessment[2]}")

            test_assessment_ids = [a[0] for a in test_assessments]

            # Step 3: Find MOV files linked to test assessments
            print("\nStep 3: Finding MOV files linked to test assessments...")
            print("-" * 40)

            mov_files_count = 0
            mov_file_ids = []

            if test_assessment_ids:
                assessment_placeholders = ", ".join([f":aid{i}" for i in range(len(test_assessment_ids))])
                assessment_params = {f"aid{i}": aid for i, aid in enumerate(test_assessment_ids)}

                mov_files = conn.execute(
                    text(f"""
                        SELECT id, assessment_id, indicator_id, file_name, file_size, file_url
                        FROM mov_files
                        WHERE assessment_id IN ({assessment_placeholders})
                    """),
                    assessment_params
                ).fetchall()

                mov_files_count = len(mov_files)
                mov_file_ids = [m[0] for m in mov_files]

                if mov_files:
                    total_size = sum(m[4] or 0 for m in mov_files)
                    print(f"  Found {mov_files_count} MOV file(s) ({total_size / 1024 / 1024:.2f} MB total):")
                    for mov in mov_files[:10]:  # Show first 10
                        print(f"    - {mov[3]} (Assessment: {mov[1]}, Indicator: {mov[2]})")
                    if mov_files_count > 10:
                        print(f"    ... and {mov_files_count - 10} more files")
                else:
                    print("  No MOV files found.")
            else:
                print("  No assessments to check for MOV files.")

            # Step 4: Find assessment responses
            print("\nStep 4: Finding assessment responses...")
            print("-" * 40)

            responses_count = 0
            response_ids = []

            if test_assessment_ids:
                responses = conn.execute(
                    text(f"""
                        SELECT id, assessment_id, indicator_id
                        FROM assessment_responses
                        WHERE assessment_id IN ({assessment_placeholders})
                    """),
                    assessment_params
                ).fetchall()

                responses_count = len(responses)
                response_ids = [r[0] for r in responses]
                print(f"  Found {responses_count} assessment response(s).")
            else:
                print("  No assessments to check for responses.")

            # Step 5: Find MOV annotations
            print("\nStep 5: Finding MOV annotations...")
            print("-" * 40)

            annotations_count = 0

            if mov_file_ids:
                mov_placeholders = ", ".join([f":mid{i}" for i in range(len(mov_file_ids))])
                mov_params = {f"mid{i}": mid for i, mid in enumerate(mov_file_ids)}

                annotations = conn.execute(
                    text(f"""
                        SELECT COUNT(*)
                        FROM mov_annotations
                        WHERE mov_file_id IN ({mov_placeholders})
                    """),
                    mov_params
                ).fetchone()

                annotations_count = annotations[0] if annotations else 0
                print(f"  Found {annotations_count} MOV annotation(s).")
            else:
                print("  No MOV files to check for annotations.")

            # Step 6: Find feedback comments
            print("\nStep 6: Finding feedback comments...")
            print("-" * 40)

            feedback_count = 0

            if response_ids:
                resp_placeholders = ", ".join([f":rid{i}" for i in range(len(response_ids))])
                resp_params = {f"rid{i}": rid for i, rid in enumerate(response_ids)}

                feedback = conn.execute(
                    text(f"""
                        SELECT COUNT(*)
                        FROM feedback_comments
                        WHERE response_id IN ({resp_placeholders})
                    """),
                    resp_params
                ).fetchone()

                feedback_count = feedback[0] if feedback else 0
                print(f"  Found {feedback_count} feedback comment(s).")
            else:
                print("  No responses to check for feedback.")

            # Summary
            print("\n" + "=" * 80)
            print("SUMMARY - DATA TO BE DELETED")
            print("=" * 80)
            print(f"  Test Users:           {len(test_users)}")
            print(f"  Assessments:          {len(test_assessments)}")
            print(f"  Assessment Responses: {responses_count}")
            print(f"  MOV Files (DB):       {mov_files_count}")
            print(f"  MOV Annotations:      {annotations_count}")
            print(f"  Feedback Comments:    {feedback_count}")
            print("=" * 80)

            if dry_run:
                print("\n DRY RUN - No changes made.")
                print("To actually delete, run: python scripts/database/cleanup-test-data.py")
                trans.rollback()
                return

            if storage_only:
                print("\n STORAGE ONLY MODE - Skipping database cleanup.")
            else:
                # Actually delete data (in correct order due to foreign keys)
                print("\nDeleting test data...")
                print("-" * 40)

                # Delete MOV annotations first
                if mov_file_ids:
                    conn.execute(
                        text(f"""
                            DELETE FROM mov_annotations
                            WHERE mov_file_id IN ({mov_placeholders})
                        """),
                        mov_params
                    )
                    print(f"  Deleted {annotations_count} MOV annotations")

                # Delete feedback comments
                if response_ids:
                    conn.execute(
                        text(f"""
                            DELETE FROM feedback_comments
                            WHERE response_id IN ({resp_placeholders})
                        """),
                        resp_params
                    )
                    print(f"  Deleted {feedback_count} feedback comments")

                # Delete MOV files (DB records)
                if test_assessment_ids:
                    conn.execute(
                        text(f"""
                            DELETE FROM mov_files
                            WHERE assessment_id IN ({assessment_placeholders})
                        """),
                        assessment_params
                    )
                    print(f"  Deleted {mov_files_count} MOV file records")

                # Delete assessment responses
                if test_assessment_ids:
                    conn.execute(
                        text(f"""
                            DELETE FROM assessment_responses
                            WHERE assessment_id IN ({assessment_placeholders})
                        """),
                        assessment_params
                    )
                    print(f"  Deleted {responses_count} assessment responses")

                # Delete assessments
                if test_assessment_ids:
                    conn.execute(
                        text(f"""
                            DELETE FROM assessments
                            WHERE id IN ({assessment_placeholders})
                        """),
                        assessment_params
                    )
                    print(f"  Deleted {len(test_assessments)} assessments")

                # Delete test users
                conn.execute(
                    text(f"""
                        DELETE FROM users
                        WHERE email IN ({placeholders})
                    """),
                    params
                )
                print(f"  Deleted {len(test_users)} test users")

            # Clean Supabase Storage
            print("\nStep 7: Cleaning Supabase Storage...")
            print("-" * 40)

            if test_assessment_ids:
                supabase = get_supabase_client()
                storage_deleted = cleanup_storage_files(supabase, test_assessment_ids, dry_run=False)
                print(f"  Deleted {storage_deleted} files from Supabase Storage")
            else:
                print("  No assessments to clean from storage.")

            # Commit transaction
            trans.commit()

            print("\n" + "=" * 80)
            print(" TEST DATA CLEANUP COMPLETE!")
            print("=" * 80)

        except Exception as e:
            trans.rollback()
            print(f"\n Error: {e}")
            import traceback
            traceback.print_exc()
            raise


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Clean up test data from database and Supabase Storage"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview what would be deleted without actually deleting"
    )
    parser.add_argument(
        "--storage-only",
        action="store_true",
        help="Only clean Supabase Storage (skip database cleanup)"
    )

    args = parser.parse_args()

    # Default to dry-run if no arguments provided
    dry_run = args.dry_run or (not args.storage_only and len(sys.argv) == 1)

    if not dry_run and not args.storage_only:
        print("\n WARNING: This will permanently delete test data!")
        confirm = input("Type 'yes' to confirm: ")
        if confirm.lower() != 'yes':
            print("Aborted.")
            return

    cleanup_test_data(dry_run=dry_run, storage_only=args.storage_only)


if __name__ == "__main__":
    main()
