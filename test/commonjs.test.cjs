/* eslint-disable @typescript-eslint/no-var-requires */
const { pymport, proxify, PyObject } = require('pymport');
const { getPythonType } = require('pymport/array');
const { assert } = require('chai');

describe('cjs', () => {
  it('require', () => {
    const np = proxify(pymport('numpy'));
    assert.instanceOf(np, PyObject);
  });
  it('array', () => {
    assert.equal(getPythonType(new Uint32Array(1)), 'I');
  });
});
