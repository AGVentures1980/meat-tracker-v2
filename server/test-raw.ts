import { app } from './src/index';
import request from 'supertest';
import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'brasa-secret-key-change-me';
const tokenStoreA = sign({ id: "uuid-1", role: 'manager', companyId: "10-abc", storeId: 101, scope: { type: 'STORE', storeId: 101 } }, JWT_SECRET);

async function run() {
    const res = await request(app)
        .get('/api/v1/vault/access/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokenStoreA}`);
    console.log("STATUS:", res.status);
    console.log("BODY:", res.body);
    process.exit(0);
}
run();
