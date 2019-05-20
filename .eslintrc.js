module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'no-console': 'off',
    eqeqeq: ['error', 'always'],
    'linebreak-style': ['error', 'unix'],
    '@typescript-eslint/indent': ['error', 2],
    '@typescript-eslint/member-delimiter-style': [
      'error',
      { multiline: { delimiter: 'none' } },
    ],
    camelcase: 'off',
    '@typescript-eslint/camelcase': [
      'error',
      { properties: 'never', ignoreDestructuring: true },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-use-before-define': [
      'error',
      { functions: false, variables: false },
    ],
    '@typescript-eslint/no-unused-vars': ['error'],
  },
}
