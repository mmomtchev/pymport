const b = require('benny');
const { pymport, proxify } = require('..');

const np = pymport('numpy');
const proxified = proxify(np);

const py_fn = proxify(pymport('pyth00')).fn;

const js_proxified_fn = new Function('np', 'size', `
  let b = 0;
  for (let i = 0; i < 100; i++) {
    const a = np.matmul(np.arange(size * size * 2).reshape([size, size * 2]).T,
      np.arange(size * size * 2).reshape([size, size * 2]));
    b += np.average(a).item().toJS();
  }
  return b;
`);

const js_fn = new Function('np', 'size', `
  let b = 0;
  for (let i = 0; i < 100; i++) {
    const a = np.get('matmul').call(np.get('arange').call(size * size * 2)
        .get('reshape').call([size, size * 2]).get('T'),
      np.get('arange').call(size * size * 2).get('reshape').call([size, size * 2]));
    b += np.get('average').call(a).get('item').call().toJS();
  }
  return b;
`);

module.exports = function (size) {
  return b.suite(
    `100 mul/100 reduce, arrays of ${size}x${size * 2} elements`,

    b.add('inline Python', () => {
      py_fn(np, size);
    }),
    b.add('Node.js proxified', () => {
      js_proxified_fn(proxified, size);
    }),
    b.add('Node.js raw', () => {
      js_fn(np, size);
    }),
    b.cycle(),
    b.complete()
  );
};
