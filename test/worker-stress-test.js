/* eslint-disable @typescript-eslint/no-var-requires */
const { Worker } = require('worker_threads');
const path = require('path');
const Queue = require('async-await-queue');

const queue = new Queue(24, 0);

function spawnWorker(script) {
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

async function main() {
  let i = 0;
  console.log('start');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const me = Symbol();
    queue.wait(me)
      .then(() => spawnWorker('lambda x: x + 4.2'))
      .then((r) => {
        if (Math.abs(r - 4.2 * 102) > 0.1) throw new Error('r=' + r);
        i++;
        if (i % 10 == 0) console.log('deca', i / 10);
      })
      .finally(() => queue.end(me));
    const { waiting } = queue.stat();
    if (waiting > 100) {
      const throttle = Symbol();
      await queue.wait(throttle, -1).finally(() => queue.end(throttle));
    }
  }
}

main();
