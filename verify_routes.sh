#!/bin/bash
echo "--- 1. Testing Health Check ---"
curl -v http://localhost:3001/health

echo "\n\n--- 2. Testing Dashboard Stats (Store 180) ---"
curl -v http://localhost:3001/api/v1/dashboard/180

echo "\n\n--- 3. Testing Ticket Upload (Mock File) ---"
# Create a dummy image file
echo "fake image content" > test_ticket.jpg
curl -v -F "file=@test_ticket.jpg" -F "store_id=180" -F "type=Ticket" http://localhost:3001/api/v1/upload

echo "\n\n--- 4. Testing OLO Upload (Mock CSV) ---"
# Create a dummy csv
echo "header,header\ndata,data" > test_olo.csv
curl -v -F "file=@test_olo.csv" -F "store_id=180" -F "type=OLO" http://localhost:3001/api/v1/upload
