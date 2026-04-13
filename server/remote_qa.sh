#!/bin/bash
BASE_URL="https://meat-intelligence-final.up.railway.app"
TOKEN="ALOHA_QA_TEST_TOKEN_2026"
PAYLOAD='{"store_id": "tx-db-001", "business_date": "2026-04-09", "netSales": 15432.22, "items": [{ "sku": "PICANHA", "qty": 12, "price": 45.90, "voided": false }]}'

echo "================================="
echo "FASE 2: VALID PAYLOAD"
curl -s -w "\nHTTP_STATUS: %{http_code} \nTIME: %{time_total}s\n" -X POST $BASE_URL/api/v1/integrations/aloha/closeout \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "$PAYLOAD"

echo -e "\n================================="
echo "FASE 3: DUPLICATE PAYLOAD"
curl -s -w "\nHTTP_STATUS: %{http_code} \nTIME: %{time_total}s\n" -X POST $BASE_URL/api/v1/integrations/aloha/closeout \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "$PAYLOAD"

echo -e "\n================================="
echo "FASE 4: INVALID PAYLOAD (Missing store_id)"
curl -s -w "\nHTTP_STATUS: %{http_code} \nTIME: %{time_total}s\n" -X POST $BASE_URL/api/v1/integrations/aloha/closeout \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"business_date": "2026-04-09"}'

echo -e "\n================================="
echo "FASE 5: INVALID AUTH"
curl -s -w "\nHTTP_STATUS: %{http_code} \nTIME: %{time_total}s\n" -X POST $BASE_URL/api/v1/integrations/aloha/closeout \
  -H "Authorization: Bearer BAD_TOKEN" -H "Content-Type: application/json" \
  -d "$PAYLOAD"

