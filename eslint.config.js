import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', 'data/**'] },
  js.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', URL: 'readonly', Buffer: 'readonly' } },
  },
  ...tseslint.configs.recommended,
  {
    // Frontend only. Plugin object comes from configs.flat.recommended; only the two requested
    // rules are enabled (the preset also turns on React Compiler rules).
    files: ['frontend/**/*.{ts,tsx}'],
    plugins: reactHooks.configs.flat.recommended.plugins,
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' },
  },
  prettier,
);
