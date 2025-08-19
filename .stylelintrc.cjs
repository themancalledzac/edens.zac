/* eslint-disable no-undef */
/**
 * Stylelint configuration for SCSS with Prettier compatibility.
 * - Uses standard-scss rules
 * - Integrates Prettier to avoid conflicts
 */
module.exports = {
  extends: [
    'stylelint-config-standard-scss',
  ],
  plugins: [
    'stylelint-prettier',
  ],
  rules: {
    // Enable Prettier as a Stylelint rule and treat formatting issues as errors
    'prettier/prettier': true,

    // Common SCSS preferences
    'at-rule-no-unknown': null,
    'scss/at-rule-no-unknown': true,

    'color-hex-length': 'short',
    'selector-class-pattern': null, // allow BEM/custom naming

    // Disallow vendor prefixes (use autoprefixer/PostCSS via Next.js)
    'property-no-vendor-prefix': true,
    'value-no-vendor-prefix': true,

    // Keep nested depth reasonable
    'max-nesting-depth': 3,
  },
  ignoreFiles: [
    '**/node_modules/**',
    '.next/**',
    'out/**',
    'dist/**',
    'build/**',
    'public/**',
    'coverage/**',
  ],
};
