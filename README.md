# pymport

Use Python libraries from Node.js

# Status

Not ready

# Usage

Without module conversion

```js
// import numpy as np
const np = pymport("numpy"); // np is a PyObject

// a = np.arange(15).reshape(3, 5)
const a = np.get("arange").call(15).get("reshape").call(3, 5); // a is a PyObject

// print(a.tolist())
console.log(a.get("tolist").call().toJS()); // PyObject.toJS() converts to JS
```

With module conversion

```js
const np = pymport("numpy").toJS(); // np is a normal JS object;

const a = np.arange(15); // a is a PyObject

console.log(a.get("tolist").call().toJS());
```

# Alternatives

There is an alternative package that is more mature but with slightly different target use called [`node-calls-python`](https://github.com/hmenyus/node-calls-python).

`node-calls-python` is geared towards calling large monolithic Python subroutines. It supports asynchronous calling as it is expected that those will take significant amount of CPU time. `node-calls-python` does type conversions on each call.

`pymport` is geared towards intensive use of Python libraries in Node.js. It may support asynchronous calling in the future. `pymport` keeps the `PyObject` objects visible in JavaScript. For example, it allows creating a `numpy` array, then using various `numpy` methods without converting the array back to JavaScript.
