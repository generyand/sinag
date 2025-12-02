"""Quick test with correct assessment ID"""
import requests
import json

BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"

# Login
response = requests.post(
    f"{API_V1}/auth/login",
    json={"email": "test1@example.com", "password": "changethis"}
)
token = response.json()["access_token"]
print("✅ Login successful\n")

# Test dashboard with assessment ID 68
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(f"{API_V1}/blgu-dashboard/68", headers=headers)

print(f"📊 Dashboard Endpoint (Assessment ID: 68)")
print(f"Status: {response.status_code}\n")

if response.status_code == 200:
    data = response.json()
    print("✅ SUCCESS!\n")
    print(f"📈 Dashboard Data:")
    print(f"  Assessment ID: {data['assessment_id']}")
    print(f"  Total Indicators: {data['total_indicators']}")
    print(f"  Completed: {data['completed_indicators']}")
    print(f"  Incomplete: {data['incomplete_indicators']}")
    print(f"  Completion %: {data['completion_percentage']}%")
    print(f"  Governance Areas: {len(data['governance_areas'])}")
    if data.get('rework_comments'):
        print(f"  Rework Comments: {len(data['rework_comments'])}")
else:
    print(f"❌ FAILED")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
