import { app } from './src/index';
import request from 'supertest';
import { sign } from 'jsonwebtoken';

const tokenStoreA = sign({ id: "uuid-1", role: 'manager', companyId: "10-abc", storeId: 101, scope: { type: 'STORE', storeId: 101 } }, 'brasa-secret-key-change-me');

request(app)
    .get('/api/v1/vault/access/00000000-0000-0000-0000-000000000000')
    .set('Authorization', `Bearer ${tokenStoreA}`)
    .end((err, res) => {
        console.log('STATUS:', res?.status);
        console.log('BODY:', JSON.stringify(res?.body));
        process.exit(0);
    });
