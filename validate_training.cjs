
const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 3002;
const BASE_PATH = '/api/v1';

// Admin credentials
const EMAIL = 'alexandre@alexgarciaventures.co';
const PASSWORD = 'Admin123!';

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: BASE_PATH + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    console.error('Failed to parse JSON:', data);
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function run() {
    console.log('--- STARTING TRAINING FLOW VALIDATION (Native HTTP) ---');

    try {
        // 1. Login
        console.log('1. Logging in...');
        const loginRes = await request('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
        if (!loginRes.data.token) {
            console.error('Login failed:', loginRes.data);
            process.exit(1);
        }
        const token = loginRes.data.token;
        console.log('   Logged in. Token acquired.');

        // 0. Reset Progress
        console.log('0. Resetting Progress...');
        const resetRes = await request('POST', '/dashboard/training/reset', {}, token);
        console.log('   Reset Result:', resetRes.data);

        // 2. Check Initial Status
        console.log('2. Checking Training Status (Initial)...');
        const statusRes = await request('GET', '/dashboard/training/status', null, token);
        console.log('   Initial Status:', {
            modules: statusRes.data.completedModules,
            attempts: statusRes.data.examAttempts,
            certified: statusRes.data.isCertified
        });

        // 3. Complete Modules 1-5
        console.log('3. Completing Modules 1-5...');
        for (let i = 1; i <= 5; i++) {
            const res = await request('POST', '/dashboard/training/progress', { moduleId: String(i), score: 3 }, token);
            if (i === 1) console.log('   Module 1 Save Result:', res.data); // Debug first one
        }

        const preExamRes = await request('GET', '/dashboard/training/status', null, token);
        console.log('   Modules completed:', preExamRes.data.completedModules);
        if (preExamRes.data.completedModules < 5) {
            console.error('   FAILED: Modules not saved.');
        } else {
            console.log('   PASSED: All modules done.');
        }

        // 4. Fail Exam (Score 50%)
        console.log('4. Attempting Exam (Fail - 50%)...');
        const failRes = await request('POST', '/dashboard/training/exam-attempt', { score: 50 }, token);
        console.log('   Fail Attempt Result:', failRes.data);
        if (failRes.data.passed === false && failRes.data.attempts >= 1) {
            console.log('   PASSED: Exam failed correctly.');
        } else {
            console.error('   FAILED: Exam logic wrong.');
        }

        // 5. Pass Exam (Score 90%)
        console.log('5. Attempting Exam (Pass - 90%)...');
        const passRes = await request('POST', '/dashboard/training/exam-attempt', { score: 90 }, token);
        console.log('   Pass Attempt Result:', passRes.data);
        if (passRes.data.passed === true) {
            console.log('   PASSED: Certified.');
        } else {
            console.error('   FAILED: Certification logic wrong.');
        }

        // 6. Check Final Status
        const finalRes = await request('GET', '/dashboard/training/status', null, token);
        console.log('   Final Status:', finalRes.data.isCertified ? 'CERTIFIED' : 'NOT CERTIFIED');
        if (finalRes.data.isCertified) {
            console.log('--- VALIDATION SUCCESSFUL ---');
        } else {
            console.log('--- VALIDATION FAILED ---');
        }

    } catch (e) {
        console.error('Script Error:', e);
    }
}

run();
