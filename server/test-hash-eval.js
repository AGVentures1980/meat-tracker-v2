const bcryptjs = require('bcryptjs');
const dbHash = '$2b$10$wwmPuY24OzfzjQWPcl.Fy.1OCT9JMoLQBcZAfroUcOVAWQdVwuaSu';
console.log('Matches DB Hash?', bcryptjs.compareSync('TDB2026@', dbHash));
