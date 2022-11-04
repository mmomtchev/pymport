/* eslint-disable @typescript-eslint/no-var-requires */
import pymport from 'pymport';
import { getPythonType } from 'pymport/array';
import { assert } from 'chai';

describe('es6', () => {
  it('import', () => {
    const np = pymport.proxify(pymport.pymport('numpy'));
    assert.instanceOf(np, pymport.PyObject);
  });
  it('array', () => {
    assert.equal(getPythonType(new Uint32Array(1)), 'I');
  });
});
