#!/bin/bash
# Local testing script to gather exact metrics
URL="http://localhost:3002/api/v1/integrations/aloha/closeout"
TOKEN="ALOHA_QA_TEST_TOKEN_2026"

echo "=== FASE 1: LOAD TEST ==="
echo "1. 10 Requests Válidos"
for i in {1..10}; do
  PAYLOAD="{\"store_id\": \"tx-db-001\", \"business_date\": \"2026-04-09\", \"net_sales\": 15432.22$i, \"items\": [{ \"sku\": \"PICANHA\", \"qty\": $i, \"price\": 45.90 }]}"
  curl -s -w "%{http_code} %{time_total}s\n" -X POST $URL -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD"
done

echo "2. 10 Requests Duplicados"
PAYLOAD="{\"store_id\": \"tx-db-001\", \"business_date\": \"2026-04-09\", \"net_sales\": 99999.00, \"items\": [{ \"sku\": \"TEST\", \"qty\": 1, \"price\": 1 }]}"
# First one to establish idempotency
curl -s -o /dev/null -X POST $URL -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD"
for i in {1..10}; do
  curl -s -w "%{http_code} %{time_total}s\n" -X POST $URL -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD"
done

echo "3. 5 Requests Inválidos (sem store_id)"
for i in {1..5}; do
  PAYLOAD="{\"business_date\": \"2026-04-09\", \"net_sales\": 15432.22, \"items\": []}"
  curl -s -w "%{http_code} %{time_total}s\n" -X POST $URL -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD"
done

echo "4. 5 Requests com Auth Inválida"
for i in {1..5}; do
  PAYLOAD="{\"store_id\": \"tx-db-001\", \"business_date\": \"2026-04-09\", \"net_sales\": 15432.22$i, \"items\": []}"
  curl -s -w "%{http_code} %{time_total}s\n" -X POST $URL -H "Authorization: Bearer BAD_TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD"
done
