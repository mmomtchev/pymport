module.exports = {
  'spec': 'test/*.test.ts',
  'require': [
    'ts-node/register',
    'tsconfig-paths/register',
    'test/_init.ts'
  ],
  'node-option': +process.versions.node.split('.')[
    0
  ] >= 23 ? [
    'no-experimental-strip-types'
  ] : [],
  'timeout': '30000',
  'reporter': 'tap',
  'v8-expose-gc': true
};
