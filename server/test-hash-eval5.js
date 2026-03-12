const bcryptjs = require('bcryptjs');
const dbHash = '$2b$10$12joQ.032ZRgEu/ylg/t7.9Lcgd.6wuGhd4Wtz0eacLRAiZeO2gHu';
console.log('Matches DB Hash? (12jo...)', bcryptjs.compareSync('TDB2026@', dbHash));
