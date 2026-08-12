/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard', 'stylelint-config-clean-order'],
  rules: {
    'at-rule-no-deprecated': null,
    'color-hex-length': null,
    'selector-class-pattern': [
      '^[a-z][\\w-]*$',
      { message: 'Las clases deben usar kebab-case o BEM' },
    ],
    'custom-property-pattern': null,
  },
}
