import { pymport } from '../lib';
import pymportProxy from '../lib/proxy';
import { assert } from 'chai';

describe('proxy', () => {
  const np = new Proxy(pymport('numpy'), pymportProxy);

  it('basic access', () => {
    const a = np.arange(15).reshape(3, 5);
    const r = a.tolist().toJS();

    assert.deepEqual(r, [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14]]);
  });

  it('unique references', () => {
    const a = np.arange;
    const b = np.arange;

    assert.equal(a, b);
    assert.equal(a.name, 'arange');
  });
});
