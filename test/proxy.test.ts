import { pymport, proxify, PyObject, pyval } from 'pymport';
import { assert } from 'chai';

describe('proxy', () => {
  const np = proxify(pymport('numpy'));
  const pd = proxify(pymport('pandas'));

  afterEach('gc', global.gc);

  it('numpy', () => {
    const a = np.arange(15).reshape(3, 5);
    const r = a.tolist().toJS();

    assert.isTrue(np.has('ones'));
    assert.isTrue(a.has('tolist'));
    assert.deepEqual(r, [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14]]);
  });

  it('pandas', () => {
    const df = pd.DataFrame(np.arange(15).reshape(5, 3), { columns: PyObject.list(['A', 'B', 'C']) });
    assert.deepEqual(df.columns.tolist().toJS(), ['A', 'B', 'C']);

    // df[2:3]
    const df2 = df.item(PyObject.slice([2, 3, null]));
    assert.deepEqual(df2.values.tolist().toJS(), [[6, 7, 8]]);

    // df[df["C"] <= 3]
    const df3 = df.item(df.item('C').__le__(3));
    assert.deepEqual(df3.values.tolist().toJS(), [[0, 1, 2]]);
  });

  it('proxified objects return unique references', () => {
    const a = np.arange;
    const b = np.arange;

    assert.equal(a, b);
    assert.equal(a.name, 'arange');
  });

  it('proxified objects have unique references', () => {
    const py = PyObject.fromJS({ name: 'value' });
    const a = proxify(py);
    const b = proxify(py);

    assert.equal(a, b);
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

  it('functions', () => {
    const fn = proxify(pyval('lambda x: (x + 42)'));

    assert.typeOf(fn, 'function');
    assert.equal(fn(-42).toJS(), 0);
  });

  it('passing proxified arguments', () => {
    const py_array = pyval('np.array([2, 1, 0]).tolist()', { np });
    assert.instanceOf(py_array, PyObject);
    assert.deepEqual(py_array.toJS(), [2, 1, 0]);
  });

  it('automatic conversion to JS objects through Symbol.toPrimitive', () => {
    const num = proxify(PyObject.int(10));
    assert.instanceOf(num, PyObject);
    assert.equal(num, 10);
    assert.throws(() => assert.strictEqual(num, 10));
  });

  it('returns undefined for non-existing attributes', () => {
    const obj = proxify(PyObject.fromJS({ test: 'test' }));
    assert.isUndefined(obj.notAtest);
  });

  it('does not intercept calls to functions whose names conflict with PyObject', () => {
    const a = np.arange(4, { dtype: np.int32 });
    assert.equal(a.type, 'numpy.ndarray');

    assert.equal(a.dtype, np.dtype('int32'));
    assert.equal(a.dtype.__PyObject__, np.dtype('int32').__PyObject__);

    const d = np.average(a);
    assert.equal(d.type, 'numpy.float64');

    // call the underlying item() method instead of the PyObject.item()
    assert.closeTo(d.item().toJS(), 1.5, 1e-6);
  });
});
