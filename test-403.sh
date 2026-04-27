TOKEN=$(curl -s "https://hardrock.brasameat.com/api/v1/users/login" -H "Content-Type: application/json" -d '{"email":"director@hardrock.brasameat.com","password":"HardRock@2026!Corp","portalSubdomain":"hardrock"}' | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
echo "Token: $TOKEN"
curl -s -i "https://hardrock.brasameat.com/api/v1/dashboard/enterprise/metrics?store_id=1202" -H "Authorization: Bearer $TOKEN"
