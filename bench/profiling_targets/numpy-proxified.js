const { pymport, proxify } = require('../..');

const np = proxify(pymport('numpy'));
const size = 100;

let b = 0;
for (let i = 0; i < 1000; i++) {
  const a = np.matmul(np.arange(size * size * 2).reshape([size, size * 2]).T,
    np.arange(size * size * 2).reshape([size, size * 2]));
  b += np.average(a).get('item')().toJS();
}
return b;
