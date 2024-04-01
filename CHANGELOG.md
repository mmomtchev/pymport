# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### [1.5.1] 2024-04-01
 - Fix the build with recent Node.js versions after `node_api_nogc_env` in Node.js 18.20

## [1.5.0] 2024-02-08
 - Add Python 3.12 support and upgrade the built-in Python to 3.12.2
 - Drop Node.js 14 support

### [1.4.3] 2023-10-29
 - Fix [#104](https://github.com/mmomtchev/pymport/issues/104), do not mess up the loading of additional binary modules after `pymport`

### [1.4.2] 2023-08-28
 - Builtin Python updated to 3.12.2

### [1.4.1] 2023-05-01
 - Node.js 20 support
 - Builtin Python updated to 3.10.11
 - Fix [#78], a single `Buffer` argument is interpreted as `kwargs`

## [1.4.0] 2023-01-22
 - The new minimum supported versions of Node.js are now v12.22.0, v14.17.0, v16.0.0

#### New Features
 - Allow limiting the depth of the recursion of `toJS()`
 - Allow disabling of the generic Buffer protocol transformation to `toJS()`
 - Add `PyObject.prototype.map` method compatible with `Array.prototype.map`
 - Proxified functions are now also `Proxy` objects, resolves [#58](https://github.com/mmomtchev/pymport/issues/58)
 - `PyObject.item()` now returns `undefined` instead of throwing an exception when an element cannot be retrieved by `[]`
 - Allow enabling of debug output via the environment (`PYMPORT_DEBUG_sys` vars)
 - Improved bootstrap and shutdown allowing to load and unload the addon in `worker_threads`, partially resolves [#69](https://github.com/mmomtchev/pymport/issues/69)

#### Bug Fixes
 - Fix [#66](https://github.com/mmomtchev/pymport/issues/66), race condition can result in an abort when using `pymport` with `worker_threads`
 - Fix [#40](https://github.com/mmomtchev/pymport/issues/40), patch `_sysconfigdata` after installation
 - Fix [#70](https://github.com/mmomtchev/pymport/issues/70), random crash in a `worker_thread`
 - Fix [#69](https://github.com/mmomtchev/pymport/issues/69), `pymport` leaks TLS memory when used in a `worker_thread`

### [1.3.1] 2023-01-07

 - Fix [#63](https://github.com/mmomtchev/pymport/issues/63), restore the executable bit of `pympip3`
 - Fix [#40](https://github.com/mmomtchev/pymport/issues/40), revert and lock `setuptools` for the builtin interpreter to 65.1.1 due to [setuptools#3589](https://github.com/pypa/setuptools/issues/3589)
 - Fix [#60](https://github.com/mmomtchev/pymport/issues/60), proxified objects are not GCed
 - Fix [#48](https://github.com/mmomtchev/pymport/issues/48), do not consider falsy properties as being undefined
 - Fix [#50](https://github.com/mmomtchev/pymport/issues/50), proxified `.toString()` is not identical to `PyObject.toString()`

## [1.3.0] 2022-12-22

#### New Features
 - Builtin Python 3.10.9
 - Multithreading safety
 - `callAsync` method allowing asynchronous calling of Python functions
 - On Linux and macOS, the builtin Python interpreter includes static versions of OpenSSL and libffi, this ensures better compatibility at the price of disabling the OpenSSL extensions supporting dedicated crypto hardware - this restriction does not apply if `pymport` is rebuilt from source
 - Named ES6 exports
 - Add `PyObject.with` implementing Python `with`
 - Return the Python exception object and its constructor in `PythonError.pythonValue` and `PythonError.pythonType`

#### Bug Fixes
 - Fix [#27](https://github.com/mmomtchev/pymport/issues/27), a function as a single argument is considered a kwargs object
 - Fix [#33](https://github.com/mmomtchev/pymport/issues/33), `PyObject.prototype.constr` has wrong TypeScript type

## [1.2.0] 2022-11-25

#### New Features
 - Automatically proxified methods in `pymport/proxified`
 - Proxified objects also proxify the input arguments of passed JS callbacks
 - (***BREAKING***) Conversion of arguments in JS callbacks of Python code is now automatic only if it can be correctly deduced from the context, `toJS()` must be called in all other cases
 - Implement Python type coercion
 - Support Python sets
 
#### Bug Fixes
- Fix [#25](https://github.com/mmomtchev/pymport/issues/25), type-ahead provokes a crash in Node.js 14.x REPL

### [1.1.1] 2022-11-11
- Fix [#14](https://github.com/mmomtchev/pymport/issues/14), `toJS()` converts Python `bool` to JS `number`
- Restore the JS function when converting a `pymport.js_function` back to JS
- Fix [#17](https://github.com/mmomtchev/pymport/issues/17), `PYTHONHOME` is ignored
- In the version reporting, replace the `"undefined"` suffix with a `""` when there is no version suffix

## [1.1.0] 2022-11-08

#### New Features
- Converting JS functions to Python callables
- Expiring of function objects
- Converting of `bytes` and `bytearray` to `Buffer` and `Buffer` to `bytearray`
- Converting between `TypedArray` and `array`
- Convert Python iterators and generators to JavaScript `Symbol.iterator`
- Basic tracking of the memory held by Python objects referenced in JS by the V8 GC
- `proxify`ed object do not intercept and redirect calls to `PyObject` methods if the Python object has a method with the same name - ie. calling `item()` on a non-proxified PyObject invokes `PyObject.item()` but if the underlying Python object of a proxified object also has an `item()` function, calling `item()` on the proxified object will invoke the Python method
- `profixy` always return the same reference if called with a previously seen `PyObject` reference
- Support `BigInt`
- `PyObject.slice` accepts named arguments
- Return the Python traceback in `pythonTrace` and add a `PythonError` TypeScript type
- Do not allow `PYTHONPATH` to override `PYTHONHOME` when using the builtin
- Ignore the last argument of a Python function call if it is `undefined` - this allows to pass a last argument as a dictionary by calling `fn(obj, undefined)` instead of `fn(obj)` which will transform `obj` into named kw arguments
- Support `PyObject.keys` and `PyObject.values` on `profixy`ed objects
- Support building against a prebuilt Python tree in a non-standard location
- (internals) New automatic reference counting

#### Bug Fixes
- Fix [#6](https://github.com/mmomtchev/pymport/issues/6), proxified objects are wrongly caching values returned by getters
- Fix [#8](https://github.com/mmomtchev/pymport/issues/8), `Infinity` is not recognized as a float by the automatic conversion
- Fix [#11](https://github.com/mmomtchev/pymport/issues/11), `npm install --build-from-source` fails

### [1.0.1] 2022-10-29

- Enable TypeScript strict mode
- Fix [#1](https://github.com/mmomtchev/pymport/issues/1), always consume Python exceptions

# [1.0.0] 2022-10-28

- First release
