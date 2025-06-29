import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',

      // React specific rules
      'react/prop-types': 'off', // We use TypeScript for prop validation
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js
      'react-hooks/exhaustive-deps': 'warn',

      // General code quality
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn', // Allow console for debugging, just warn
      'no-debugger': 'error',
      'no-duplicate-imports': 'warn', // Downgrade to warning

      // Import organization - disabled for faster builds
      'import/order': 'off',

      // React JSX rules - disable to allow unescaped quotes
      'react/no-unescaped-entities': 'off',

      // Accessibility
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
    },
  },
  {
    files: ['**/*.test.{js,jsx,ts,tsx}'],
    rules: {
      'no-console': 'off', // Allow console in tests
    },
  },
  {
    files: ['**/tailwind.config.{js,ts}', '**/jest.config.{js,ts}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off', // Allow require in config files
    },
  },
];

export default eslintConfig;
