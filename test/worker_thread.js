/* eslint-disable @typescript-eslint/no-var-requires */
const { pyval } = require('pymport');
const { parentPort, workerData } = require('worker_threads');

if (!parentPort) throw new Error('This worker must be spawned from another test');

const script = workerData;

const result = pyval(script);
parentPort.postMessage(result.toJS());
