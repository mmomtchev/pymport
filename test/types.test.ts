import { pymport, PyObject } from '../lib';
import { assert } from 'chai';

let np: pymport.PyObject;
describe('types', () => {
    before(() => {
        np = pymport('numpy');
    });

    afterEach('gc', global.gc);

    describe('float', () => {
        it('toJS()', () => {
            const f = PyObject.float(2.3);
            assert.instanceOf(f, PyObject);
            assert.equal(f.toJS(), 2.3);
        });

        it('fromJS()', () => {
            const f = PyObject.fromJS(2.3);
            assert.instanceOf(f, PyObject);
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
            assert.equal(f.toJS(), 2);
        });

        it('fromJS()', () => {
            const f = PyObject.fromJS(2);
            assert.instanceOf(f, PyObject);
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
        it('toJS()', () => {
            const a = np.get('arange').call(15).get('reshape').call(3, 5);

            assert.deepEqual(a.get('tolist').call().toJS(), [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14]]);
        });

        it('automatic from array argument', () => {
            const a = np.get('array').call([[1, 2, 3], [4, 5, 6]]).get('reshape').call(3, 2);
            assert.deepEqual(a.get('tolist').call().toJS(), [[1, 2], [3, 4], [5, 6]]);
        });

        it('fromJS()', () => {
            const a = PyObject.fromJS([1, 2.1, 'hello']);
            assert.deepEqual(a.toJS(), [1, 2.1, 'hello']);
        });

        it('toString()', () => {
            const a = PyObject.fromJS([1, 2.1, 'hello']);
            assert.equal(a.toString(), "[1, 2.1, 'hello']");
        });

        it('list()', () => {
            const a = PyObject.list([1, 2.1, 'hello']);
            assert.deepEqual(a.toJS(), [1, 2.1, 'hello']);
        });

        it('throws on invalid value', () => {
            assert.throws(() => PyObject.list({ b: 12 } as unknown as number[]), /Argument must be/);
        });

        it('circular references', () => {
            const circular: any[] = [];
            circular[0] = circular;
            const d = PyObject.fromJS(circular);
            assert.instanceOf(d, PyObject);
            assert.deepEqual(circular, d.toJS());
            assert.equal(d.toString(), '[[...]]');
        });
    });

    describe('tuple', () => {
        const array = [1, 'a', { name: 'text' }];

        it('toJS()', () => {
            const t = PyObject.tuple(array);
            assert.deepEqual(t.toJS(), array);
        });

        it('fromJS()', () => {
            const t = PyObject.fromJS(array);
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
            assert.deepEqual(circular, t.toJS());
            assert.equal(t.toString(), '([[...]],)');
        });
    });

    describe('string', () => {
        it('toJS()', () => {
            const s = PyObject.string('hello');
            assert.instanceOf(s, PyObject);
            assert.equal(s.toJS(), 'hello');
        });

        it('fromJS()', () => {
            const s = PyObject.fromJS('hello');
            assert.instanceOf(s, PyObject);
            assert.equal(s.toJS(), 'hello');
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
            assert.deepEqual(d.toJS(), o);
        });

        it('fromJS()', () => {
            const d = PyObject.fromJS(o);
            assert.instanceOf(d, PyObject);
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
            assert.instanceOf(d, PyObject);
            assert.deepEqual(circular, d.toJS());
            assert.equal(d.toString(), "{'circular': {...}}");
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
            assert.equal(undef.toString(), 'None');
        });

        it('null is equivalent to None', () => {
            const undef = PyObject.fromJS(null);
            assert.equal(undef.toString(), 'None');
        });

        it('None is equivalent to null', () => {
            const undef = PyObject.fromJS(null);
            assert.isNull(undef.toJS());
        });
    });

});
