import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://hardrock.brasameat.com/api/v1/auth/login"
data = json.dumps({"email":"director@hardrock.brasameat.com","password":"HardRock@2026!Corp","portalSubdomain":"hardrock"}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')

try:
    res = urllib.request.urlopen(req, context=ctx)
    body = json.loads(res.read().decode('utf-8'))
    token = body['token']
    
    # Check Enterprise Metrics endpoint
    # The frontend called: /api/v1/dashboard/stats/network  Wait!
    # Or /api/v1/dashboard/enterprise/metrics
    
    metrics_url = "https://hardrock.brasameat.com/api/v1/dashboard/enterprise/dashboard" # Let me check the exact route path later
    req2 = urllib.request.Request(metrics_url, headers={'Authorization': f'Bearer {token}'})
    try:
        res2 = urllib.request.urlopen(req2, context=ctx)
        print("Success 200")
    except urllib.error.HTTPError as e2:
        print(f"Metrics 403 Failed: {e2} - {e2.read().decode('utf-8')}")

except Exception as e:
    print(f"Login error: {e}")
