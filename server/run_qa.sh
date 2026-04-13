#!/bin/bash
# 1. Valid Payload
echo "=== TEST 1: VALID PAYLOAD ==="
curl -s -w "\nHTTP: %{http_code}\n\n" -X POST http://localhost:3002/api/v1/integrations/aloha/closeout \
  -H "Authorization: Bearer ALOHA_QA_TEST_TOKEN_2026" -H "Content-Type: application/json" \
  -d '{"store_id":"tx-db-001","business_date":"2026-04-09","net_sales":20500.50,"items":[{"name":"Piranha","qty":2,"price":100}]}'

# 2. Duplicate Payload (Idempotency)
echo "=== TEST 2: DUPLICATE (IDEMPOTENCY) ==="
curl -s -w "\nHTTP: %{http_code}\n\n" -X POST http://localhost:3002/api/v1/integrations/aloha/closeout \
  -H "Authorization: Bearer ALOHA_QA_TEST_TOKEN_2026" -H "Content-Type: application/json" \
  -d '{"store_id":"tx-db-001","business_date":"2026-04-09","net_sales":20500.50,"items":[{"name":"Piranha","qty":2,"price":100}]}'

# 3. Invalid Payload (Missing store_id)
echo "=== TEST 3: INVALID PAYLOAD ==="
curl -s -w "\nHTTP: %{http_code}\n\n" -X POST http://localhost:3002/api/v1/integrations/aloha/closeout \
  -H "Authorization: Bearer ALOHA_QA_TEST_TOKEN_2026" -H "Content-Type: application/json" \
  -d '{"business_date":"2026-04-09"}'

# 4. Invalid Auth
echo "=== TEST 4: INVALID AUTH ==="
curl -s -w "\nHTTP: %{http_code}\n\n" -X POST http://localhost:3002/api/v1/integrations/aloha/closeout \
  -H "Authorization: Bearer BAD_TOKEN" -H "Content-Type: application/json" \
  -d '{"store_id":"tx-db-001","business_date":"2026-04-09"}'

