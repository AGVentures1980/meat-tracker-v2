const bcryptjs = require('bcryptjs');
const dbHash = '$2b$10$Vl3oYRQM68V.8.mkDj5xW.6joKgHD9LS1n1jbMNCcNM2aEQSDF.1q';
console.log('Matches DB Hash?', bcryptjs.compareSync('TDB2026@', dbHash));
