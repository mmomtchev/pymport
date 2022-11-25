# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
