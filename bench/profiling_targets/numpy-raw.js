const { pymport } = require('../..');

const np = pymport('numpy');
const size = 100;

let b = 0;
const matmul = np.get('matmul');
const arange = np.get('arange');
const average = np.get('average');
for (let i = 0; i < 100000; i++) {
  const a = matmul.call(arange.call(size * size * 2).get('reshape').call([size, size * 2]).get('T'),
    arange.call(size * size * 2).get('reshape').call([size, size * 2]));
  b += average.call(a).get('item').call().toJS();
}
return b;
