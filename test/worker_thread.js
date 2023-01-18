/* eslint-disable @typescript-eslint/no-var-requires */
const { pyval } = require('pymport');
const { parentPort, workerData } = require('worker_threads');

if (!parentPort) throw new Error('This worker must be spawned from another test');

const script = workerData;
const fn = pyval(script);
fn.callAsync(4.2).then((result) => {
  parentPort.postMessage(result.toJS());
});
