"""Check if assessment exists and has the right structure"""

import requests

BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"

# Login
print("🔐 Logging in...")
response = requests.post(
    f"{API_V1}/auth/login",
    json={"email": "test1@example.com", "password": "changethis"},
)

if response.status_code != 200:
    print(f"❌ Login failed: {response.text}")
    exit(1)

token = response.json()["access_token"]
print("✅ Login successful")

# Get user info
print("\n👤 Getting user info...")
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(f"{API_V1}/users/me", headers=headers)
user = response.json()
print(f"User ID: {user['id']}")
print(f"User Name: {user['name']}")
print(f"User Role: {user['role']}")

# Get user's assessments
print("\n📋 Getting assessments...")
response = requests.get(f"{API_V1}/assessments/my-assessment", headers=headers)

if response.status_code != 200:
    print(f"❌ Failed to get assessments: {response.text}")
else:
    assessment = response.json()
    print(f"Assessment ID: {assessment.get('id', 'N/A')}")
    print(f"Assessment Year: {assessment.get('year', 'N/A')}")
    print(f"Assessment Status: {assessment.get('status', 'N/A')}")
    print(f"BLGU User ID: {assessment.get('blgu_user_id', 'N/A')}")

    print(f"\n✅ Use this assessment ID in test: {assessment.get('id')}")

# List all assessments for this user
print("\n📋 Listing all assessments...")
response = requests.get(f"{API_V1}/assessments/", headers=headers)
if response.status_code == 200:
    assessments = response.json()
    print(f"Total assessments: {len(assessments)}")
    for a in assessments[:5]:
        print(f"  - ID: {a['id']}, Year: {a['year']}, Status: {a['status']}")
