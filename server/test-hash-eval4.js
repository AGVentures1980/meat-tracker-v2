const bcryptjs = require('bcryptjs');
const dbHash = '$2b$10$TKTPZXH8l5kxoN0fyQ28iuCaBhvZDKEgSy4QmJ4sbcK2.8BoRvorC';
console.log('Matches DB Hash? (rodrigo.davila)', bcryptjs.compareSync('TDB2026@', dbHash));
