/* eslint-disable @typescript-eslint/no-var-requires */
const { Worker } = require('worker_threads');
const path = require('path');

// Make sure the dynamic library is loaded from the main thread
// https://github.com/mmomtchev/pymport/issues/69
const { PyObject } = require('pymport');
PyObject.fromJS(3.14);

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
    const r = await spawnWorker('lambda x: x + 4.2');
    if (r !== 8.4) throw new Error('r=' + r);
    i++;
    if (i % 10 == 0) console.log('deca', i / 10);
  }
}

main();
