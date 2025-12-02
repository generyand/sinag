"""Test dashboard directly without listing assessments"""
import requests
import json

BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"

# Login
print("🔐 Logging in...")
response = requests.post(
    f"{API_V1}/auth/login",
    json={"email": "test1@example.com", "password": "changethis"}
)
token = response.json()["access_token"]
print("✅ Login successful")

# Try different assessment IDs
headers = {"Authorization": f"Bearer {token}"}

for assessment_id in [1, 2, 3, 5, 10, 15, 20]:
    print(f"\n📊 Trying Assessment ID: {assessment_id}")
    response = requests.get(
        f"{API_V1}/blgu-dashboard/{assessment_id}",
        headers=headers
    )

    print(f"  Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"  ✅ SUCCESS!")
        print(f"  Total Indicators: {data['total_indicators']}")
        print(f"  Completed: {data['completed_indicators']}")
        print(f"  Completion %: {data['completion_percentage']}%")
        print(f"\n  👉 Use this assessment ID: {assessment_id}")
        break
    elif response.status_code == 404:
        print(f"  ❌ Not found")
    elif response.status_code == 403:
        print(f"  ❌ Forbidden (belongs to another user)")
    elif response.status_code == 500:
        try:
            error = response.json()
            print(f"  ❌ Server error: {error.get('detail', 'Unknown error')[:100]}...")
        except:
            print(f"  ❌ Server error: {response.text[:100]}")
