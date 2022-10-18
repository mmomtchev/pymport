import { pymport, PyObject } from '../lib';
import { assert } from 'chai';

let np: pymport.PyObject;
describe('types', () => {
    before(() => {
        np = pymport('numpy');
    });

    describe('float', () => {
        it('toJS', () => {
            const f = PyObject.float(2.3);
            assert.instanceOf(f, PyObject);
            assert.equal(f.toJS(), 2.3);
        });

        it('fromJS', () => {
            const f = PyObject.fromJS(2.3);
            assert.instanceOf(f, PyObject);
            assert.equal(f.toJS(), 2.3);
        });

        it('throws on invalid value', () => {
            assert.throws(() => PyObject.float('a' as unknown as number));
        });
    });

    describe('int', () => {
        it('toJS', () => {
            const f = PyObject.int(2.3);
            assert.instanceOf(f, PyObject);
            assert.equal(f.toJS(), 2);
        });

        it('fromJS', () => {
            const f = PyObject.fromJS(2);
            assert.instanceOf(f, PyObject);
            assert.equal(f.toJS(), 2);
        });

        it('throws on invalid value', () => {
            assert.throws(() => PyObject.float({b: 12} as unknown as number));
        });
    });

    describe('arrays', () => {
        it('toJS', () => {
            const a = np.get('arange').call(15).get('reshape').call(3, 5);

            assert.deepEqual(a.get('tolist').call().toJS(), [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14]]);
        });

        it('fromJS', () => {
            const a = np.get('array').call([[1, 2, 3], [4, 5, 6]]).get('reshape').call(3, 2);

            assert.deepEqual(a.get('tolist').call().toJS(), [[1, 2], [3, 4], [5, 6]]);
        });
    });

    describe('string', () => {
        it('toJS', () => {
            const s = PyObject.string('hello');
            assert.instanceOf(s, PyObject);
            assert.equal(s.toJS(), 'hello');
        });

        it('fromJS', () => {
            const s = PyObject.fromJS('hello');
            assert.instanceOf(s, PyObject);
            assert.equal(s.toJS(), 'hello');
        });
    });
});
