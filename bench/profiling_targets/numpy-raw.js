const { pymport } = require('../..');

const np = pymport('numpy');
const size = 100;

const matmul = np.get('matmul');
const arange = np.get('arange');
const average = np.get('average');

async function run() {
  return new Promise((resolve) => {
    setImmediate(() => {
      const a = matmul.call(arange.call(size * size * 2).get('reshape').call([size, size * 2]).get('T'),
        arange.call(size * size * 2).get('reshape').call([size, size * 2]));
      resolve(average.call(a).get('item').call().toJS());
    });
  });
}


(async () => {
  let b = 0;
  for (let i = 0; i < 10000; i++) {
    b += await run();
  }
  return b;
})().then(r => console.log(r));
