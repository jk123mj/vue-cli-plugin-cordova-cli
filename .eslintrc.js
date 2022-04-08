module.exports = {
  root: true,
  env: {
    browser: false,
    node: true,
    es6: true
  },
  extends : [ "plugin:vue-libs/recommended" ],
  'rules': {
    'camelcase': [0, {'properties': 'always'}],
    'indent': [0, 2, {'SwitchCase': 1}],
    'space-before-function-paren': [0],
    'prefer-promise-reject-errors': [0],
    'object-curly-spacing': [0],
    'no-useless-escape': [0],
    'no-eval': 0,
    "no-void": 0,
    "promise/param-names": 0,
    "standard/no-callback-literal": 0,
    "no-prototype-builtins": 0,
    "no-return-assign": 0,
    "no-case-declarations": 0,
    "import/no-named-default": 0,
    "no-new": 0
  }
}
