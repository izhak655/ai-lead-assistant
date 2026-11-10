const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  { ignores: ['.next/**', 'next-env.d.ts', 'eslint.config.js'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
