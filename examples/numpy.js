// JS versions of the basic examples from https://numpy.org/doc/stable/user/quickstart.html
const { pymport, proxify } = require('pymport');
const np = proxify(pymport('numpy'));

console.log('Array Creation');
{
  const a = np.array([2, 3, 4]);
  console.log(a.toString());
  console.log(a.dtype.toString());
  const b = np.array([1.2, 3.5, 5.1]);
  console.log(b.dtype.toString());
}

{
  const b = np.array([[1.5, 2, 3], [4, 5, 6]]);
  console.log(b.toString());

  // No complex numbers in JS
}

{
  console.log(np.zeros([3, 4]).toString());
  console.log(np.ones([2, 3, 4]).toString());
  console.log(np.empty([2, 3]).toString());
}

{
  console.log(np.arange(10, 30, 5).toString());
  console.log(np.arange(0, 2, 0.3).toString());
}

{
  console.log(np.linspace(0, 2, 9).toString());
  const x = np.linspace(0, 2 * np.pi, 100);
  console.log(np.sin(x).toString());
}

console.log('Printing Arrays');
{
  const a = np.arange(6);
  console.log(a.toString());

  const b = np.arange(12).reshape(4, 3);
  console.log(b.toString());

  const c = np.arange(24).reshape(2, 3, 4);
  console.log(c.toString());

  console.log(np.arange(10000).toString());
  console.log(np.arange(10000).reshape(100, 100).toString());
}

console.log('Basic Operations');
const op = proxify(pymport('operator'));
{

  const a = np.array([20, 30, 40, 50]);
  const b = np.arange(4);
  console.log(b.toString());

  // c = a - b
  const c = op.sub(a, b);

  console.log(c.toString());

  // print(b ** 2)
  console.log(op.pow(b, 2).toString());

  // print(10 * np.sin(a))
  console.log(op.mul(10, np.sin(a)).toString());

  // print(a < 35)
  console.log(op.lt(a, 35).toString());

  const A = np.array([[1, 1], [0, 1]]);
  const B = np.array([[2, 0], [3, 4]]);

  // print(A * B)
  console.log(op.mul(A, B).toString());

  // print(A @ B)
  console.log(op.matmul(A, B).toString());

  // print(A.dot(B))
  console.log(A.dot(B).toString());
}

const rg = np.random.default_rng(1);
{
  const a = np.ones([2, 3], { dtype: np.int32 });
  const b = rg.random([2, 3]);

  // a *= 3
  op.imul(a, 3);
  console.log(a.toString());

  // b += a
  op.iadd(b, a);
  console.log(b.toString());

  try {
    // a += b -> it throws
    op.iadd(a, b);
  } catch (e) {
    console.warn(e);
  }
}

{
  const a = np.ones(3, { dtype: np.int32 });
  const b = np.linspace(0, np.pi, 3);
  console.log(b.dtype.name.toJS());
  const c = op.add(a, b);
  console.log(c.toString());
  console.log(c.dtype.name.toJS());

  // No complex numbers in JS
}

{
  const a = rg.random([2, 3]);
  console.log(a.toString());

  // a.sum() is a PyObject (Python reference) that contains a float
  // a.sum().toJS() is a JS number
  console.log(a.sum().toJS());
  console.log(a.min().toJS());
  console.log(a.max().toJS());
}

{
  const b = np.arange(12).reshape(3, 4);
  console.log(b.toString());

  // print(b.sum(axis=0))
  console.log(b.sum({ axis: 0 }).toString());

  // print(b.min(axis=1))
  console.log(b.min({ axis: 1 }).toString());

  console.log(b.cumsum({ axis: 1 }).toString());
}

console.log('Universal Functions');
{
  const B = np.arange(3);
  console.log(B.toString());
  console.log(np.exp(B).toString());
  console.log(np.sqrt(B).toString());
  const C = np.array([2, -1, 4], { dtype: np.float64 });
  console.log(np.add(B, C).toString());
}

const PyObject = require('pymport').PyObject;
console.log('Indexing, Slicing and Iterating');
{
  const a = op.pow(np.arange(10), 3);
  console.log(a.toString());
  console.log(a.item(2).toJS());

  // These twos are equivalent (a[2:5] in Python)
  console.log(op.getitem(a, PyObject.slice({ start: 2, stop: 5 })).toString());
  console.log(a.__getitem__(PyObject.slice({ start: 2, stop: 5 })).toString());

  a.__setitem__(PyObject.slice({ stop: 6, step: 2 }), 1000);
  console.log(a.toString());

  // a[::-1]  # reversed a
  console.log(a.__getitem__(PyObject.slice({ step: -1 })).toString());

  // numpy arrays are directly iterable in JavaScript
  // every element is a PyObject
  for (const i of a) {
    console.log(op.pow(i, 1 / 3).toString());
  }
}

{
  // Don't forget that this function will receive PyObject arguments
  const f = (x, y) => op.add(op.mul(10, x), y);

  const b = np.fromfunction(f, [5, 4], { dtype: np.int32 });
  console.log(b.toString());

  // b[2, 3] -> (2, 3) is a tuple which is a single argument to operator[]
  console.log(b.__getitem__(PyObject.tuple([2, 3])).toString());

  // b[0:5, 1]
  console.log(b.__getitem__(PyObject.tuple([PyObject.slice({ start: 0, stop: 5 }), 1])).toString());

  // b[-1]
  console.log(b.__getitem__(-1).toString());
}
