import { pymport, PyObject, pyval } from 'pymport';
import { assert } from 'chai';

let np: PyObject;
describe('types', () => {
  before(() => {
    np = pymport('numpy');
  });

  afterEach('gc', global.gc);

  describe('float', () => {
    it('toJS()', () => {
      const f = PyObject.float(2.3);
      assert.instanceOf(f, PyObject);
      assert.isFalse(f.callable);
      assert.isUndefined(f.length);
      assert.throws(() => f.item(0), /not subscriptable/);
      assert.throws(() => PyObject.keys(f), /does not support mapping/);
      assert.throws(() => PyObject.values(f), /does not support mapping/);
      assert.equal(f.type, 'float');
      assert.equal(f.toJS(), 2.3);
      assert.equal(+f, 2.3);
      assert.equal(f.valueOf(), 2.3);
    });

    it('fromJS()', () => {
      const f = PyObject.fromJS(2.3);
      assert.instanceOf(f, PyObject);
      assert.isFalse(f.callable);
      assert.isUndefined(f.length);
      assert.equal(f.type, 'float');
      assert.equal(f.toJS(), 2.3);
    });

    it('toString()', () => {
      const f = PyObject.fromJS(2.3);
      assert.equal(f.toString(), '2.3');
    });

    it('throws on invalid value', () => {
      assert.throws(() => PyObject.float('a' as unknown as number), /Argument must be/);
    });
  });

  describe('int', () => {
    it('toJS()', () => {
      const f = PyObject.int(2.3);
      assert.instanceOf(f, PyObject);
      assert.isFalse(f.callable);
      assert.isUndefined(f.length);
      assert.throws(() => f.item(0), /not subscriptable/);
      assert.throws(() => PyObject.keys(f), /does not support mapping/);
      assert.throws(() => PyObject.values(f), /does not support mapping/);
      assert.equal(f.type, 'int');
      assert.equal(f.toJS(), 2);
      assert.equal(+f, 2);
      assert.equal(f.valueOf(), 2);
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

    it('throws on invalid value', () => {
      assert.throws(() => PyObject.float({ b: 12 } as unknown as number), /Argument must be/);
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
  });

  describe('list', () => {
    const array = [1, 2.1, 'hello'];

    it('toJS()', () => {
      const a = np.get('arange').call(15).get('reshape').call(3, 5);

      assert.deepEqual(a.get('tolist').call().toJS(), [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14]]);
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
      assert.throws(() => a.item(10));
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
      assert.throws(() => t.item(10));
      assert.throws(() => PyObject.keys(t), /'tuple' object has no attribute 'keys'/);
      assert.throws(() => PyObject.values(t), /'tuple' object has no attribute 'values'/);
    });

    it('toJS()', () => {
      const t = PyObject.tuple(array);
      assert.deepEqual(t.toJS(), array);
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
  });

  describe('string', () => {
    it('string()', () => {
      const s = PyObject.string('hello');
      assert.instanceOf(s, PyObject);
      assert.isFalse(s.callable);
      assert.equal(s.length, 5);
      assert.equal(s.type, 'str');
      assert.equal(s.toJS(), 'hello');
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
  });

  describe('bool', () => {
    it('True is equivalent to true', () => {
      const bool = PyObject.fromJS(true);
      assert.isFalse(bool.callable);
      assert.isUndefined(bool.length);
      assert.equal(bool.type, 'bool');
      assert.equal(bool.toString(), 'True');
      assert.equal(bool.toJS(), true);
      assert.throws(() => PyObject.keys(bool), /does not support mapping/);
      assert.throws(() => PyObject.values(bool), /does not support mapping/);
    });

    it('False is equivalent to false', () => {
      const bool = PyObject.fromJS(false);
      assert.isFalse(bool.callable);
      assert.isUndefined(bool.length);
      assert.equal(bool.type, 'bool');
      assert.equal(bool.toString(), 'False');
      assert.equal(bool.toJS(), false);
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
    });

    it('fromJS()', () => {
      assert.throws(() => PyObject.fromJS(() => undefined), /not supported/);
    });

    it('__PyObject__', () => {
      const fn = np.get('ones').toJS();
      assert.instanceOf(fn.__PyObject__, PyObject);
      assert.equal(fn.__PyObject__, np.get('ones'));
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

      const v = PyObject.memoryview(Buffer.from('123')).item(PyObject.slice([null, null, 2]));
      assert.throws(() => {
        v.toJS();
      }, /contiguous/);
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

      const cut = list.get('__getitem__').call(slice);
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

      const cut = list.get('__getitem__').call(slice);
      assert.deepEqual(cut.toJS(), [0, 1, 2]);
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
