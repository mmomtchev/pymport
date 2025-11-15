import { pymport, PyObject } from 'pymport';
import * as path from 'path';
import { Worker } from 'worker_threads';
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
        assert.match(err.toString(), /supported/);
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

  describe('worker_threads', () => {
    function spawnWorker(script: string) {
      return new Promise((resolve, reject) => {
        const worker = new Worker(path.resolve(__dirname, './worker_thread.js'), {
          workerData: script,
        });
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0)
            reject(new Error(`Worker stopped with exit code ${code}`));
        });
      });
    }

    it('basic test', (done) => {
      const q = spawnWorker('lambda x: x + 4.2');
      q.then((r) => {
        assert.closeTo(r as number, 4.2 * 102, 0.1);
        done();
      }).catch((err) => done(err));
    });
  });
});
