import { pymport, PyObject } from '../lib';
import { assert } from 'chai';

describe('pymport', () => {
    describe('numpy', () => {
        it('basic pyimport', () => {
            const np = pymport('numpy');

            const a = np.get('arange').call(15).get('reshape').call(PyObject.int(3), PyObject.int(5));

            assert.deepEqual(a.get('tolist').call().toJS(), [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14]]);
        });

        it('toJS() expansion', () => {
            const np = pymport('numpy').toJS();
            const a = np.arange(3);
            assert.deepEqual(a.get('tolist').call().toJS(), [0, 1, 2]);
        });
    });

    describe('object store', () => {
        it('retrieves existing objects from the store', () => {
            const np = pymport('numpy');

            const a = np.get('arange');
            const b = np.get('arange');
            assert.equal(a, b);
        });

        it('functions share the same reference', () => {
            const arange1 = pymport('numpy').toJS().arange;
            const arange2 = pymport('numpy').toJS().arange;
            assert.equal(arange1, arange2);
        });

        it('objects obtained by different means are still identical', () => {
            const np = pymport('numpy');
            const npJS = pymport('numpy').toJS();
            assert.equal(np.get('__loader__'), npJS.__loader__);
        });
    });

    describe('named arguments', () => {
        it('PyObject mode', () => {
            const np = pymport('numpy');

            const a = np.get('ones').call([2, 3], { dtype: np.get('int16') });
            assert.deepEqual(a.get('tolist').call().toJS(), [[1, 1, 1], [1, 1, 1]]);
        });

        it('JS mode', () => {
            const np = pymport('numpy').toJS();

            const a = np.ones([2, 3], { dtype: np.int16 });
            assert.deepEqual(a.get('tolist').call().toJS(), [[1, 1, 1], [1, 1, 1]]);
        });
    });
});
