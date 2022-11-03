const { pymport, proxify } = require('../..');

const np = proxify(pymport('numpy'));
const size = 100;

async function run() {
  return new Promise((resolve) => {
    setImmediate(() => {
      const a = np.matmul(np.arange(size * size * 2).reshape([size, size * 2]).T,
        np.arange(size * size * 2).reshape([size, size * 2]));
      resolve(np.average(a).item().toJS());
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
