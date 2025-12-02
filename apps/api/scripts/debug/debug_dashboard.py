"""Quick debug script to see the full error"""
import requests
import json

BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"

# Login
print("Logging in...")
response = requests.post(
    f"{API_V1}/auth/login",
    json={"email": "test1@example.com", "password": "changethis"}
)
token = response.json()["access_token"]
print(f"✅ Got token: {token[:20]}...")

# Test dashboard endpoint with full error details
print("\nTesting dashboard endpoint...")
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(
    f"{API_V1}/blgu-dashboard/20",
    headers=headers
)

print(f"Status Code: {response.status_code}")
print(f"Response Headers: {dict(response.headers)}")
print(f"\nFull Response Body:")
try:
    print(json.dumps(response.json(), indent=2))
except:
    print(response.text)
