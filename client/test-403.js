const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

(async () => {
    // 1. Auth payload
    const payload = {
        email: "director@hardrock.brasameat.com",
        password: "HardRock@2026!Corp",
        portalSubdomain: "hardrock"
    };

    console.log("Logging in...");
    const res = await fetch("https://hardrock.brasameat.com/api/v1/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        console.error("Login failed:", await res.text());
        return;
    }

    const data = await res.json();
    const token = data.token;
    console.log("Token acquired.");
    
    // Decode token
    const decoded = jwt.decode(token);
    console.log("Decoded Token:", decoded);

    // 2. Fetch enterprise metrics
    console.log("Fetching Enterprise Metrics...");
    const metricsRes = await fetch("https://hardrock.brasameat.com/api/v1/dashboard/enterprise/metrics", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    console.log("Metrics Status:", metricsRes.status);
    console.log("Metrics Response:", await metricsRes.text());
})();
