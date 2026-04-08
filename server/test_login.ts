import { PrismaClient } from '@prisma/client';
import { AuthController } from './src/controllers/AuthController';
import express from 'express';
// We simulate the login request for Terra Gaucha
const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.post('/api/v1/auth/test-login', AuthController.login);

app.listen(9999, async () => {
    console.log("Mock server on 9999");
    const response = await fetch('http://localhost:9999/api/v1/auth/test-login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': '127.0.0.1'
        },
        body: JSON.stringify({ email: 'paulo@terragaucha.com', password: 'TerraGaucha2026@', portalCompany: 'Terra Gaucha' })
    });
    const json = await response.json();
    console.log("LOGIN RESULT:");
    console.log(json);
    process.exit(0);
});
