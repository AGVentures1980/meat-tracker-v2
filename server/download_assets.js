const fs = require('fs');
const https = require('https');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36', 'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' } }, (response) => {
      // Check for redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => { file.close(resolve); });
      file.on('error', (err) => { fs.unlink(dest, () => reject(err)); });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  try {
    await downloadFile('https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Fogo_de_Ch%C3%A3o_logo.svg/1024px-Fogo_de_Ch%C3%A3o_logo.svg.png', '../client/public/fdc-logo.png');
    console.log('Downloaded logo.');
    await downloadFile('https://images.unsplash.com/photo-1544025162-8111142125bb?q=80&w=1200&auto=format&fit=crop', '../client/public/fdc-bg.jpg');
    console.log('Downloaded bg.');
  } catch (err) {
    console.error(err);
  }
}

run();
