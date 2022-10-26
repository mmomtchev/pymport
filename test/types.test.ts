import { pymport, PyObject } from 'pymport';
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
      assert.throws(() => PyObject.keys(f), /does not implement keys/);
      assert.throws(() => PyObject.values(f), /does not implement values/);
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
      assert.throws(() => PyObject.keys(f), /does not implement keys/);
      assert.throws(() => PyObject.values(f), /does not implement values/);
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
      assert.throws(() => PyObject.keys(a), /does not implement keys/);
      assert.throws(() => PyObject.values(a), /does not implement values/);
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
      assert.throws(() => PyObject.keys(t), /does not implement keys/);
      assert.throws(() => PyObject.values(t), /does not implement values/);
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
      assert.throws(() => PyObject.keys(s), /does not implement keys/);
      assert.throws(() => PyObject.values(s), /does not implement values/);
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
      assert.throws(() => PyObject.keys(bool), /does not implement keys/);
      assert.throws(() => PyObject.values(bool), /does not implement values/);
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
      assert.throws(() => PyObject.keys(fn), /does not implement keys/);
      assert.throws(() => PyObject.values(fn), /does not implement values/);
    });

    it('toJS()', () => {
      const fn = np.get('ones').toJS();
      assert.typeOf(fn, 'function');
    });

    it('__PyObject__', () => {
      const fn = np.get('ones').toJS();
      assert.instanceOf(fn.__PyObject__, PyObject);
      assert.equal(fn.__PyObject__, np.get('ones'));
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

      assert.throws(() => PyObject.keys(slice), /does not implement keys/);
      assert.throws(() => PyObject.values(slice), /does not implement values/);
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
  });
});
