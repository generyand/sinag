#!/usr/bin/env python3
"""
Helper script to run Alembic migrations.
This ensures we're using the correct Python environment and database connection.
"""

import os
import sys

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    """Run alembic upgrade head"""
    from alembic.config import Config

    from alembic import command

    # Create Alembic config
    alembic_cfg = Config("alembic.ini")

    # Run upgrade
    print("Running database migrations...")
    print("=" * 70)
    command.upgrade(alembic_cfg, "head")
    print("=" * 70)
    print("✅ Migration complete!")


if __name__ == "__main__":
    main()
