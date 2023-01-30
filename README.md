# pymport

Use Python libraries from Node.js

[![ISC](https://img.shields.io/github/license/mmomtchev/pymport)](https://github.com/mmomtchev/pymport/blob/main/LICENSE)
[![Test npm package](https://github.com/mmomtchev/pymport/actions/workflows/test-package.yml/badge.svg)](https://github.com/mmomtchev/pymport/actions/workflows/test-package.yml)
[![Node.js CI](https://github.com/mmomtchev/pymport/actions/workflows/test-dev.yml/badge.svg)](https://github.com/mmomtchev/pymport/actions/workflows/test-dev.yml)
[![npm](https://img.shields.io/npm/v/pymport)](https://www.npmjs.com/package/pymport)
[![codecov](https://codecov.io/gh/mmomtchev/pymport/branch/main/graph/badge.svg?token=pNeJl1Zhmw)](https://codecov.io/gh/mmomtchev/pymport)

# Quickstart

Install `pymport`:
```shell
npm i pymport
```

Install `numpy`, `pandas` or whatever your favorite Python package is:
```shell
npx pympip3 install numpy
```

Start using from Node.js:
```js
const { pymport, proxify } = require('pymport');
const np = proxify(pymport('numpy'));

const a = np.arange(15).reshape(3, 5);
const b = np.ones([2, 3], { dtype: np.int16 });
```

or

```js
import { pymport, proxify } from 'pymport';
const np = proxify(pymport('numpy'));

const a = np.arange(15).reshape(3, 5);
const b = np.ones([2, 3], { dtype: np.int16 });
```

Then head to the [wiki](https://github.com/mmomtchev/pymport/wiki) for the full documentation.

# Supported Versions

`pymport` is unit-tested on all combinations of:

| Platforms | Versions                                                 |
| --------- | -------------------------------------------------------- |
| OS        | Windows 2019 & 2022, Ubuntu 20.04 & 22.04, macOS 11 & 12 (x86 only) |
| Node.js   | 14.x, 16.x and 18.x                                      |
| Python    | 3.8, 3.9, 3.10 and 3.11                                  |

except for the following combinations that are not supported:

* **Node.js 14.x with Python 3.11**: rebuilding from source is not possible due to `node-gyp` version being too old to support Python 3.11, upgrading `npm` or using the precompiled binaries solves this issue

* **Node.js 14.x/16.x on Ubuntu 22.04**: rebuilding from source against the system-installed Python is not possible due to Node.js containing a built-in OpenSSL 1.1 with exported symbols while the system-provided Python is built vs OpenSSL 3.0, upgrading Node.js or using the precompiled interpreter solves this issue

* **Python 3.11.1 on Windows**: An upstream bug requires a specific workaround in this case [#44](https://github.com/mmomtchev/pymport/issues/44)]

# `pymport` vs `PyScript/Pyodide`

Although both projects provide similar functionality, they are completely unrelated with very different design goals:
* `pymport` goal is to allow using standard Python libraries without any modification in Node.js - it brings software such as  `numpy`, `pandas` to Node.js
* `Pyodide` goal is to allow using Python code in a modified interpreter both in the browser and in Node.js - it allows scripting a web page in Python

Comparison:

Software | `pymport` | `Pyodide` |
--- | --- | --- |
Target JS Environment | Node.js | Node.js & Browser  | 
Compatibility | all existing Python libraries w/o modification | libraries ported to `Pyodide` |
Contains binary platform-dependent code | requires binaries for the specific platform, supports Windows, Linux & macOS | fully portable
Python stdlib support | all | most
Existing external environment support | yes, but must compile C++ | no
Special semantics for expressing all missing language features | yes | yes
Performance | native |  3x to 5x slower |
Interpreter support | Standard CPython, latest 3.10 version comes built-in | Modified recent CPython
Using Python objects from JS | yes, with a transparent `Proxy` | yes, with a transparent `Proxy`
Using JS objects from Python | not directly, must copy-convert with `fromJS` before calling Python | yes, with a transparent proxy type from the `js` module
Round-trip conversion of objects restores the original | only Python to JS to Python | both
Calling Python functions from JS | yes | yes 
Calling JS functions from Python | yes | yes
Asynchronous calling from JS to Python | yes | no
Asynchronous calling from Python to JS | no | yes
Interoperability between JS `Promise` and Python `Future` | no | yes
Exception conversion | bi-directional | bi-directional
Program entrypoint | must be JavaScript | JavaScript or Python
Redirecting stdio | no | from Python to JavaScript
Inline Python in JavaScript | only `eval` context | full
Importing `.py` files | may load from the filesystem | may load from an URL
`worker_threads` | yes, all threads share a single Python interpreter | yes, each thread runs a separate Python interpreter
TypeScript support | partial, TypeScript typings for the project itself, but does not generate TypeScript typings for Python packages | partial, TypeScript typings for the project itself, but does not generate TypeScript typings for Python packages

# Known Issues

The wiki has a list of some known and hard to fix issues:
[Known Issues](https://github.com/mmomtchev/pymport/wiki#known-issues)

# License

Copyright 2022 Momtchil Momtchev <momtchil@momtchev.com> and contributors

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
