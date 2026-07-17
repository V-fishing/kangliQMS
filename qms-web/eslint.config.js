import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import qmsTerm from './eslint-plugin-qms-terminology/index.js'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src/api/**',
      'src/types/auto-imports.d.ts',
      'src/types/components.d.ts',
      '.eslintrc-auto-import.json',
      'eslint-plugin-qms-terminology/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...vue.configs['flat/recommended'],
  {
    plugins: {
      vue,
      'qms-term': qmsTerm,
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'qms-term/no-forbidden-term': 'error',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/attributes-order': 'warn',
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  prettier,
)
