# pymport

Use Python libraries from Node.js

# Status

Not ready

# Usage

Directly use the raw `PyObject` object:

```js
import { pymport } from "pymport";

// Python: import numpy as np
// np is a PyObject
const np = pymport("numpy");

// Python: a = np.arange(15).reshape(3, 5)
// a is a PyObject
const a = np.get("arange").call(15).get("reshape").call(3, 5);

// Python: a = np.ones((2, 3), dtype=int16)
// np.get('int16') is a PyObject
const b = np.get("ones").call([2, 3], { dtype: np.get("int16") });

// Python: print(a.tolist())
// PyObject.toJS() converts to JS
console.log(a.get("tolist").call().toJS());
```

With `proxify`:

```js
import { pymport, proxify } from "pymport";

// Python: import numpy as np
// np is a normal JS object
const np = proxify(pymport("numpy"));

// Python: a = np.arange(15).reshape(3, 5)
// a is a PyObject
const a = np.arange(15).reshape(3, 5);

// Python: a = np.ones((2, 3), dtype=int16)
// np.int16 is a callable PyFunction
const b = np.ones([2, 3], { dtype: np.int16 });

console.log(a.tolist().toJS());
```

Even the most perverted pandas syntax can be expressed:

```js
// df = pd.DataFrame(np.arange(15).reshape(5, 3), columns=list(['ABC']) })
const df = pd.DataFrame(np.arange(15).reshape(5, 3), {
  columns: PyObject.list(["A", "B", "C"]),
});
assert.deepEqual(df.columns.tolist().toJS(), ["A", "B", "C"]);

// df[2:3]
// In Python this is equivalent to df.__getitem__(2:3)
const df2 = df.__getitem__(PyObject.slice([2, 3, null]));
assert.deepEqual(df2.values.tolist().toJS(), [[6, 7, 8]]);

// df[df["C"] <= 3]
// In Python this is equivalent to df.__getitem__(df.__getitem__("C").__le__(3))
const df3 = df.__getitem__(df.__getitem__("C").__le__(3));
assert.deepEqual(df3.values.tolist().toJS(), [[0, 1, 2]]);
```

# Alternatives

There is an alternative package that is more mature but with slightly different target use called [`node-calls-python`](https://github.com/hmenyus/node-calls-python).

`node-calls-python` is geared towards calling large monolithic Python subroutines. It supports asynchronous calling as it is expected that those will take significant amount of CPU time. `node-calls-python` does type conversions on each call.

`pymport` is geared towards intensive use of Python libraries in Node.js. It may support asynchronous calling in the future. The main difference is that `pymport` keeps the `PyObject` objects visible in JavaScript. For example, it allows creating a `numpy` array, then using the various `numpy` methods without converting the array back to JavaScript.
