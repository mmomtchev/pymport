/* eslint-disable @typescript-eslint/no-var-requires */
import { pymport, proxify, PyObject } from 'pymport';
import { pymport as proxified } from 'pymport/proxified';
import { getPythonType } from 'pymport/array';
import { assert } from 'chai';

describe('es6', () => {
  it('import', () => {
    const np = proxify(pymport('numpy'));
    assert.instanceOf(np, PyObject);
  });
  it('array', () => {
    assert.equal(getPythonType(new Uint32Array(1)), 'I');
  });
  it('proxified', () => {
    const np = proxified('numpy');
    assert.instanceOf(np, PyObject);
  });
});
