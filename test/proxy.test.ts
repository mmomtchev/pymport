import { pymport, PyObject, pyval } from 'pymport/proxified';
import { PyObject as rawPyObject, proxify as rawProxify } from 'pymport';
import { assert } from 'chai';

describe('proxy', () => {
  const np = pymport('numpy');
  const pd = pymport('pandas');

  it('numpy', () => {
    const a = np.arange(15).reshape(3, 5);
    const r = a.tolist().toJS();

    assert.isTrue(np.has('ones'));
    assert.isTrue(a.has('tolist'));
    assert.throws(() => {
      a.has([1]);
    }, /must be a string/);
    assert.deepEqual(r, [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14]]);
  });

  it('pandas', () => {
    const df = pd.DataFrame(np.arange(15).reshape(5, 3), { columns: PyObject.list(['A', 'B', 'C']) });
    assert.deepEqual(df.columns.tolist().toJS(), ['A', 'B', 'C']);

    // df[2:3]
    const df2 = df.item(PyObject.slice({ start: 2, stop: 3 }));
    assert.deepEqual(df2.values.tolist().toJS(), [[6, 7, 8]]);

    // df[df["C"] <= 3]
    const df3 = df.item(df.item('C').__le__(3));
    assert.deepEqual(df3.values.tolist().toJS(), [[0, 1, 2]]);
  });

  it('proxified PyObject constructs proxified objects', () => {
    const py = PyObject.fromJS({ name: 'value' });

    assert.instanceOf(py, PyObject);
    assert.instanceOf(py.__PyObject__, PyObject);
  });

  it('proxified objects return unique references', () => {
    const a = np.arange;
    const b = np.arange;

    assert.equal(a, b);
    assert.equal(a.name, 'arange');
  });

  it('proxified objects have unique references', () => {
    const py = rawPyObject.fromJS({ name: 'value' });
    const a = rawProxify(py);
    const b = rawProxify(py);

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
    const d = PyObject.int(12);

    assert.equal(d.type, 'int');
    assert.strictEqual(d.toJS(), 12);

    const n = d.constr(14);
    assert.strictEqual(n.toJS(), 14);
    assert.equal(n, 14);
  });

  it('chaining getters', () => {
    const a = np.arange(2).reshape(1, 2);

    assert.deepEqual(a.T.T.tolist().toJS(), [[0, 1]]);
  });

  it('functions', () => {
    const fn = pyval('lambda x: (x + 42)');

    assert.typeOf(fn, 'function');
    assert.equal(fn(-42).toJS(), 0);
  });

  it('passing proxified arguments', () => {
    const py_array = pyval('np.array([2, 1, 0]).tolist()', { np });
    assert.instanceOf(py_array, PyObject);
    assert.deepEqual(py_array.toJS(), [2, 1, 0]);
  });

  it('automatic conversion to JS objects through Symbol.toPrimitive', () => {
    const num = PyObject.int(10);
    assert.instanceOf(num, PyObject);
    assert.equal(+num, 10);
    assert.throws(() => assert.strictEqual(num, 10));
  });

  it('returns undefined for non-existing attributes', () => {
    const obj = PyObject.fromJS({ test: 'test' });
    assert.isUndefined(obj.notAtest);
  });

  it('proxified JS callbacks', () => {
    const fn = (x: any, y: any) => {
      return x.__add__(y);
    };
    const a = np.fromfunction(fn, [2, 3]);
    assert.deepEqual(a.tolist().toJS(), [[0, 1, 2], [1, 2, 3]]);
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

  it('PyObject.keys()', () => {
    const dict = PyObject.dict({ a: 0, b: 1 });
    assert.deepEqual(PyObject.keys(dict).toJS(), ['a', 'b']);
  });

  it('PyObject.values()', () => {
    const dict = PyObject.dict({ a: 0, b: 1 });
    assert.deepEqual(PyObject.values(dict).toJS(), [0, 1]);
  });

  it('does not mismatch objects with identical string representation', () => {
    const obj1 = PyObject.fromJS({ a: 1 });
    const obj2 = PyObject.fromJS({ a: 1 });

    assert.deepEqual(obj1.toJS(), obj2.toJS());
    assert.notEqual(obj1, obj2);
  });

  describe('list', () => {
    it('append()', () => {
      const list = PyObject.list([1]);
      assert.lengthOf(list, 1);
      list.append(2);
      assert.deepEqual(list.toJS(), [1, 2]);
      assert.lengthOf(list, 2);
    });

    it('iterator', () => {
      const list = PyObject.list([8, 9, 3]);

      const result = [];
      for (const el of list) {
        // check that the returned elements are also proxified
        assert.instanceOf(el.__PyObject__, PyObject);
        result.push(el.toJS());
      }
      assert.deepEqual(result, [8, 9, 3]);
    });
  });
});
