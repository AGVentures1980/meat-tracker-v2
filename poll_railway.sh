#!/bin/bash
echo "Polling Railway until deploy is complete..."
while true; do
  STATUS=$(curl -s -X POST -o /dev/null -w "%{http_code}" https://meat-intelligence-final.up.railway.app/api/v1/integrations/aloha/closeout)
  if [ "$STATUS" = "401" ]; then
    echo "Deploy complete! Endpoint active."
    break
  fi
  echo -n "."
  sleep 5
done
