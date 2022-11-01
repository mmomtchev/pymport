# pymport

Use Python libraries from Node.js

[![ISC](https://img.shields.io/github/license/mmomtchev/pymport)](https://github.com/mmomtchev/pymport/blob/main/LICENSE)
[![Test npm package](https://github.com/mmomtchev/pymport/actions/workflows/test-package.yml/badge.svg)](https://github.com/mmomtchev/pymport/actions/workflows/test-package.yml)
[![Node.js CI](https://github.com/mmomtchev/pymport/actions/workflows/test-dev.yml/badge.svg)](https://github.com/mmomtchev/pymport/actions/workflows/test-dev.yml)
[![npm](https://img.shields.io/npm/v/pymport)](https://www.npmjs.com/package/pymport)
[![codecov](https://codecov.io/gh/mmomtchev/pymport/branch/main/graph/badge.svg?token=pNeJl1Zhmw)](https://codecov.io/gh/mmomtchev/pymport)

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

An additional *(and optional)* convenience layer, `pymport.proxify`, allows wrapping a `PyObject` in a JavaScript `Proxy` object that creates the illusion of directly accessing the `PyObject` from JavaScript.

At the moment, Python code does not have access to the JavaScript objects - this requires the implementation of a similar `JSObject` type on the Python side. All JavaScript arguments are passed to Python by value. `PyObject`s are passed by reference. See the lambda examples below to get a feeling how it works.

`pymport` itself supports `worker_thread` but does not provide any locking. Unlike Node.js, Python threads share the same single environment and `PyObject`s will be shared among all threads.

## Examples

You can directly use the raw `PyObject` object and call `get`/`call` each time you need to access a Python attribute or call a Python function:

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
// (if the last argument is a plain JS object, it is considered a kwargs argument)
const b = np.get("ones").call([2, 3], { dtype: np.get("int16") });

// Python: print(a.tolist())
// PyObject.toJS() converts to JS
console.log(a.get("tolist").call().toJS());
```

Or you can use `proxify` to create a JS `Proxy`:

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
// (if the last argument is a plain JS object, it is considered a kwargs argument)
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

Inline Python is supported through `pyval` (using Python `eval` - note that it expects a Python expression and not a Python statement):

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

Direct conversion of the Python module object itself to a JavaScript object is supported too, but this is the least compatible mode, as some Python constructs cannot be expressed in JS:

```js
// np is a plain JS object whose properties are the numpy methods
const np = pymport("numpy").toJS();
const a = np.arange(15).reshape(3, 5);
```

Generally, `proxify` is the best way to use `pymport`.

# Architecture Overview

![Architecture Overview](https://raw.githubusercontent.com/mmomtchev/pymport/main/overview.svg)

# Performance Notes / Known Issues

*   Simply calling into Python is more expensive than from the native Python interpreter
    *   If working on `numpy` arrays of less than 10 elements, the difference can be very significant (up to 4 times)
    *   `proxify`ed objects have a small additional overhead that, for all practical reasons, can be ignored
    *   Above a few hundred elements, the difference gradually becomes smaller
    *   With very large arrays and very complex operations, Node.js can very slightly outperform stock Python
        *Large `numpy` arrays are very dependent on the memory allocator and Node.js/V8 has an outstanding memory allocator*
*   `fromJS()` and `toJS()` are expensive functions that deep copy the data between the V8 and the Python heap
*   The two GCs should work well in tandem as for every object there is exactly one of them that can free it
*   In 1.0 the V8 GC does not take into account the memory held by a `PyObject`s when deciding if they should be GCed or when the heap limit has been reached
*   In (*upcoming*) 1.1 the V8 GC takes into account the memory held by a `PyObject` when it is initially referenced in JS but not its eventual growth after being referenced
*   In 1.0 Python objects of type function never expire, so you will be leaking memory if you create Python lambdas in a loop (fixed in 1.1)

# Supported Versions

`pymport` is unit-tested on all combinations of:

| Platforms | Windows x64, Linux x64 and macOS x64 |
| --------- | ------------------------------------ |
| Node.js   | 14.x, 16.x and 18.x                  |
| Python    | 3.8, 3.9, 3.10 and 3.11              |

# Future Plans

*   Passing of JavaScript callbacks to Python
*   More features allowing direct interaction with `PyObject`s from JS
*   (longer term) Asynchronous calling / Promises on the JS side vs multi-threading on the Python side
*   (longer term) Generate TypeScript bindings from the Python modules

# API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

*   [getJSType](#getjstype)
    *   [Parameters](#parameters)
*   [getPythonType](#getpythontype)
    *   [Parameters](#parameters-1)
*   [toTypedArray](#totypedarray)
    *   [Parameters](#parameters-2)
*   [toPythonArray](#topythonarray)
    *   [Parameters](#parameters-3)
*   [PyObject](#pyobject)
    *   [callable](#callable)
    *   [type](#type)
    *   [length](#length)
    *   [get](#get)
        *   [Parameters](#parameters-4)
    *   [has](#has)
        *   [Parameters](#parameters-5)
    *   [item](#item)
        *   [Parameters](#parameters-6)
    *   [call](#call)
        *   [Parameters](#parameters-7)
    *   [toJS](#tojs)
    *   [valueOf](#valueof)
    *   [toString](#tostring)
    *   [int](#int)
        *   [Parameters](#parameters-8)
    *   [float](#float)
        *   [Parameters](#parameters-9)
    *   [string](#string)
        *   [Parameters](#parameters-10)
    *   [dict](#dict)
        *   [Parameters](#parameters-11)
    *   [list](#list)
        *   [Parameters](#parameters-12)
    *   [tuple](#tuple)
        *   [Parameters](#parameters-13)
    *   [slice](#slice)
    *   [bytes](#bytes)
        *   [Parameters](#parameters-14)
    *   [bytearray](#bytearray)
        *   [Parameters](#parameters-15)
    *   [memoryview](#memoryview)
        *   [Parameters](#parameters-16)
    *   [fromJS](#fromjs)
        *   [Parameters](#parameters-17)
    *   [keys](#keys)
    *   [values](#values)
*   [pymport](#pymport)
    *   [Parameters](#parameters-18)
*   [proxify](#proxify)
    *   [Parameters](#parameters-19)
*   [pyval](#pyval)
    *   [Parameters](#parameters-20)
*   [version](#version)
*   [version](#version-1)
    *   [pythonRuntime](#pythonruntime)
*   [PythonError](#pythonerror)

## getJSType

Get the TypedArray constructor that corresponds to the Python array.array object.

### Parameters

*   `array` **[PyObject](#pyobject)** Python array.array

Returns **ArrayConstructor**&#x20;

## getPythonType

Get the Python letter code that corresponds to the TypedArray object.

### Parameters

*   `array` **ArrayBuffer** TypedArray

Returns **string**&#x20;

## toTypedArray

Convert the Python array.array to JS TypedArray. The array contents are copied.

### Parameters

*   `array` **[PyObject](#pyobject)** Python array.array

Returns **ArrayBuffer**&#x20;

## toPythonArray

Convert the TypedArray to Python array.array. The array contents are copied.

### Parameters

*   `array` **ArrayBuffer** TypedArray

Returns **[PyObject](#pyobject)**&#x20;

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

Get a property from the object, equivalent to Python member operator .

Type: function (name: string): [PyObject](#pyobject)

#### Parameters

*   `name` **string** property name

Returns **[PyObject](#pyobject)**&#x20;

### has

Check if a property exists

Type: function (name: string): boolean

#### Parameters

*   `name` **string** property name

Returns **boolean**&#x20;

### item

Retrieve an element by index, equivalent to Python subscript operator\[]

Type: function (index: any): [PyObject](#pyobject)

#### Parameters

*   `index` **any** index

Returns **boolean**&#x20;

### call

Call a callable property from the object

Type: function (...args: Array\<any>): [PyObject](#pyobject)

#### Parameters

*   `args` **...Array\<any>** function arguments

Returns **[PyObject](#pyobject)**&#x20;

### toJS

Transform the PyObject to a plain JS object. Equivalent to valueOf().

A float becomes a Number.

An int becomes a Number if it is in the safe integer number range or a BigInt otherwise.

A bool becomes a bool.

None becomes null.

An unicode string becomes a string.

A list or a tuple become an array.

A dictionary becomes an object.

Any object implementing the Buffer Protocol - bytes, bytearray or a memoryview - becomes a Buffer.
The memory referenced by the Buffer is a copy of the Python memory.

A callable becomes a native (binary) function.

A module becomes an object.

Everything else remains a PyObject.

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

Type: function (v: (number | bigint)): [PyObject](#pyobject)

#### Parameters

*   `number` **number**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### float

Construct a PyObject float from a JS number

Type: function (v: number): [PyObject](#pyobject)

#### Parameters

*   `number` **number**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### string

Construct a PyObject string from a JS string

Type: function (v: string): [PyObject](#pyobject)

#### Parameters

*   `string` **string**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### dict

Construct a PyObject dictionary from a JS object

Type: function (v: Record\<string, any>): [PyObject](#pyobject)

#### Parameters

*   `object` **Record\<string, any>**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### list

Construct a PyObject list from a JS array

Type: function (v: Array\<any>): [PyObject](#pyobject)

#### Parameters

*   `array` **Array\<any>**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### tuple

Construct a PyObject tuple from a JS array

Type: function (v: Array\<any>): [PyObject](#pyobject)

#### Parameters

*   `array` **Array\<any>**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### slice

Construct a PyObject slice from three elements (start, stop, step)

Type: function (v: any): [PyObject](#pyobject)

Returns **[PyObject](#pyobject)**&#x20;

### bytes

Construct a PyObject bytes from a Buffer. The resulting object is a copy.

Type: function (v: any): [PyObject](#pyobject)

#### Parameters

*   `buffer` **Buffer**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### bytearray

Construct a PyObject bytearray from a Buffer. The resulting object is a copy.

Type: function (v: any): [PyObject](#pyobject)

#### Parameters

*   `buffer` **Buffer**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### memoryview

Construct a PyObject memoryview from a Buffer.
The resulting object references directly the Buffer.
The Buffer is guaranteed to stay in memory for as long as the memoryview exists.
This is the only case in which V8 objects can be held by the Python GC.

Type: function (v: any): [PyObject](#pyobject)

#### Parameters

*   `buffer` **Buffer**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### fromJS

Construct an automatically typed PyObject from a plain JS value.
The PyObject is a copy by value unless explicitly mentioned.

A number becomes an int when it has no decimal part or a float when it has one.

A BigInt becomes an int.

A bool becomes a bool.

Undefined and null become None.

A string becomes an unicode string.

An array becomes a list.

An object becomes a dictionary.

A PyObject or a proxified PyObject is always passed by reference and reverts to its Python type.

A Buffer becomes a bytearray.

Type: function (v: any): [PyObject](#pyobject)

#### Parameters

*   `value` **any**&#x20;

Returns **[PyObject](#pyobject)**&#x20;

### keys

Retrieve a list with the keys of the dictionary, equivalent to JS Object.keys()

Type: function (obj: [PyObject](#pyobject)): [PyObject](#pyobject)

Returns **[PyObject](#pyobject)**&#x20;

### values

Retrieve a list with the values of the dictionary, equivalent to JS Object.values()

Type: function (obj: [PyObject](#pyobject)): [PyObject](#pyobject)

Returns **[PyObject](#pyobject)**&#x20;

## pymport

Import a Python module.

Default search location is determined by the Python interpreter library.
It can be overridden by setting the PYTHONPATH environment variable.

If you want to load a Python file in the same directory as the calling JS you can use

process.env\['PYTHONPATH'] = \_\_dirname

before importing pymport - once Python has been initialized further modifications
will have no effect.

### Parameters

*   `name` **string** Python module name

Returns **[PyObject](#pyobject)**&#x20;

## proxify

Create a profixied version of a PyObject that works like a native Python object.
All values returned by its methods will also be profixied.

### Parameters

*   `v` **[PyObject](#pyobject)**&#x20;
*   `name` **string?** optional name to be assigned to a proxified function
*   `object` **[PyObject](#pyobject)** object to proxify

Returns **any**&#x20;

## pyval

Eval a Python fragment. Uses Python `eval` which is a special language context.
The Python code must be an expression that evaluates to a value and not a statement.
Refer to the Python documentation for more information on what is allowed in this context.
If you need to execute statements, you should place them in a file and load it as a module.

### Parameters

*   `code` **string** Python code
*   `globals` **([PyObject](#pyobject) | Record\<string, any>)?** Optional global context
*   `locals` **([PyObject](#pyobject) | Record\<string, any>)?** Optional local context

Returns **[PyObject](#pyobject)**&#x20;

## version

Hex number

Type: string

## version

Version information

Type: {pymport: {major: number, minor: number, patch: number, suffix: string}, pythonLibrary: {builtin: boolean, major: number, minor: number, micro: number, release: number, serial: number, version: string}, pythonRuntime: (null | string), pythonHome: string}

### pythonRuntime

Supported only on Python 3.11+

Type: (null | string)

## PythonError

Errors thrown from Python have a `pythonTrace` property that contains the Python traceback

Type: any

# Alternatives

There is an alternative package that is more mature but with slightly different target use called [`node-calls-python`](https://github.com/hmenyus/node-calls-python).

`node-calls-python` is geared towards calling large monolithic Python subroutines. It supports asynchronous calling as it is expected that those will take significant amount of CPU time. `node-calls-python` does type conversions on each call.

`pymport` is geared towards intensive use of Python libraries in Node.js. It may support asynchronous calling in the future. The main difference is that `pymport` keeps the `PyObject` objects visible in JavaScript. For example, it allows creating a `numpy` array, then using the various `numpy` methods without converting the array back to JavaScript.
