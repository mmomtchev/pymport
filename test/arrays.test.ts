import { pymport, proxify, PyObject, pyval } from 'pymport';
import { toPythonArray, toTypedArray } from 'pymport/array';
import { assert } from 'chai';

describe('array', () => {
  const array = proxify(pymport('array'));

  afterEach('gc', global.gc);

  it('constructor', () => {
    const a = array.array('l', pyval('range(10)'));

    assert.instanceOf(a, PyObject);
    assert.equal(a.type, 'array.array');
    assert.equal(a.typecode, 'l');
    assert.lengthOf(a, 10);

    assert.equal(a.item(4), 4); // Implicit conversion using Symbol.toPrimitive
    assert.strictEqual(a.item(4).toJS(), 4);
  });

  it('export to TypedArray', () => {
    const a = array.array('i', pyval('range(10)'));

    const t = toTypedArray(a) as Int32Array;
    assert.instanceOf(t, Int32Array);
    assert.lengthOf(t, 10);
    assert.equal(t[4], 4);
  });

  it('import from TypedArray', () => {
    const t = new Int32Array(10);
    for (let i = 0; i < t.length; i++)
      t[i] = i;

    const a = proxify(toPythonArray(t));

    assert.instanceOf(a, PyObject);
    assert.equal(a.type, 'array.array');
    assert.equal(a.typecode, 'i');
    assert.lengthOf(a, 10);

    assert.equal(a.item(4), 4); // Implicit conversion using Symbol.toPrimitive
    assert.strictEqual(a.item(4).toJS(), 4);
  });

});
