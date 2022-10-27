# pymport

Use Python libraries from Node.js

# Installation

## Fully self-contained package (easier install)

This is supported only on Windows x64, Linux x64 and macOS x64.

```shell
npm i pymport
```

This will install the pre-built `pymport` binaries and a self-contained Python 3.10 environment.

You should use `pympip3` (or `npx pympip3` if `node_modules/.bin` is not in your `PATH`) to install packages into this environment. Running `pympip3 show pip` will show you where these packages live.

`pympip3` is simply a redirection to `node_modules/pymport/lib/binding/<platform>/python -m pip`.

## Using an existing Python environment (more compatible and more robust)

```shell
npm i pymport --build-from-source
```

This will download and rebuild `pymport` against your own already existing Python environment.

You will need a working `node-gyp` supported C++ development environment. Additionally, on Linux you will need the `libpython3-dev` package. On macOS the Homebrew install has everything required. On Windows you should have a working `python` command in your shell.

`node-gyp` has first class support for `g++` on Linux, `clang` on macOS and MSVC 2019 on Windows.
It also has a somewhat lower grade support for `clang` on Linux and on Windows.

## Using an existing Python environment without rebuilding from source (risky)

This is valid on all OS, but it concerns mostly Windows users without a working C++ environment.

After installing the self-contained package, you can set the `PYTHONHOME`/`PYTHONPATH` variables to point Python to your existing environment. This requires Python 3.10, as Python libraries are not compatible across different versions.

# Usage

## Basic Principle

All Python objects co-exist with the JavaScript objects. The Python GC manages the Python objects, the V8 GC manages the JS objects. The Python GC cannot free Python objects while they are referenced by a JavaScript object.

Python objects have a `PyObject` type in JavaScript. When calling a Python function, input JavaScript arguments are automatically converted. Automatic conversion to JavaScript is possible if the context permits it through `valueOf` and `Symbol.toPrimitive`. In all other cases, an explicit conversion, using `fromJS()`/`toJS()` is needed.

An additional _(and optional)_ convenience layer, `pymport.proxify`, allows wrapping a `PyObject` in a JavaScript `Proxy` object that creates the illusion of directly accessing the `PyObject` from JavaScript.

At the moment, Python code does not have access to the JavaScript objects - this requires the implementation of a similar `JSObject` type on the Python side. All JavaScript arguments are passed to Python by value. `PyObject`s are passed by reference. See the lambda examples below to get a feeling how it works.

`pymport` itself supports `worker_thread` but does not provide any locking. Unlike Node.js, Python threads share the same single environment and `PyObject`s will be shared among all threads.

## Examples

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
// np is a JS proxy object
const np = proxify(pymport("numpy"));

// Python: a = np.arange(15).reshape(3, 5)
// a is a JS proxy object
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
// In pymport item is a shortcut for __getitem__
const df2 = df.item(PyObject.slice([2, 3, null]));
assert.deepEqual(df2.values.tolist().toJS(), [[6, 7, 8]]);

// df[df["C"] <= 3]
// In Python this is equivalent to df.__getitem__(df.__getitem__("C").__le__(3))
const df3 = df.item(df.item("C").__le__(3));
assert.deepEqual(df3.values.tolist().toJS(), [[0, 1, 2]]);
```

Inline Python is supported through `pyval` (Python `eval`):

```js
// fn is a PyObject
const fn = pyval("lambda x: (x + 42)");

assert.instanceOf(fn, PyObject);
assert.isTrue(fn.callable);
assert.strictEqual(fn.call(-42).toJS(), 0);

// with eval arguments
// (this is not a real closure as Python still does not
// have access to the JS objects - this will produce a
// Python copy of the variable x)
const array = pyval("list([1, x, 3])", { x: 4 });
assert.instanceOf(array, PyObject);
assert.deepEqual(array.toJS(), [1, 4, 3]);

// The same with a PyObject
// In this case the expression is a real closure
// x will be passed by reference in the globals of the lambda
const x = PyObject.fromJS(4);
const lambda = pyval("lambda y: (y + x)", { x });
assert.strictEqual(lambda.call(-4).toJS(), 0);

