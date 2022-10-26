/* eslint-disable @typescript-eslint/no-var-requires */
const { pymport, proxify, PyObject } = require('..');
const { assert } = require('chai');

describe('cjs', () => {
  it('require', () => {
    const np = proxify(pymport('numpy'));
    assert.instanceOf(np, PyObject);
  });
});
