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
    });
    describe('int', () => {
        it('toJS', () => {
            const f = PyObject.int(2.3);
            assert.instanceOf(f, PyObject);
            assert.equal(f.toJS(), 2);
        });
    });
    describe('arrays', () => {
        it('toJS', () => {
            const a = np.get('arange').call(15).get('reshape').call(PyObject.int(3), PyObject.int(5));

            assert.deepEqual(a.get('tolist').call().toJS(), [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14]]);
        });

        it('fromJS', () => {
            const a = np.get('array').call([[1, 2, 3], [4, 5, 6]]).get('reshape').call(PyObject.int(3), PyObject.int(2));

            assert.deepEqual(a.get('tolist').call().toJS(), [[1, 2], [3, 4], [5, 6]]);
        });
    });
});
