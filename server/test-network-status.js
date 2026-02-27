const { SmartPrepController } = require('./build/controllers/SmartPrepController.js');

async function run() {
    const req = {
        user: {
            userId: '643fabeb-441e-45c8-80ba-b64b66699547',
            role: 'director',
            companyId: 'AGV-001'
        },
        query: {}
    };
    const res = {
        json: (data) => console.log("JSON:", data),
        status: (code) => ({
            json: (data) => console.log("STATUS", code, "JSON:", data)
        })
    };
    
    await SmartPrepController.getNetworkPrepStatus(req, res);
}
run();
