module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  parserOptions: {
    "ecmaVersion": "latest",
    "ecmaFeatures": {
      experimentalObjectRestSpread: true,
    },
  },
  rules: {
    "quotes": ["error", "double"],
    "max-len": 0,
    "indent": 0,
    "spaced-comment": 0,
    "semi": 0,
    "prefer-const": 0,
    "object-curly-spacing": 0,
    "no-multiple-empty-lines": 0,
    "require-jsdoc": 0,
    "padded-blocks": 0,
    "no-unused-vars": 0,
    "no-empty": 0,
  },
};
