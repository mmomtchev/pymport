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

  it('async callback', (done) => {
    const py_call = pymport('python_helpers').get('dont_catch_exception');
    const fn = PyObject.fromJS((x: PyObject) => +x + 1);
    const q = py_call.callAsync(fn);

    assert.instanceOf(q, Promise);
    q.then(() => {
      console.log('1');
      done('Not expected to succeed');
    }).catch((err) => {
      try {
        assert.match(err.toString(), /back to JavaScript from an asynchronous Python invocation/);
        done();
      } catch (err) {
        done(err);
      }
    });
  });

});
