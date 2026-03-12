const bcryptjs = require('bcryptjs');
const dbHash = '$2b$10$c1D9/VDQLQk9leKGl./Ihe2sfaxB6GqVXx0eO68asszVIujy7ToBG';
console.log('Matches DB Hash?', bcryptjs.compareSync('TDB2026@', dbHash));
