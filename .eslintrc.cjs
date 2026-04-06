module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'import'],
  rules: {
    'import/no-default-export': 'error',
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/naming-convention': [
      'warn',
      { selector: 'variable', format: ['camelCase', 'PascalCase', 'UPPER_CASE'] },
      { selector: 'function', format: ['camelCase', 'PascalCase'] },
      { selector: 'typeLike', format: ['PascalCase'] },
      { selector: 'variable', modifiers: ['destructured'], format: null },
      { selector: 'parameter', filter: { regex: '^_', match: true }, format: null },
      {
        selector: 'variable',
        filter: { regex: '^__', match: true },
        format: null,
      },
    ],
  },
  overrides: [
    {
      files: ['*.config.ts', '*.config.js', '.eslintrc.cjs'],
      rules: {
        'import/no-default-export': 'off',
      },
    },
    {
      files: ['functions/src/services/**/*.ts'],
      rules: {
        '@typescript-eslint/naming-convention': 'off',
      },
    },
  ],
};
