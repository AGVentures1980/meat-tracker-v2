
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3002/api/v1/dashboard';
// Admin credentials from previous turns
const EMAIL = 'alexandre@alexgarciaventures.co';
const PASSWORD = 'Admin123!';

async function run() {
    console.log('--- STARTING TRAINING FLOW VALIDATION ---');

    // 1. Login
    console.log('1. Logging in...');
    const loginRes = await fetch('http://localhost:3002/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) {
        console.error('Login failed:', loginData);
        process.exit(1);
    }
    const token = loginData.token;
    console.log('   Logged in. Token acquired.');

    // 0. Reset Progress (Clean Slate)
    console.log('0. Resetting Progress...');
    const resetRes = await fetch(`${API_URL}/training/reset`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({}) // Default self reset
    });
    const resetData = await resetRes.json();
    console.log('   Reset Result:', resetData);

    // 2. Check Initial Status
    console.log('2. Checking Training Status (Initial)...');
    const statusRes = await fetch(`${API_URL}/training/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const statusData = await statusRes.json();
    console.log('   Initial Status:', {
        modules: statusData.completedModules,
        attempts: statusData.examAttempts,
        certified: statusData.isCertified
    });

    // 3. Complete Modules 1-5
    console.log('3. Completing Modules 1-5...');
    for (let i = 1; i <= 5; i++) {
        await fetch(`${API_URL}/training/progress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ moduleId: String(i), score: 3 }) // 3/3 on quiz
        });
    }

    const preExamStatus = await (await fetch(`${API_URL}/training/status`, { headers: { 'Authorization': `Bearer ${token}` } })).json();
    console.log('   Modules completed:', preExamStatus.completedModules);
    if (preExamStatus.completedModules < 5) {
        console.error('   FAILED: Modules not saved.');
    } else {
        console.log('   PASSED: All modules done.');
    }

    // 4. Fail Exam (Score 50%)
    console.log('4. Attempting Exam (Fail - 50%)...');
    const failRes = await fetch(`${API_URL}/training/exam-attempt`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ score: 50 })
    });
    const failData = await failRes.json();
    console.log('   Fail Attempt Result:', failData);
    if (failData.passed === false && failData.attempts >= 1) {
        console.log('   PASSED: Exam failed correctly.');
    } else {
        console.error('   FAILED: Exam logic wrong.');
    }

    // 5. Pass Exam (Score 90%)
    console.log('5. Attempting Exam (Pass - 90%)...');
    const passRes = await fetch(`${API_URL}/training/exam-attempt`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ score: 90 })
    });
    const passData = await passRes.json();
    console.log('   Pass Attempt Result:', passData);
    if (passData.passed === true) {
        console.log('   PASSED: Certified.');
    } else {
        console.error('   FAILED: Certification logic wrong.');
    }

    // 6. Check Final Status
    const finalRes = await fetch(`${API_URL}/training/status`, { headers: { 'Authorization': `Bearer ${token}` } });
    const finalData = await finalRes.json();
    console.log('   Final Status:', finalData.isCertified ? 'CERTIFIED' : 'NOT CERTIFIED');

    console.log('--- VALIDATION COMPLETE ---');
}

run().catch(console.error);
