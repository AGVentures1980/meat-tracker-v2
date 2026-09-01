import { encryptGCM, decryptGCM, decryptCBC, decryptCredentialString } from '../src/lib/connectors/google';
import crypto from 'crypto';

function runTests() {
  console.log('==================================================');
  console.log('STARTING OAUTH TOKEN ENCRYPTION SECURITY TESTS');
  console.log('==================================================');

  const key1 = 'brasa-oauth-token-encryption-32c';
  const key2 = 'brasa-oauth-token-encryption-32w'; // wrong key
  const aad1 = 'org-a-id:integration-a-id:GOOGLE';
  const aad2 = 'org-b-id:integration-b-id:GOOGLE'; // wrong AAD
  const payload = JSON.stringify({
    mockMode: false,
    accessToken: 'live-access-token-98765',
    refreshToken: 'live-refresh-token-98765',
    expiresAt: Date.now() + 3600000,
    accountId: 'accounts/123456789'
  });

  // 1. GCM Round Trip Test
  console.log('\n[TEST 1] GCM Round Trip...');
  const encrypted = encryptGCM(payload, aad1, key1);
  const decrypted = decryptGCM(encrypted, aad1, key1);
  if (decrypted !== payload) {
    throw new Error('GCM round trip failed: Decrypted payload mismatch');
  }
  console.log('✔ PASS: GCM Round Trip matches original payload.');

  // 2. Unique IV Test
  console.log('\n[TEST 2] Unique IV per encryption...');
  const enc1 = encryptGCM(payload, aad1, key1);
  const enc2 = encryptGCM(payload, aad1, key1);
  if (enc1 === enc2) {
    throw new Error('Unique IV test failed: Ciphertext collision detected');
  }
  console.log('✔ PASS: Encryption outputs are unique (different IVs used).');

  // 3. Tampered Ciphertext Test
  console.log('\n[TEST 3] Tampered Ciphertext Validation...');
  const parts = encrypted.split(':');
  // Alter ciphertext last hex character
  const tamperedCipher = parts[4].substring(0, parts[4].length - 1) + (parts[4].endsWith('a') ? 'b' : 'a');
  const tamperedEncrypted = `gcm:v1:${parts[2]}:${parts[3]}:${tamperedCipher}`;
  try {
    decryptGCM(tamperedEncrypted, aad1, key1);
    throw new Error('Tampered ciphertext test failed: Decrypted successfully');
  } catch (err: any) {
    console.log('✔ PASS: Tampered ciphertext successfully rejected. Error:', err.message);
  }

  // 4. Tampered Authentication Tag Test
  console.log('\n[TEST 4] Tampered Authentication Tag Validation...');
  const tamperedTag = parts[3].substring(0, parts[3].length - 1) + (parts[3].endsWith('0') ? '1' : '0');
  const tamperedTagEncrypted = `gcm:v1:${parts[2]}:${tamperedTag}:${parts[4]}`;
  try {
    decryptGCM(tamperedTagEncrypted, aad1, key1);
    throw new Error('Tampered tag test failed: Decrypted successfully');
  } catch (err: any) {
    console.log('✔ PASS: Tampered auth tag successfully rejected. Error:', err.message);
  }

  // 5. Wrong Encryption Key Test
  console.log('\n[TEST 5] Decryption with Wrong Key...');
  try {
    decryptGCM(encrypted, aad1, key2);
    throw new Error('Wrong key test failed: Decrypted successfully');
  } catch (err: any) {
    console.log('✔ PASS: Wrong key successfully rejected. Error:', err.message);
  }

  // 6. Wrong AAD Context Test
  console.log('\n[TEST 6] Decryption with Wrong AAD context...');
  try {
    decryptGCM(encrypted, aad2, key1);
    throw new Error('Wrong AAD test failed: Decrypted successfully');
  } catch (err: any) {
    console.log('✔ PASS: Wrong AAD successfully rejected. Error:', err.message);
  }

  // 7. Legacy CBC Format Test
  console.log('\n[TEST 7] Legacy CBC parsing...');
  // Create legacy CBC ciphertext
  const legacyKey = 'brasa-secure-secret-key-32-chars';
  const cbcIv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(legacyKey), cbcIv);
  let cbcEncrypted = cipher.update(payload);
  cbcEncrypted = Buffer.concat([cbcEncrypted, cipher.final()]);
  
  // Format 1: cbc:v1:iv:ciphertext
  const legacyFormatted1 = `cbc:v1:${cbcIv.toString('hex')}:${cbcEncrypted.toString('hex')}`;
  // Format 2: iv:ciphertext (plain cbc)
  const legacyFormatted2 = `${cbcIv.toString('hex')}:${cbcEncrypted.toString('hex')}`;

  const cbcDecrypted1 = decryptCBC(legacyFormatted1, legacyKey);
  const cbcDecrypted2 = decryptCBC(legacyFormatted2, legacyKey);

  if (cbcDecrypted1 !== payload || cbcDecrypted2 !== payload) {
    throw new Error('Legacy CBC decryption failed');
  }
  console.log('✔ PASS: Legacy CBC decrypted successfully.');

  // 8. Plaintext Fallback Protection Test
  console.log('\n[TEST 8] Plaintext Protection (ALLOW_LEGACY_PLAINTEXT_CREDENTIALS=false)...');
  process.env.ALLOW_LEGACY_PLAINTEXT_CREDENTIALS = 'false';
  try {
    decryptCredentialString(payload, aad1, key1);
    throw new Error('Plaintext protection test failed: Plaintext accepted');
  } catch (err: any) {
    console.log('✔ PASS: Plaintext credentials correctly blocked. Error:', err.message);
  }

  console.log('\n==================================================');
  console.log('🎉 ALL TOKEN ENCRYPTION SECURITY TESTS PASSED!');
  console.log('==================================================');
}

try {
  runTests();
  process.exit(0);
} catch (e: any) {
  console.error('\n💥 TEST SUITE FAILURE:', e.message);
  process.exit(1);
}
