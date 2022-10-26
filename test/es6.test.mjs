/* eslint-disable @typescript-eslint/no-var-requires */
import pymport from '../lib/index.js';
import { assert } from 'chai';

describe('es6', () => {
  it('import', () => {
    const np = pymport.proxify(pymport.pymport('numpy'));
    assert.instanceOf(np, pymport.PyObject);
  });
});
