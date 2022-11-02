# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] WIP

- Converting JS functions to Python callables
- Expiring of function objects
- Converting of `bytes` and `bytearray` to `Buffer` and `Buffer` to `bytearray`
- Converting between `TypedArray` and `array`
- Basic tracking of the memory held by Python objects referenced in JS by the V8 GC
- `proxify`ed object do not intercept and redirect calls to `PyObject` methods if the Python object has a method with the same name - ie. calling `item()` on a non-proxified PyObject invokes `PyObject.item()` but if the underlying Python object of a proxified object also has an `item()` function, calling `item()` on the proxified object will invoke the Python method
- `profixy` always return the same reference if called with a previously seen `PyObject` reference
- Support `BigInt`
- Return the Python traceback in `pythonTrace` and add a `PythonError` TypeScript type
- Do not allow `PYTHONPATH` to override `PYTHONHOME` when using the builtin
- Ignore the last argument of a Python function call if it is `undefined` - this allows to pass a last argument as a dictionary by calling `fn(obj, undefined)` instead of `fn(obj)` which will transform `obj` into named kw arguments
- (internals) New automatic reference counting

### [1.0.1] 2022-10-29

- Enable TypeScript strict mode
- Fix [#1](https://github.com/mmomtchev/pymport/issues/1), always consume Python exceptions

# [1.0.0] 2022-10-28

- First release
