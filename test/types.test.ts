import { pymport, PyObject, pyval } from 'pymport';
import { assert } from 'chai';

function toArray(obj: PyObject) {
  const r = [];
  for (const i of obj) {
    r.push(i);
  }
  return r;
}

let np: PyObject;
describe('types', () => {
  before(() => {
    np = pymport('numpy');
  });

  describe('float', () => {
    it('toJS()', () => {
      const f = PyObject.float(2.3);
      assert.instanceOf(f, PyObject);
      assert.isFalse(f.callable);
      assert.isUndefined(f.length);
      assert.isUndefined(f.item(0));
      assert.throws(() => PyObject.keys(f), /does not support mapping/);
      assert.throws(() => PyObject.values(f), /does not support mapping/);
      assert.equal(f.type, 'float');
      assert.equal(f.toJS(), 2.3);
      assert.equal(+f, 2.3);
      assert.equal(f.valueOf(), 2.3);
      assert.instanceOf(f.constr.call(1), PyObject);
    });

    it('fromJS()', () => {
      const f = PyObject.fromJS(2.3);
      assert.instanceOf(f, PyObject);
      assert.isFalse(f.callable);
      assert.isUndefined(f.length);
      assert.equal(f.type, 'float');
      assert.equal(f.toJS(), 2.3);
    });

    it('float() type coercion', () => {
      const d = PyObject.float(PyObject.string('3.14'));
      assert.equal(d.type, 'float');
      assert.equal(d.valueOf(), 3.14);
    });

    it('toString()', () => {
      const f = PyObject.fromJS(2.3);
      assert.equal(f.toString(), '2.3');
    });

    it('throws on invalid value', () => {
      assert.throws(() => PyObject.float('a' as unknown as number), /Argument must be/);
    });

    it('nan', () => {
      const f = PyObject.fromJS(NaN);
      assert.equal(f.type, 'float');
      assert.deepEqual(f.toString(), 'nan');
      assert.isNaN(f.toJS());
    });

    it('inf', () => {
      const pf = PyObject.fromJS(Infinity);
      assert.equal(pf.type, 'float');
      assert.deepEqual(pf.toString(), 'inf');
      assert.equal(pf.toJS(), Infinity);

      const nf = PyObject.fromJS(-Infinity);
      assert.equal(nf.type, 'float');
      assert.deepEqual(nf.toString(), '-inf');
      assert.equal(nf.toJS(), -Infinity);
    });

    it('iterator', () => {
      assert.throws(() => toArray(PyObject.float(2.3)), /float is not iterable/);
    });
  });

  describe('int', () => {
    it('toJS()', () => {
      const f = PyObject.int(2.3);
      assert.instanceOf(f, PyObject);
      assert.isFalse(f.callable);
      assert.isUndefined(f.length);
      assert.isUndefined(f.item(0));
      assert.throws(() => PyObject.keys(f), /does not support mapping/);
      assert.throws(() => PyObject.values(f), /does not support mapping/);
      assert.equal(f.type, 'int');
      assert.equal(f.toJS(), 2);
      assert.equal(+f, 2);
      assert.equal(f.valueOf(), 2);
      assert.instanceOf(f.constr.call(1), PyObject);
    });

    it('int() type coercion', () => {
      const d = PyObject.int(PyObject.float(3.14));
      assert.equal(d.type, 'int');
      assert.equal(d.valueOf(), 3);
    });

    it('fromJS()', () => {
      const f = PyObject.fromJS(2);
      assert.instanceOf(f, PyObject);
      assert.isFalse(f.callable);
      assert.isUndefined(f.length);
      assert.equal(f.type, 'int');
      assert.equal(f.toJS(), 2);
    });

    it('toString()', () => {
      const f = PyObject.fromJS(2);
      assert.equal(f.toString(), '2');
    });

    it('automatic int conversion', () => {
      const zero = PyObject.fromJS(1e-7);
      assert.equal(zero.type, 'int');
      assert.strictEqual(zero.toJS(), 0);

      const notzero = PyObject.fromJS(1e-6);
      assert.equal(notzero.type, 'float');
      assert.isAbove(notzero.toJS(), 0);

      // Casting is not rounding, it is truncating!
      const one = PyObject.fromJS(1 - 1e-7);
      assert.equal(one.type, 'int');
      assert.strictEqual(one.toJS(), 0);

      const notone = PyObject.fromJS(1 - 1e-6);
      assert.equal(notone.type, 'float');
      assert.isBelow(notone.toJS(), 1);
      assert.isAbove(notone.toJS(), 0);
    });

    it('throws on invalid value', () => {
      assert.throws(() => PyObject.int({ b: 12 } as unknown as number), /Argument must be/);
    });

    it('min/max numbers w/ constructor', () => {
      const max = PyObject.int(Number.MAX_SAFE_INTEGER);
      assert.strictEqual(max.toJS(), Number.MAX_SAFE_INTEGER);

      const min = PyObject.int(Number.MIN_SAFE_INTEGER);
      assert.strictEqual(min.toJS(), Number.MIN_SAFE_INTEGER);
    });

    it('min/max numbers w/ fromJS', () => {
      const max = PyObject.fromJS(Number.MAX_SAFE_INTEGER);
      assert.strictEqual(max.toJS(), Number.MAX_SAFE_INTEGER);

      const min = PyObject.fromJS(Number.MIN_SAFE_INTEGER);
      assert.strictEqual(min.toJS(), Number.MIN_SAFE_INTEGER);
    });

    it('iterator', () => {
      assert.throws(() => toArray(PyObject.int(2)), /int is not iterable/);
    });

    it('map()', () => {
      assert.throws(() => PyObject.int(2).map(() => undefined), /is not iterable/);
    });
  });

  describe('list', () => {
    const array = [1, 2.1, 'hello'];

    it('toJS()', () => {
      const a = np.get('arange').call(15).get('reshape').call(3, 5);

      assert.deepEqual(a.get('tolist').call().toJS(), [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14]]);
    });

    it('toJS() w/depth', () => {
      const t = PyObject.list(array);

      assert.strictEqual(t.toJS({ depth: 0 }), t);

      const js = t.toJS({ depth: 1 });
      assert.strictEqual(js.length, 3);
      assert.instanceOf(js[0], PyObject);
      assert.instanceOf(js[1], PyObject);
      assert.instanceOf(js[2], PyObject);

      assert.deepEqual(t.toJS({ depth: 2 }), array);
    });

    it('automatic from array argument', () => {
      const a = np.get('array').call([[1, 2, 3], [4, 5, 6]]).get('reshape').call(3, 2);
      assert.deepEqual(a.get('tolist').call().toJS(), [[1, 2], [3, 4], [5, 6]]);
    });

    it('fromJS()', () => {
      const a = PyObject.fromJS(array);
      assert.equal(a.type, 'list');
      assert.equal(a.length, 3);
      assert.equal(a.item(1).toJS(), 2.1);
      assert.isUndefined(a.item(10));
      assert.throws(() => PyObject.keys(a), /'list' object has no attribute 'keys'/);
      assert.throws(() => PyObject.values(a), /'list' object has no attribute 'values'/);
      assert.deepEqual(a.toJS(), array);
    });

    it('toString()', () => {
      const a = PyObject.fromJS(array);
      assert.equal(a.toString(), "[1, 2.1, 'hello']");
    });

    it('list()', () => {
      const a = PyObject.list(array);
      assert.equal(a.type, 'list');
      assert.deepEqual(a.toJS(), array);
    });

    it('list() from PyObject iterable', () => {
      const list = PyObject.list(PyObject.string('abcd'));
      assert.equal(list.type, 'list');
      assert.strictEqual(list.item(2).toJS(), 'c');
      assert.deepEqual(list.toJS(), ['a', 'b', 'c', 'd']);
    });

    it('empty', () => {
      const list = PyObject.list([]);
      assert.strictEqual(list.type, 'list');
      assert.strictEqual(list.length, 0);
    });

    it('append()', () => {
      const a = PyObject.list([1]);
      assert.lengthOf(a, 1);
      a.get('append').call(2);
      assert.equal(a.type, 'list');
      assert.deepEqual(a.toJS(), [1, 2]);
      assert.lengthOf(a, 2);
    });

    it('throws on invalid value', () => {
      assert.throws(() => PyObject.list({ b: 12 } as unknown as number[]), /Argument must be/);
    });

    it('circular references', () => {
      const circular: any[] = [];
      circular[0] = circular;
      const d = PyObject.fromJS(circular);
      assert.instanceOf(d, PyObject);
      assert.isFalse(d.callable);
      assert.equal(d.length, 1);
      assert.deepEqual(circular, d.toJS());
      assert.equal(d.toString(), '[[...]]');
    });

    it('iterator', () => {
      assert.deepEqual(toArray(PyObject.list([8, 9, 3])).map(el => el.toJS()), [8, 9, 3]);
    });

    it('map()', () => {
      const a = PyObject.list(array);
      assert.equal(a.type, 'list');
      const b = a.map(function (x, i, o) {
        assert.strictEqual(o, a);
        assert.strictEqual(this, 1);
        return x.type === 'int' ? x.toString() : i.toString();
      }, 1);
      assert.deepEqual(b, ['1', '1', '2']);
    });
  });

  describe('set', () => {
    const array = [2, 1.2, 'Добро утро'];

    it('set() from array', () => {
      const set = PyObject.set(array);
      assert.equal(set.type, 'set');
      assert.equal(set.length, 3);
      assert.isUndefined(set.item(1));
      assert.throws(() => PyObject.keys(set), /Object does not support mapping protocol/);
      assert.throws(() => PyObject.values(set), /Object does not support mapping protocol/);
      assert.isTrue(set.get('__contains__').call(2).toJS());
      assert.isFalse(set.get('__contains__').call(3).toJS());
      assert.sameMembers(set.toJS(), array);
    });

    it('set() from PyObject', () => {
      const set = PyObject.set(PyObject.list(array));
      assert.equal(set.type, 'set');
      assert.equal(set.length, 3);
      assert.sameMembers(set.toJS(), array);
    });

    it('toString()', () => {
      const set = PyObject.set(array);
      const str = set.toString();
      assert.include(str, 'Добро утро');
      assert.include(str, '1.2');
      assert.include(str, '1');
      assert.sameMembers(set.toJS(), array);
    });

    it('has()', () => {
      const set = PyObject.set(PyObject.list(array));
      assert.isTrue(set.has(PyObject.fromJS(2)));
      assert.isTrue(set.has(PyObject.fromJS('Добро утро')));
      assert.isFalse(set.has(PyObject.fromJS(3)));
      assert.isFalse(set.has(PyObject.fromJS('Добрутро')));
      assert.isTrue(set.has(2));
      assert.isTrue(set.has('Добро утро'));
      assert.isFalse(set.has(3));
      assert.isFalse(set.has('Добрутро'));
    });

    it('add() / clear()', () => {
      const set = PyObject.set([1]);
      assert.lengthOf(set, 1);
      assert.sameMembers(set.toJS(), [1]);
      set.get('add').call(2);
      assert.lengthOf(set, 2);
      assert.sameMembers(set.toJS(), [1, 2]);
      set.get('clear').call();
      assert.lengthOf(set, 0);
      assert.sameMembers(set.toJS(), []);
    });

    it('frozenset() from array', () => {
      const set = PyObject.frozenSet(array);
      assert.equal(set.type, 'frozenset');
      assert.equal(set.length, 3);
      assert.sameMembers(set.toJS(), array);
      assert.isUndefined(set.get('add'));
      assert.isUndefined(set.get('clear'));
    });

    it('frozenset() from PyObject', () => {
      const set = PyObject.frozenSet(PyObject.list(array));
      assert.equal(set.type, 'frozenset');
      assert.equal(set.length, 3);
      assert.sameMembers(set.toJS(), array);
      assert.isUndefined(set.get('add'));
      assert.isUndefined(set.get('clear'));
    });

    it('throws on invalid value', () => {
      assert.throws(() => PyObject.set({ b: 12 } as unknown as number[]), /Argument must be/);
    });

    it('iterator', () => {
      assert.sameMembers(toArray(PyObject.set([8, 9, 3])).map(el => el.toJS()), [8, 9, 3]);
    });
  });

  describe('tuple', () => {
    const array = [1, 'a', { name: 'text' }];

    it('tuple()', () => {
      const t = PyObject.tuple(array);
      assert.isFalse(t.callable);
      assert.equal(t.type, 'tuple');
      assert.isFalse(t.callable);
      assert.equal(t.length, 3);
      assert.equal(t.item(1).toJS(), 'a');
      assert.isUndefined(t.item(10));
      assert.throws(() => PyObject.keys(t), /'tuple' object has no attribute 'keys'/);
      assert.throws(() => PyObject.values(t), /'tuple' object has no attribute 'values'/);
    });

    it('empty', () => {
      const t = PyObject.tuple([]);
      assert.strictEqual(t.type, 'tuple');
      assert.strictEqual(t.length, 0);
    });

    it('tuple() from PyObject iterable', () => {
      assert.throws(() => {
        PyObject.tuple(PyObject.string('abcd'));
      }, /is not a list/);
      const tuple = PyObject.tuple(PyObject.list(PyObject.string('abcd')));
      assert.equal(tuple.type, 'tuple');
      assert.strictEqual(tuple.item(2).toJS(), 'c');
      assert.deepEqual(tuple.toJS(), ['a', 'b', 'c', 'd']);
    });

    it('toJS()', () => {
      const t = PyObject.tuple(array);
      assert.deepEqual(t.toJS(), array);
    });

    it('toJS() w/depth', () => {
      const t = PyObject.tuple(array);

      assert.strictEqual(t.toJS({ depth: 0 }), t);

      const js1 = t.toJS({ depth: 1 });
      assert.strictEqual(js1.length, 3);
      assert.instanceOf(js1[0], PyObject);
      assert.instanceOf(js1[1], PyObject);
      assert.instanceOf(js1[2], PyObject);

      const js2 = t.toJS({ depth: 2 });
      assert.strictEqual(js2.length, 3);
      assert.strictEqual(js2[0], 1);
      assert.strictEqual(js2[1], 'a');
      assert.typeOf(js2[2], 'object');
      assert.instanceOf(js2[2].name, PyObject);
    });

    it('toString()', () => {
      const t = PyObject.fromJS(array);
      assert.equal(t.toString(), "[1, 'a', {'name': 'text'}]");
    });

    it('throws on invalid value', () => {
      assert.throws(() => PyObject.list({ b: 12 } as unknown as number[]), /Argument must be/);
    });

    it('circular references', () => {
      const circular: any[] = [];
      circular[0] = circular;
      const t = PyObject.tuple(circular);
      assert.instanceOf(t, PyObject);
      assert.equal(t.length, 1);
      assert.deepEqual(circular, t.toJS());
      assert.equal(t.toString(), '([[...]],)');
    });

    it('iterator', () => {
      assert.deepEqual(toArray(PyObject.tuple([3, 5, 8])).map(el => el.toJS()), [3, 5, 8]);
    });

    it('map()', () => {
      const t = PyObject.tuple(array);
      assert.equal(t.type, 'tuple');
      const a = t.map(function (x, i, o) {
        assert.strictEqual(o, t);
        assert.strictEqual(this, 'this');
        return x.type === 'int' ? x.toString() : i.toString();
      }, 'this');
      assert.deepEqual(a, ['1', '1', '2']);
    });
  });

  describe('string', () => {
    it('string()', () => {
      const s = PyObject.string('hello');
      assert.instanceOf(s, PyObject);
      assert.isFalse(s.callable);
      assert.equal(s.length, 5);
      assert.equal(s.type, 'str');
      assert.equal(s.toJS(), 'hello');
      assert.equal(s.item(1).toJS(), 'e');
      assert.throws(() => PyObject.keys(s), /'str' object has no attribute 'keys'/);
      assert.throws(() => PyObject.values(s), /str' object has no attribute 'values'/);
    });

    it('toJS()', () => {
      const s = PyObject.string('hello');
      assert.equal(s.toJS(), 'hello');
    });

    it('fromJS()', () => {
      const s = PyObject.fromJS('你好');
      assert.instanceOf(s, PyObject);
      assert.isFalse(s.callable);
      assert.equal(s.length, 2);
      assert.equal(s.type, 'str');
      assert.equal(s.toJS(), '你好');
    });

    it('toString()', () => {
      const f = PyObject.fromJS('hello');
      assert.equal(f.toString(), 'hello');
    });

    it('throws on invalid value', () => {
      assert.throws(() => PyObject.string({ b: 12 } as unknown as string), /Argument must be/);
    });

    it('iterator', () => {
      assert.deepEqual(toArray(PyObject.string('abc')).map(el => el.toJS()), ['a', 'b', 'c']);
    });

    it('map()', () => {
      const s = PyObject.string('hello');
      assert.equal(s.type, 'str');
      const a = s.map(function (x, i, o) {
        assert.strictEqual(o, s);
        assert.strictEqual(this, 'this');
        return x.toJS();
      }, 'this');
      assert.deepEqual(a, ['h', 'e', 'l', 'l', 'o']);
    });
  });

  describe('dictionary', () => {
    const o = { text: 'hello', number: 42, obj: { text: 'garga' } };

    it('toJS()', () => {
      const d = PyObject.dict(o);
      assert.instanceOf(d, PyObject);
      assert.isFalse(d.callable);
      assert.equal(d.type, 'dict');
      assert.equal(d.length, 3);
      assert.deepEqual(PyObject.keys(d).toJS(), ['text', 'number', 'obj']);
      assert.deepEqual(PyObject.values(d).toJS(), ['hello', 42, { text: 'garga' }]);
      assert.deepEqual(d.toJS(), o);
    });

    it('fromJS()', () => {
      const d = PyObject.fromJS(o);
      assert.instanceOf(d, PyObject);
      assert.isFalse(d.callable);
      assert.equal(d.length, 3);
      assert.equal(d.type, 'dict');
      assert.deepEqual(d.toJS(), o);
    });

    it('toString()', () => {
      const d = PyObject.dict(o);
      assert.instanceOf(d, PyObject);
      assert.equal(d.toString(), "{'text': 'hello', 'number': 42, 'obj': {'text': 'garga'}}");
    });

    it('throws on invalid value', () => {
      assert.throws(() => PyObject.dict(12 as unknown as { t: string; }), /Argument must be/);
    });

    it('circular references', () => {
      const circular = {} as Record<string, any>;
      circular['circular'] = circular;
      const d = PyObject.fromJS(circular);
      assert.isFalse(d.callable);
      assert.equal(d.length, 1);
      assert.instanceOf(d, PyObject);
      assert.deepEqual(circular, d.toJS());
      assert.equal(d.toString(), "{'circular': {...}}");
    });

    it('returns undefined for non-existing attributes', () => {
      const obj = PyObject.fromJS({ test: 'test' });
      assert.isUndefined(obj.get('notAtest'));
    });

    it('when retrieving an non-existing attribute the error is reset', () => {
      const obj = PyObject.fromJS({ test: 'test' });
      assert.isUndefined(obj.get('notAtest'));
      assert.throws(() => pyval('invalid'), /invalid/);
    });

    it('iterator', () => {
      assert.deepEqual(toArray(PyObject.dict({ x: 0, y: 1, z: 2 })).map(el => el.toJS()), ['x', 'y', 'z']);
    });

    it('map()', () => {
      const d = PyObject.dict(o);
      assert.equal(d.type, 'dict');
      const a = d.map(function (x, i, o) {
        assert.strictEqual(o, d);
        assert.strictEqual(this, 'this');
        return x.toString();
      }, 'this');
      assert.deepEqual(a, ['text', 'number', 'obj']);
    });
  });

  describe('PyObject pass-through', () => {
    it('creating PyObject w/o conversion', () => {
      const a = np.get('array').call([1, 2, 3]);

      const b = PyObject.fromJS(a);

      assert.deepEqual(b.get('tolist').call().toJS(), [1, 2, 3]);
    });

    it('passing PyObject arguments w/o conversion', () => {
      const a = np.get('array').call([1, 2, 3]);

      const b = np.get('array').call([a, a]);

      assert.deepEqual(b.get('tolist').call().toJS(), [[1, 2, 3], [1, 2, 3]]);
    });
  });

  describe('None', () => {
    it('undefined is equivalent to None', () => {
      const undef = PyObject.fromJS(undefined);
      assert.equal(undef.type, 'NoneType');
      assert.equal(undef.toString(), 'None');
    });

    it('null is equivalent to None', () => {
      const undef = PyObject.fromJS(null);
      assert.equal(undef.type, 'NoneType');
      assert.equal(undef.toString(), 'None');
    });

    it('None is equivalent to null', () => {
      const undef = PyObject.fromJS(null);
      assert.isNull(undef.toJS());
    });

    it('iterator', () => {
      assert.throws(() => toArray(PyObject.fromJS(undefined)), /NoneType is not iterable/);
    });
  });

  describe('bool', () => {
    it('True is equivalent to true', () => {
      const bool = PyObject.fromJS(true);
      assert.isFalse(bool.callable);
      assert.isUndefined(bool.length);
      assert.equal(bool.type, 'bool');
      assert.equal(bool.toString(), 'True');
      assert.strictEqual(bool.toJS(), true);
      assert.throws(() => PyObject.keys(bool), /does not support mapping/);
      assert.throws(() => PyObject.values(bool), /does not support mapping/);
    });

    it('False is equivalent to false', () => {
      const bool = PyObject.fromJS(false);
      assert.isFalse(bool.callable);
      assert.isUndefined(bool.length);
      assert.equal(bool.type, 'bool');
      assert.equal(bool.toString(), 'False');
      assert.strictEqual(bool.toJS(), false);
    });

    it('iterator', () => {
      assert.throws(() => toArray(PyObject.fromJS(true)), /bool is not iterable/);
    });
  });

  describe('function', () => {
    it('type', () => {
      const fn = np.get('ones');
      assert.instanceOf(fn, PyObject);
      assert.isTrue(fn.callable);
      assert.isUndefined(fn.length);
      assert.equal(fn.type, 'function');
      assert.throws(() => PyObject.keys(fn), /does not support mapping/);
      assert.throws(() => PyObject.values(fn), /does not support mapping/);
    });

    it('toJS()', () => {
      const fn = np.get('ones').toJS();
      assert.typeOf(fn, 'function');
      const array = fn(5);
      assert.instanceOf(array, PyObject);
      assert.equal(array.type, 'numpy.ndarray');

      assert.throws(() => {
        fn(Symbol(1));
      }, /Object type is not supported/);

      const backToPython = PyObject.fromJS(fn);
      assert.instanceOf(backToPython, PyObject);
      assert.equal(backToPython.type, 'function');
      assert.equal(backToPython.call(4).type, 'numpy.ndarray');
    });

    it('fromJS()', () => {
      const js_fn = (a: PyObject) => +a + 1;
      const fn = PyObject.fromJS(js_fn);

      assert.instanceOf(fn, PyObject);
      assert.isTrue(fn.callable);
      assert.isUndefined(fn.length);
      assert.equal(fn.type, 'pymport.js_function');

      const r = fn.call(4);
      assert.instanceOf(r, PyObject);
      assert.equal(r.type, 'int');
      assert.equal(r.toJS(), 5);

      assert.equal(fn.toJS(), js_fn);
    });

    it('constructor', () => {
      const fn = PyObject.func((a: any) => {
        assert.instanceOf(a, PyObject);
        return a + 2;
      });

      assert.instanceOf(fn, PyObject);
      assert.isTrue(fn.callable);
      assert.isUndefined(fn.length);
      assert.equal(fn.type, 'pymport.js_function');

      const r = fn.call('a');
      assert.instanceOf(r, PyObject);
      assert.equal(r.type, 'str');
      assert.equal(r.toJS(), 'a2');
    });

    it('named args', () => {
      const js_fn = (a: PyObject, opts?: { value?: number; }) => +a + ((opts ?? {}).value ?? 4);

      const fn = PyObject.func(js_fn);

      assert.equal(fn.call(2).toJS(), 6);
      assert.equal(fn.call(2, { value: 3 }).toJS(), 5);
    });

    it('automatic conversion w/ named args', () => {
      const py_fn = pymport('python_helpers').get('dont_catch_exception');
      const r = py_fn.call(() => 12);

      assert.equal(r.type, 'int');
      assert.equal(+r, 12);
    });

    it('return PyObject', () => {
      const js_fn = (a: PyObject) => {
        assert.equal(a.type, 'int');
        return PyObject.float(+a + 1);
      };
      const fn = PyObject.fromJS(js_fn);

      const r = fn.call(3);
      assert.instanceOf(r, PyObject);
      assert.equal(r.type, 'float');
      assert.equal(r.toJS(), 4);
    });

    it('catching JS exceptions from Python', () => {
      const fn = PyObject.fromJS(() => {
        throw new Error('JS exception');
      });

      assert.instanceOf(fn, PyObject);
      assert.isTrue(fn.callable);
      assert.equal(fn.type, 'pymport.js_function');

      const py_catch = pymport('python_helpers').get('catch_exception');
      const r = py_catch.call(fn);

      assert.instanceOf(r, PyObject);
      assert.equal(r.type, 'Exception');
      assert.equal(r.toString(), 'JS exception');
    });

    it('catching JS exceptions propagated through Python', () => {
      const fn = PyObject.fromJS(() => {
        throw new Error('JS exception');
      });

      assert.isTrue(fn.callable);
      assert.equal(fn.type, 'pymport.js_function');

      const py_catch = pymport('python_helpers').get('dont_catch_exception');

      assert.throws(() => {
        py_catch.call(fn);
      }, /Python exception: JS exception/);
    });

    it('unsupported arguments', () => {
      const fn = PyObject.fromJS((arg: any) => {
        assert.instanceOf(arg, PyObject);
        assert.equal(arg.type, 'slice');
        return { signed: true };
      });

      const py_call_cheee = pymport('python_helpers').get('call_with_cheese');
      const r = py_call_cheee.call(fn);

      assert.instanceOf(r, PyObject);
      assert.equal(r.type, 'dict');
      assert.deepEqual(r.toJS(), { signed: true });
    });

    it('__PyObject__', () => {
      const fn = np.get('ones').toJS();
      assert.instanceOf(fn.__PyObject__, PyObject);
      assert.equal(fn.__PyObject__, np.get('ones'));
    });

    it('iterator', () => {
      assert.throws(() => toArray(PyObject.fromJS(() => undefined)), /function is not iterable/);
    });
  });

  describe('Buffer Protocol objects', () => {
    it('Buffer fromJS()', () => {
      const text = 'a string';
      const buf = Buffer.from(text, 'utf-8');
      const byteArray = PyObject.fromJS(buf);
      assert.instanceOf(byteArray, PyObject);
      assert.equal(byteArray.type, 'bytearray');
      assert.isFalse(byteArray.callable);
      assert.equal(byteArray.length, text.length);
      assert.equal(String.fromCharCode(byteArray.item(1).toJS()), text[1]);

      const backToJs = byteArray.toJS();
      assert.instanceOf(backToJs, Buffer);
      assert.deepEqual(buf, backToJs);
    });

    it('bytes toJS()', () => {
      const text = 'different string';
      const bytes = PyObject.bytes(Buffer.from(text));
      assert.equal(bytes.type, 'bytes');
      assert.instanceOf(bytes, PyObject);
      assert.isFalse(bytes.callable);
      assert.equal(bytes.length, text.length);
      assert.equal(String.fromCharCode(bytes.item(1).toJS()), text[1]);

      const buf = bytes.toJS();
      assert.equal(buf.length, text.length);
      assert.instanceOf(buf, Buffer);
      assert.equal(buf.toString(), text);
    });

    it('toJS({buffer: false})', () => {
      const text = 'no conversion';
      const bytes = PyObject.bytes(Buffer.from(text));
      assert.equal(bytes.type, 'bytes');
      assert.strictEqual(bytes.toJS({ buffer: false }), bytes);
    });

    it('bytearray toJS()', () => {
      const text = 'another string';
      const bytearray = PyObject.bytearray(Buffer.from(text));
      assert.equal(bytearray.type, 'bytearray');
      assert.instanceOf(bytearray, PyObject);
      assert.isFalse(bytearray.callable);
      assert.equal(bytearray.length, text.length);
      assert.equal(String.fromCharCode(bytearray.item(1).toJS()), text[1]);

      const buf = bytearray.toJS();
      assert.equal(buf.length, text.length);
      assert.instanceOf(buf, Buffer);
      assert.equal(buf.toString(), text);
    });

    it('memoryview toJS()', () => {
      const text = 'yet another string';
      const buf = Buffer.from(text);
      const mv = PyObject.memoryview(buf);
      assert.equal(mv.type, 'memoryview');
      assert.instanceOf(mv, PyObject);
      assert.isFalse(mv.callable);
      assert.equal(mv.length, text.length);
      assert.equal(String.fromCharCode(mv.item(1).toJS()), text[1]);

      const backToJs = mv.toJS();
      assert.equal(backToJs.length, text.length);
      assert.instanceOf(backToJs, Buffer);
      assert.equal(backToJs.toString(), text);

      // This triggers the finalizer chain
      const del = pymport('python_helpers');
      del.get('delete_arg').call(mv);
    });

    it('non-contiguous arrays', () => {
      const a = np.get('zeros').call([2, 3]).get('T');
      assert.throws(() => {
        a.toJS();
      }, /contiguous/);

      // Equivalent to memoryview(b'123')[::2]
      const v = PyObject.memoryview(Buffer.from('123')).item(PyObject.slice({ step: 2 }));
      assert.throws(() => {
        v.toJS();
      }, /contiguous/);
    });

    it('numpy round-trip conversion through the Buffer protocol', () => {
      const py = np.get('ones').call(6);
      const js = py.get('tolist').call().toJS();  // to JS array

      const buf = py.toJS();                      // to JS Buffer
      const r = np.get('frombuffer').call(buf);   // back to Python numpy

      assert.deepEqual(r.get('tolist').call().toJS(), js);
    });
  });

  describe('BigInt', () => {
    it('min/max numbers w/ constructor', () => {
      const max = PyObject.int(BigInt(Number.MAX_SAFE_INTEGER) + BigInt(5));
      assert.equal(max.type, 'int');
      assert.typeOf(max.toJS(), 'BigInt');
      assert.equal(max.toJS(), BigInt(Number.MAX_SAFE_INTEGER) + BigInt(5));

      const min = PyObject.int(BigInt(Number.MIN_SAFE_INTEGER) - BigInt(5));
      assert.equal(min.type, 'int');
      assert.typeOf(min.toJS(), 'BigInt');
      assert.equal(min.toJS(), BigInt(Number.MIN_SAFE_INTEGER) - BigInt(5));
    });

    it('min/max numbers from number', () => {
      const max = PyObject.fromJS(Number.MAX_SAFE_INTEGER + 5);
      assert.equal(max.type, 'int');
      assert.typeOf(max.toJS(), 'BigInt');
      assert.equal(max.toJS(), Number.MAX_SAFE_INTEGER + 5);

      const min = PyObject.int(Number.MIN_SAFE_INTEGER - 5);
      assert.equal(min.type, 'int');
      assert.typeOf(min.toJS(), 'BigInt');
      assert.equal(min.toJS(), Number.MIN_SAFE_INTEGER - 5);
    });

    it('min/max numbers w/ fromJS', () => {
      const max = PyObject.fromJS(BigInt(Number.MAX_SAFE_INTEGER) + BigInt(5));
      assert.equal(max.type, 'int');
      assert.typeOf(max.toJS(), 'BigInt');
      assert.equal(max.toJS(), BigInt(Number.MAX_SAFE_INTEGER) + BigInt(5));

      const min = PyObject.fromJS(BigInt(Number.MIN_SAFE_INTEGER) - BigInt(5));
      assert.equal(min.type, 'int');
      assert.typeOf(min.toJS(), 'BigInt');
      assert.equal(min.toJS(), BigInt(Number.MIN_SAFE_INTEGER) - BigInt(5));
    });
  });

  describe('Symbol', () => {
    it('fromJS()', () => {
      assert.throws(() => PyObject.fromJS(Symbol(1)), /not supported/);
    });
  });

  describe('slice', () => {
    it('full arguments', () => {
      const slice = PyObject.slice([1, 5, 2]);
      const list = PyObject.list([0, 1, 2, 3, 4, 5, 6, 7]);

      assert.instanceOf(slice, PyObject);
      assert.isFalse(slice.callable);
      assert.isUndefined(slice.length);
      assert.equal(slice.type, 'slice');

      const cut = list.item(slice);
      assert.deepEqual(cut.toJS(), [1, 3]);

      assert.throws(() => PyObject.keys(slice), /does not support mapping/);
      assert.throws(() => PyObject.values(slice), /does not support mapping/);
    });

    it('partial arguments', () => {
      const slice = PyObject.slice([null, 3, null]);
      const list = PyObject.list([0, 1, 2, 3, 4, 5, 6, 7]);

      assert.instanceOf(slice, PyObject);
      assert.isFalse(slice.callable);
      assert.isUndefined(slice.length);
      assert.equal(slice.type, 'slice');

      const cut = list.item(slice);
      assert.deepEqual(cut.toJS(), [0, 1, 2]);
    });

    it('object arguments', () => {
      const slice = PyObject.slice({ start: 1, stop: 3 });
      const list = PyObject.list([0, 1, 2, 3, 4, 5, 6, 7]);
      const string = PyObject.string('abcde');

      assert.instanceOf(slice, PyObject);
      assert.isFalse(slice.callable);
      assert.isUndefined(slice.length);
      assert.equal(slice.type, 'slice');

      const cut = list.item(slice);
      assert.deepEqual(cut.toJS(), [1, 2]);

      assert.strictEqual(string.item(slice).toJS(), 'bc');
    });

    it('iterator', () => {
      assert.throws(() => toArray(PyObject.slice({})), /slice is not iterable/);
    });
  });

  describe('class', () => {
    it('class w/ static member', () => {
      const klass = pymport('python_helpers').get('SomeClass');
      assert.instanceOf(klass, PyObject);
      assert.strictEqual(klass.type, 'type');
      const staticMember = klass.get('static_member');
      assert.instanceOf(staticMember, PyObject);
      assert.strictEqual(staticMember.type, 'int');
      assert.strictEqual(staticMember.toJS(), 42);
    });
  });

  describe('types w/o equivalence', () => {
    it('loader', () => {
      const loader = np.get('__loader__');
      assert.instanceOf(loader, PyObject);
      assert.equal(loader, loader.toJS());
    });

    it('URL', () => {
      const url = new URL('http://localhost');
      assert.throws(() => {
        PyObject.fromJS(url);
      }, 'class objects');
    });
  });
});
