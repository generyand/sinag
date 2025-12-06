import requests

# Call the actual API endpoint
response = requests.get(
    "http://localhost:3001/api/v1/assessments/my-assessment",
    headers={"Authorization": "Bearer YOUR_TOKEN_HERE"},
)

if response.status_code == 200:
    data = response.json()
    for area in data.get("governance_areas", []):
        if area["id"] == 1:
            for indicator in area["indicators"]:

                def check_movs(ind, indent=""):
                    movs = ind.get("movs", [])
                    print(f"{indent}{ind.get('code', ind.get('id'))} - {ind.get('name', '')[:40]}")
                    print(f"{indent}  movs: {len(movs)} items")
                    if movs:
                        mov_ids = [m.get("id") for m in movs]
                        print(f"{indent}  IDs: {mov_ids}")
                        if len(mov_ids) != len(set(mov_ids)):
                            print(f"{indent}  ⚠️  DUPLICATE IDs FOUND!")

                    for child in ind.get("children", []):
                        check_movs(child, indent + "  ")

                check_movs(indicator)
else:
    print(f"Error: {response.status_code}")
    print(
        "Note: You need a valid token. Check browser DevTools Network tab for the Authorization header"
    )
