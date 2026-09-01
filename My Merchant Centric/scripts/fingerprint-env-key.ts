import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
  const lines = envContent.split('\n');
  let apiKey = '';
  for (const line of lines) {
    if (line.startsWith('GOOGLE_PLACES_API_KEY=')) {
      apiKey = line.split('=')[1].replace(/["']/g, '').trim();
    }
  }

  if (apiKey) {
    console.log('ENV key present: YES');
    console.log('ENV key length:', apiKey.length);
    console.log('ENV key first 4:', apiKey.substring(0, 4));
    console.log('ENV key last 4:', apiKey.substring(apiKey.length - 4));
    
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    console.log('ENV key SHA-256 prefix:', hash.substring(0, 8));
  } else {
    console.log('ENV key present: NO');
  }
} catch (e: any) {
  console.error('Error:', e.message);
}
