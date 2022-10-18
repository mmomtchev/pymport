import { pymport, PyObject } from '../lib';
import { assert } from 'chai';

describe('pymport', () => {
    describe('numpy', () => {
        it('basic pyimport', () => {
            const np = pymport('numpy');

            const a = np.get('arange').call(15).get('reshape').call(PyObject.int(3), PyObject.int(5));

            assert.deepEqual(a.get('tolist').call().toJS(), [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14]]);
        })
    })
})