// Modules can be passed too
const np = pymport("numpy");
const py_array = pyval("np.array([2, 1, 0]).tolist()", { np });
assert.instanceOf(py_array, PyObject);
assert.deepEqual(py_array.toJS(), [2, 1, 0]);
```

# Performance Notes / Known Issues

- Simply calling into Python is only slightly more expensive than from the native Python interpreter
  - If working on `numpy` arrays of 1 element, the difference can be significant
  - Above a few dozen elements, the difference should be barely noticeable
  - When chaining `numpy` functions there should be almost no impact
- `fromJS()` and `toJS()` are expensive functions that deep copy the data between the V8 and the Python heap
- The two GCs should work well in tandem as for every object there is exactly one of them that can free it
- Currently the V8 GC vastly underestimates the memory size of the `PyObject`s and may be reluctant to free them (this is to be improved soon)
  - If Python allocates most of the memory, V8 will not be aware and this can even lead to thrashing in the most extreme cases
- Python objects of type function never expire, so you will be leaking memory if you create Python lambdas in a loop

# Future Plans

- `Buffer` <-> `bytes[]` equivalence
- `TypedArray` <-> `array` equivalence
- Improved memory management in V8 of Python objects (currently their memory size is not being tracked)
- More features allowing direct interaction with `PyObject`s from JS
- (longer term) Asynchronous calling / Promises on the JS side vs multi-threading on the Python side
- (longer term) Generate TypeScript bindings from the Python modules

# API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

- [PyObject](#pyobject)
  - [callable](#callable)
  - [type](#type)
  - [length](#length)
  - [get](#get)
    - [Parameters](#parameters)
  - [has](#has)
    - [Parameters](#parameters-1)
  - [item](#item)
    - [Parameters](#parameters-2)
  - [call](#call)
    - [Parameters](#parameters-3)
  - [toJS](#tojs)
  - [valueOf](#valueof)
  - [toString](#tostring)
  - [int](#int)
    - [Parameters](#parameters-4)
  - [float](#float)
    - [Parameters](#parameters-5)
  - [string](#string)
    - [Parameters](#parameters-6)
  - [dict](#dict)
    - [Parameters](#parameters-7)
  - [list](#list)
    - [Parameters](#parameters-8)
  - [tuple](#tuple)
    - [Parameters](#parameters-9)
  - [slice](#slice)
  - [fromJS](#fromjs)
    - [Parameters](#parameters-10)
- [pymport](#pymport)
  - [Parameters](#parameters-11)
- [proxify](#proxify)
  - [Parameters](#parameters-12)
- [pyval](#pyval)
  - [Parameters](#parameters-13)

## PyObject

JavaScript representation of a Python object

### callable

Is the property callable

Type: boolean

### type

The underlying Python type

Type: string

### length

Length of the underlying object if it is defined

Type: (number | undefined)

### get

Get a property from the object

Type: function (name: string): [PyObject](#pyobject)

#### Parameters

- `name` **string** property name

Returns **[PyObject](#pyobject)**&#x20;

### has

Check if a property exists

Type: function (name: string): boolean

#### Parameters

- `name` **string** property name

Returns **boolean**&#x20;

### item

Retrieve an element by index, equivalent to Python subscript operator\[]

Type: function (index: any): [PyObject](#pyobject)

#### Parameters

- `index` **any** index

Returns **boolean**&#x20;

### call

Call a callable property from the object

Type: function (...args: Array\<any>): [PyObject](#pyobject)

#### Parameters

- `args` **...Array\<any>** function arguments

Returns **[PyObject](#pyobject)**&#x20;

### toJS

Transform the PyObject to a plain JS object. Equivalent to valueOf().

Type: function (): any

Returns **any**&#x20;

### valueOf

Transform the PyObject to a plain JS object. Equivalent to toJS().

Type: function (): any

Returns **any**&#x20;

### toString

Use the Python str() built-in on the object

Type: function (): string

Returns **string**&#x20;

### int

Construct a PyObject integer from a JS number

Type: function (v: number): [PyObject](#pyobject)

#### Parameters

- `number` **number**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### float

Construct a PyObject float from a JS number

Type: function (v: number): [PyObject](#pyobject)

#### Parameters

- `number` **number**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### string

Construct a PyObject string from a JS string

Type: function (v: string): [PyObject](#pyobject)

#### Parameters

- `string` **string**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### dict

Construct a PyObject dictionary from a JS object

Type: function (v: Record\<string, any>): [PyObject](#pyobject)

#### Parameters

- `object` **Record\<string, any>**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### list

Construct a PyObject list from a JS array

Type: function (v: Array\<any>): [PyObject](#pyobject)

#### Parameters

- `array` **Array\<any>**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### tuple

Construct a PyObject tuple from a JS array

Type: function (v: Array\<any>): [PyObject](#pyobject)

#### Parameters

- `array` **Array\<any>**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### slice

Construct a PyObject slice from three elements (start, stop, step)

Type: function (v: any): [PyObject](#pyobject)

Returns **[PyObject](#pyobject)**&#x20;

### fromJS

Construct an automatically typed PyObject from a plain JS value

Type: function (v: any): [PyObject](#pyobject)

#### Parameters

- `value` **any**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

## pymport

Import a Python module

### Parameters

- `name` **string** Python module name

Returns **[PyObject](#pyobject)**&#x20;

## proxify

Create a profixied version of a PyObject
that works like a native Python object

### Parameters

- `v` **[PyObject](#pyobject)**&#x20;
- `name` **string?** optional name to be assigned to a proxified function
- `object` **[PyObject](#pyobject)** object to proxify

Returns **any**&#x20;

## pyval

Eval a Python fragment

### Parameters

- `code` **string**&#x20;
- `globals` **([PyObject](#pyobject) | Record\<string, any>)?** Optional global context
- `locals` **([PyObject](#pyobject) | Record\<string, any>)?** Optional local context
- `name` **string** Python module name

Returns **[PyObject](#pyobject)**&#x20;

# Alternatives

There is an alternative package that is more mature but with slightly different target use called [`node-calls-python`](https://github.com/hmenyus/node-calls-python).

`node-calls-python` is geared towards calling large monolithic Python subroutines. It supports asynchronous calling as it is expected that those will take significant amount of CPU time. `node-calls-python` does type conversions on each call.

`pymport` is geared towards intensive use of Python libraries in Node.js. It may support asynchronous calling in the future. The main difference is that `pymport` keeps the `PyObject` objects visible in JavaScript. For example, it allows creating a `numpy` array, then using the various `numpy` methods without converting the array back to JavaScript.
