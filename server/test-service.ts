import { VaultService } from './src/services/vault.service';
import { getScopedPrisma } from './src/config/scopedPrisma';

async function run() {
    try {
        const fakeUser = { id: 1, role: 'manager', companyId: "10-abc", storeId: 101, scope: { type: 'STORE', storeId: 101 } };
        const scopedPrisma = getScopedPrisma(fakeUser);
        
        await VaultService.requestDownloadUrl(
            scopedPrisma,
            '00000000-0000-0000-0000-000000000000',
            'fake-user',
            '127.0.0.1',
            undefined
        );
    } catch (e: any) {
        console.log("CRASHED NATIVELY:");
        console.log(e);
        console.log("MESSAGE:", e.message);
    }
}
run();
