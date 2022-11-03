import { pymport, proxify, PyObject, pyval } from 'pymport';
import { getPythonType, toPythonArray, toTypedArray } from 'pymport/array';
import { assert } from 'chai';

const tests = [
  Uint8Array,
  Int8Array,
  Uint16Array,
  Int16Array,
  Uint32Array,
  Int32Array,
  BigUint64Array,
  BigInt64Array,
  Float32Array,
  Float64Array
];

describe('array', () => {
  const array = proxify(pymport('array'));

  it('constructor', () => {
    const a = array.array('l', pyval('range(10)'));

    assert.instanceOf(a, PyObject);
    assert.equal(a.type, 'array.array');
    assert.equal(a.typecode, 'l');
    assert.lengthOf(a, 10);

    assert.equal(a.item(4), 4); // Implicit conversion using Symbol.toPrimitive
    assert.strictEqual(a.item(4).toJS(), 4);
  });

  for (const cons of tests) {
    describe(cons.name, () => {
      it('export to TypedArray', () => {
        const a = array.array(getPythonType(new cons(1)), pyval('range(10)'));

        const t = toTypedArray(a) as any;
        assert.instanceOf(t, cons);
        assert.lengthOf(t, 10);
        assert.equal(t[4], 4);
      });

      it('import from TypedArray', () => {
        const t = new cons(10);
        for (let i = 0; i < t.length; i++)
          t[i] = cons == BigInt64Array || cons == BigUint64Array ? BigInt(i) : i;

        const a = proxify(toPythonArray(t));

        assert.instanceOf(a, PyObject);
        assert.equal(a.type, 'array.array');
        assert.equal(a.typecode, getPythonType(t));
        assert.lengthOf(a, 10);

        assert.equal(a.item(4), 4); // Implicit conversion using Symbol.toPrimitive
        assert.strictEqual(a.item(4).toJS(), 4);
      });
    });
  }
});
