/* eslint-disable @typescript-eslint/no-var-requires */
const { pyval } = require('pymport');
const { parentPort, workerData } = require('worker_threads');

if (!parentPort) throw new Error('This worker must be spawned from another test');

const script = workerData;
const fn = pyval(script);

let q = fn.callAsync(4.2);
for (let i = 0; i < 100; i++) {
  q = q.then((r) => fn.callAsync(r));
}

q.then((r) => parentPort.postMessage(r.toJS()));
