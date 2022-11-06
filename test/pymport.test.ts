import { pymport, PyObject, PythonError, version } from 'pymport';
import { assert } from 'chai';

import pkg from '../package.json';

describe('pymport', () => {
  it('version', () => {
    assert.strictEqual(version.pymport.major, +pkg.version.split('.')[0]);
    assert.strictEqual(version.pymport.minor, +pkg.version.split('.')[1]);
    assert.strictEqual(version.pymport.patch, +pkg.version.split('-')[0].split('.')[2]);
    assert.isBoolean(version.pythonLibrary.builtin);
    assert.isNumber(version.pythonLibrary.major);
    assert.isNumber(version.pythonLibrary.minor);
    assert.isNumber(version.pythonLibrary.micro);
    assert.isNumber(version.pythonLibrary.release);
    assert.isNumber(version.pythonLibrary.serial);
    assert.isString(version.pythonLibrary.version);
    if (version.pythonLibrary.builtin)
      assert.isString(version.pythonHome);
    else
      assert.isNull(version.pythonHome);
  });

  describe('numpy', () => {
    it('basic pyimport', () => {
      const np = pymport('numpy');
      const a = np.get('arange').call(15).get('reshape').call(3, 5);
      assert.deepEqual(a.get('tolist').call().toJS(), [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14]]);
    });

    it('toJS() expansion', () => {
      const np = pymport('numpy').toJS();
      const a = np.arange(3);
      assert.deepEqual(a.get('tolist').call().toJS(), [0, 1, 2]);
    });

    it('iterators/generators', () => {
      const np = pymport('numpy');
      const a = np.get('arange').call(6);
      const it = np.get('nditer').call(a);

      const result = [];
      for (const el of it) {
        // nditer over an 1D numpy array does not return scalar values
        // it returns 0D numpy arrays which are a very special case
        // Python can make it look as these were scalars, but in fact you
        // have to call item() w/o index to get the real scalar reference
        result.push(el.get('item').call().toJS());
      }
      assert.deepEqual(result, [0, 1, 2, 3, 4, 5]);
    });
  });

  describe('pandas', () => {
    it('basic pyimport', () => {
      const pd = pymport('pandas');
      const d = pd.get('Series').call([1, 3, 5, NaN, 6, 8]);
      assert.deepEqual(d.get('tolist').call().toJS(), [1, 3, 5, NaN, 6, 8]);
    });

    it('to_numpy()', () => {
      const pd = pymport('pandas');
      const d = pd.get('Series').call([1, 3, 5, NaN, 6, 8]);
      assert.deepEqual(d.get('to_numpy').call().get('tolist').call().toJS(), [1, 3, 5, NaN, 6, 8]);
    });

    it('passing a single dict argument', () => {
      const check_dict_arg = pymport('python_helpers').get('single_dict_arg');
      assert.doesNotThrow(() => {
        check_dict_arg.call({ a: 0 }, undefined);
      });
    });

    it('operator[] with a string', () => {
      const pd = pymport('pandas');
      const np = pymport('numpy');

      const df = pd.get('DataFrame').call(np.get('ones').call([8, 2]), { columns: ['A', 'B'] });
      const df2 = df.get('__getitem__').call('A');
      assert.deepEqual(df2.get('tolist').call().toJS(), [1, 1, 1, 1, 1, 1, 1, 1]);
    });

    it('operator[] with an object', () => {
      const pd = pymport('pandas');
      const np = pymport('numpy');

      const ones = np.get('ones').call([4, 1]);
      const zeros = np.get('zeros').call([4, 1]);
      const cols = np.get('concatenate').call([ones, zeros], { axis: 1 });
      const df = pd.get('DataFrame').call(cols, { columns: ['ones', 'zeroes'] });
      const selector = df.get('__ge__').call(1);
      const df2 = df.get('__getitem__').call(selector).get('values');
      const out = df2.get('tolist').call().toJS();
      assert.strictEqual(out[0][0], 1);
      assert.isNaN(out[1][1]);
      assert.deepEqual(out, [[1, NaN], [1, NaN], [1, NaN], [1, NaN]]);
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

    it('functions obtained by different means are still identical', () => {
      const np = pymport('numpy');
      const npJS = pymport('numpy').toJS();
      assert.equal(np.get('ones').toJS(), npJS.ones);
    });
  });

  describe('named arguments', () => {
    it('numpy arguments', () => {
      const np = pymport('numpy');

      const a = np.get('ones').call([2, 3], { dtype: np.get('int16') });
      assert.strictEqual(a.get('dtype'), np.get('dtype').call('int16'));
      assert.deepEqual(a.get('tolist').call().toJS(), [[1, 1, 1], [1, 1, 1]]);
    });

    it('pandas arguments', () => {
      const pd = pymport('pandas');
      const d = pd.get('date_range').call('20130101', { periods: 6 });
      assert.deepEqual(d.get('tolist').call().toJS().map((e: PyObject) => e.toString()), [
        '2013-01-01 00:00:00',
        '2013-01-02 00:00:00',
        '2013-01-03 00:00:00',
        '2013-01-04 00:00:00',
        '2013-01-05 00:00:00',
        '2013-01-06 00:00:00'
      ]);
    });

    it('single named argument', () => {
      const np = pymport('numpy');
      const a = np.get('array').call([[1, 2, 3], [4, 5, 6]]);
      const max = a.get('max').call({ axis: 1 });
      assert.deepEqual(max.get('tolist').call().toJS(), [3, 6]);
    });

    it('JS mode', () => {
      const np = pymport('numpy').toJS();

      const a = np.ones([2, 3], { dtype: np.int16 });
      assert.strictEqual(a.get('dtype'), np.dtype('int16'));
      assert.deepEqual(a.get('tolist').call().toJS(), [[1, 1, 1], [1, 1, 1]]);
    });
  });

  describe('handling of Python exceptions', () => {
    it('retrieve the Python traceback', () => {
      const raise = pymport('python_helpers');

      try {
        raise.get('raise_exception').call();
        assert.isTrue(false); // make sure there is an exception
      } catch (e: any) {
        const traceback = pymport('traceback');
        const stack = traceback.get('extract_tb').call((e as PythonError).pythonTrace);
        const text = stack.get('format').call().toJS();
        assert.match(text, /python_helpers.py/);
        assert.match(text, /line 2/);
        assert.match(text, /raise_exception/);
        assert.match(text, /test exception/);
      }
    });
  });
});
