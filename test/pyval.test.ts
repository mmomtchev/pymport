import { pymport, PyObject, pyval } from 'pymport';
import { assert } from 'chai';

describe('pyval', () => {
  it('basic pyval', () => {
    const py_array = pyval('[1, 2, 3]');
    assert.instanceOf(py_array, PyObject);
    assert.deepEqual(py_array.toJS(), [1, 2, 3]);
  });

  it('function', () => {
    const py_fn = pyval('lambda x: (x + 42)');

    assert.instanceOf(py_fn, PyObject);
    assert.isTrue(py_fn.callable);
    assert.strictEqual(py_fn.call(-42).toJS(), 0);

    const js_fn = py_fn.toJS();
    assert.typeOf(js_fn, 'function');
    assert.equal(js_fn(-42).toJS(), 0);
  });

  it('w/ args', () => {
    const py_array = pyval('[1, x, 3]', { x: 4 });
    assert.instanceOf(py_array, PyObject);
    assert.deepEqual(py_array.toJS(), [1, 4, 3]);
  });

  it('w/ modules', () => {
    const np = pymport('numpy');
    const py_array = pyval('np.array([2, 1, 0]).tolist()', { np });
    assert.instanceOf(py_array, PyObject);
    assert.deepEqual(py_array.toJS(), [2, 1, 0]);
  });
});
