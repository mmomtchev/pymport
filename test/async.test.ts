import { pymport, PyObject } from 'pymport';
import { assert } from 'chai';

describe('callAsync', () => {
  const np = pymport('numpy');

  it('nominal', (done) => {
    const q = np.get('arange').callAsync(25);

    assert.instanceOf(q, Promise);
    q.then((r) => {
      assert.instanceOf(r, PyObject);
      assert.equal(r.type, 'numpy.ndarray');
      assert.lengthOf(r.get('tolist').call(), 25);
      done();
    }).catch((err) => done(err));
  });

  it('exception', (done) => {
    const q = np.get('arange').callAsync('not a number');

    assert.instanceOf(q, Promise);
    q.then(() => {
      done('Not expected to succeed');
    }).catch((err) => {
      try {
        assert.match(err.toString(), /unsupported operand type/);
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('async callback nominal', (done) => {
    const py_call = pymport('python_helpers').get('dont_catch_exception');
    const fn = PyObject.fromJS(() => 14);
    const q = py_call.callAsync(fn);

    assert.instanceOf(q, Promise);
    q.then((r) => {
      assert.instanceOf(r, PyObject);
      assert.equal(r.type, 'int');
      assert.equal(+r, 14);
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('async callback w/exception', (done) => {
    const py_call = pymport('python_helpers').get('dont_catch_exception');
    const fn = PyObject.fromJS(() => { throw new Error('Bad news from JS'); });
    const q = py_call.callAsync(fn);

    assert.instanceOf(q, Promise);
    q.then(() => {
      done('Not expected to succeed');
    }).catch((err) => {
      try {
        assert.match(err.toString(), /Bad news from JS/);
        done();
      } catch (err) {
        done(err);
      }
    });
  });

});
