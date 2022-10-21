import { pymport, proxify, PyObject } from '../lib';
import { assert } from 'chai';

describe('proxy', () => {
  const np = proxify(pymport('numpy'));

  it('basic access', () => {
    const a = np.arange(15).reshape(3, 5);
    const r = a.tolist().toJS();

    assert.deepEqual(r, [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14]]);
  });

  it('unique references', () => {
    const a = np.arange;
    const b = np.arange;

    assert.equal(a, b);
    assert.equal(a.name, 'arange');
  });

  it('toString()', () => {
    const a = np.arange(2).reshape(1, 2);

    assert.equal(a.toString(), '[object [[0 1]]]');
  });

  it('PyObject pass-through', () => {
    const a = np.ones([2, 3], { dtype: np.int16 });

    assert.deepEqual(a.tolist().toJS(), [[1, 1, 1], [1, 1, 1]]);
  });

  it('PyObject constructors', () => {
    const d = proxify(PyObject.int(12));

    assert.equal(d.type, 'int');
    assert.equal(d.toJS(), 12);
  });

  it('chaining getters', () => {
    const a = np.arange(2).reshape(1, 2);

    assert.deepEqual(a.T.T.tolist().toJS(), [[0, 1]]);
  });
});
