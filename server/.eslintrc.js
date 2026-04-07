module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{
        name: '@prisma/client',
        importNames: ['PrismaClient'],
        message: 'FATAL: Global PrismaClient instantiation is geometrically banned in this architecture. ALWAYS use req.scopedPrisma or tenantContextRunner to interact with the database.'
      }]
    }],
    '@typescript-eslint/no-explicit-any': 'off', // Muted for MVP typing
  },
  overrides: [
    {
      // Allow global Prisma strictly inside config generators and script bounds
      files: ['src/config/scopedPrisma.ts', 'src/index.ts', 'scripts/**/*.ts'],
      rules: {
        'no-restricted-imports': 'off'
      }
    }
  ]
};
