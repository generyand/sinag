#!/usr/bin/env python3
"""
Test script to validate fail-fast startup checks.

This script can be used to test various failure scenarios:
1. Missing environment variables
2. Invalid environment variable formats
3. Database connection failures
4. Redis connection failures

Usage:
    python test_startup_checks.py [--scenario SCENARIO]

Scenarios:
    - success: All checks pass (default)
    - missing-db: DATABASE_URL is not set
    - missing-secret: SECRET_KEY is not set
    - invalid-db-url: DATABASE_URL has invalid format
    - redis-down: Redis is not running
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))


async def test_startup(scenario: str = "success"):
    """Test startup checks with different scenarios."""

    print(f"\n{'='*80}")
    print(f"Testing Startup Checks - Scenario: {scenario}")
    print(f"{'='*80}\n")

    # Store original environment variables
    original_env = os.environ.copy()

    try:
        # Modify environment based on scenario
        if scenario == "missing-db":
            print("🧪 Simulating missing DATABASE_URL...")
            os.environ["DATABASE_URL"] = ""

        elif scenario == "missing-secret":
            print("🧪 Simulating missing SECRET_KEY...")
            os.environ["SECRET_KEY"] = ""

        elif scenario == "invalid-db-url":
            print("🧪 Simulating invalid DATABASE_URL format...")
            os.environ["DATABASE_URL"] = "mysql://invalid-url"

        elif scenario == "redis-down":
            print("🧪 Simulating Redis connection failure...")
            os.environ["CELERY_BROKER_URL"] = "redis://localhost:9999/0"
            os.environ["ENVIRONMENT"] = "production"  # Make Redis failure critical

        # Import after environment setup
        from app.services.startup_service import startup_service

        # Run startup checks
        print("\n▶️  Running startup checks...\n")
        await startup_service.perform_startup_checks()

        print("\n" + "="*80)
        print("✅ SUCCESS: All startup checks passed!")
        print("="*80 + "\n")
        return True

    except Exception as e:
        print("\n" + "="*80)
        print(f"❌ FAILURE: Startup checks failed (as expected for failure scenarios)")
        print("="*80)
        print(f"\nError Type: {type(e).__name__}")
        print(f"Error Message:\n{str(e)}")
        print("\n" + "="*80 + "\n")
        return False

    finally:
        # Restore original environment
        os.environ.clear()
        os.environ.update(original_env)


def main():
    """Main test function."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Test SINAG API startup checks with different failure scenarios"
    )
    parser.add_argument(
        "--scenario",
        choices=["success", "missing-db", "missing-secret", "invalid-db-url", "redis-down"],
        default="success",
        help="Test scenario to run"
    )

    args = parser.parse_args()

    # Run the test
    result = asyncio.run(test_startup(args.scenario))

    # Exit with appropriate code
    if args.scenario == "success":
        sys.exit(0 if result else 1)
    else:
        # For failure scenarios, we expect the check to fail
        sys.exit(0 if not result else 1)


if __name__ == "__main__":
    main()
