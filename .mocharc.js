module.exports = {
  'spec': 'test/*.test.ts',
  'require': [
    'ts-node/register',
    'tsconfig-paths/register',
    'test/_init.ts'
  ],
  'node-option': +process.versions.node.split('.')[
    0
  ] >= 22 ? [
    'no-experimental-strip-types',
    'expose-gc'
  ] : [
    'expose-gc'
  ],
  'timeout': '30000',
  'reporter': 'tap'
};
