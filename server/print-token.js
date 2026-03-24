const jwt = require('jsonwebtoken');
console.log(jwt.sign({ userId: 'admin-123', email: 'alexandre@alexgarciaventures.co', role: 'admin' }, 'brasa-secret-key-change-me', { expiresIn: '12h' }));
