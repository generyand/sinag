"""
Test script for BLGU Dashboard API endpoints

This script tests both dashboard endpoints:
1. GET /api/v1/blgu-dashboard/{assessment_id}
2. GET /api/v1/blgu-dashboard/{assessment_id}/indicators/navigation

Usage:
    uv run python test_blgu_dashboard.py
"""

import requests

# Configuration
BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"

# Test user credentials (replace with actual credentials)
BLGU_USER_EMAIL = "test1@example.com"
BLGU_USER_PASSWORD = "changethis"  # Replace with actual password
TEST_ASSESSMENT_ID = 68  # Replace with actual assessment ID


def login(email: str, password: str) -> str | None:
    """Login and return access token"""
    print(f"\n🔐 Logging in as {email}...")

    response = requests.post(f"{API_V1}/auth/login", json={"email": email, "password": password})

    if response.status_code == 200:
        token = response.json()["access_token"]
        print("✅ Login successful!")
        return token
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(f"Response: {response.text}")
        return None


def test_dashboard_endpoint(token: str, assessment_id: int):
    """Test the main dashboard endpoint"""
    print(f"\n📊 Testing Dashboard Endpoint (Assessment ID: {assessment_id})...")

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_V1}/blgu-dashboard/{assessment_id}", headers=headers)

    if response.status_code == 200:
        data = response.json()
        print("✅ Dashboard endpoint successful!")
        print("\n📈 Dashboard Data:")
        print(f"  Assessment ID: {data['assessment_id']}")
        print(f"  Total Indicators: {data['total_indicators']}")
        print(f"  Completed: {data['completed_indicators']}")
        print(f"  Incomplete: {data['incomplete_indicators']}")
        print(f"  Completion %: {data['completion_percentage']}%")
        print(f"  Governance Areas: {len(data['governance_areas'])}")

        if data.get("rework_comments"):
            print(f"  Rework Comments: {len(data['rework_comments'])}")
        else:
            print("  Rework Comments: None")

        return data
    else:
        print(f"❌ Dashboard endpoint failed: {response.status_code}")
        print(f"Response: {response.text}")
        return None


def test_navigation_endpoint(token: str, assessment_id: int):
    """Test the indicator navigation endpoint"""
    print(f"\n🧭 Testing Navigation Endpoint (Assessment ID: {assessment_id})...")

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{API_V1}/blgu-dashboard/{assessment_id}/indicators/navigation",
        headers=headers,
    )

    if response.status_code == 200:
        data = response.json()
        print("✅ Navigation endpoint successful!")
        print("\n🗺️  Navigation Data:")
        print(f"  Total Indicators: {len(data)}")

        # Group by completion status
        complete = [item for item in data if item["completion_status"] == "complete"]
        incomplete = [item for item in data if item["completion_status"] == "incomplete"]

        print(f"  Complete: {len(complete)}")
        print(f"  Incomplete: {len(incomplete)}")

        # Show first few items
        print("\n  Sample Items:")
        for item in data[:3]:
            status_emoji = "✓" if item["completion_status"] == "complete" else "○"
            print(f"    {status_emoji} {item['title']} ({item['governance_area_name']})")

        return data
    else:
        print(f"❌ Navigation endpoint failed: {response.status_code}")
        print(f"Response: {response.text}")
        return None


def main():
    """Run all tests"""
    print("=" * 60)
    print("BLGU Dashboard API Test Suite")
    print("=" * 60)

    # Step 1: Login
    token = login(BLGU_USER_EMAIL, BLGU_USER_PASSWORD)
    if not token:
        print("\n❌ Cannot proceed without authentication token")
        return

    # Step 2: Test dashboard endpoint
    dashboard_data = test_dashboard_endpoint(token, TEST_ASSESSMENT_ID)

    # Step 3: Test navigation endpoint
    navigation_data = test_navigation_endpoint(token, TEST_ASSESSMENT_ID)

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"✅ Dashboard Endpoint: {'PASS' if dashboard_data else 'FAIL'}")
    print(f"✅ Navigation Endpoint: {'PASS' if navigation_data else 'FAIL'}")
    print("\n✨ All tests completed!")


if __name__ == "__main__":
    main()
