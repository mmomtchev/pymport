# pymport

Use Python libraries from Node.js

**Update: since Oct 24 I am homeless and living in my van. I lost access to most of my computer hardware. The eviction from my home has been timed for maximum effect as I was not present when it happened. I have only a single set of clothes and no means to get anything else. Please, if you use my software, consider asking everyone around you if they are taking part in this extortion and why.**

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

Or go for the quickstart by learning from the [examples](https://github.com/mmomtchev/pymport/tree/main/examples).

There is also a [medium stort](https://medium.com/@mmomtchev/using-numpy-and-pandas-in-node-js-88fe30080938) with a brief introduction.

# Supported Versions

`pymport` is unit-tested on all combinations of:

| Platforms | Versions                                                            |
| --------- | ------------------------------------------------------------------- |
| OS        | Windows 2019 & 2022, Ubuntu 20.04, 22.04 and 24.04, macOS 13 and 14 |
| CPU       | x86-64 and ARM64                                                    |
| Node.js   | 18.x, 20.x, 22.x and 24.x                                           |
| Python    | 3.8, 3.9, 3.10, 3.11, 3.12 and 3.13                                 |

except for the following combinations that are not supported:

* **Python 3.11.x on Windows**: An upstream bug requires a specific workaround in this case [#44](https://github.com/mmomtchev/pymport/issues/44)

* **Node.js 18.x and Windows 11 arm64**: Combination not supported by Node.js

* **Python <3.11 and Windows 11 arm64**: Combination not supported by Github Actions

| `pymport` | Built-in Python interpreter           |
| --------- | ------------------------------------- |
| 1.4.x     | Python 3.10                           |
| 1.5.x     | Pytnon 3.12                           |

# `pymport` vs `PyScript/Pyodide`

Although both projects provide similar functionality, they are completely unrelated with very different design goals:
* `pymport` goal is to allow using standard Python libraries without any modification in Node.js - it brings software such as `numpy` and `pandas` to Node.js
* `Pyodide` goal is to allow using Python code in a modified interpreter both in the browser and in Node.js - it allows scripting a web page in Python

You can check [the wiki](https://github.com/mmomtchev/pymport/wiki/vs-Pyodide) for a more detailed comparison.

# Known Issues

The wiki has a list of some known and hard to fix issues:
[Known Issues](https://github.com/mmomtchev/pymport/wiki#known-issues)

# License

Copyright 2022-2024 Momtchil Momtchev <momtchil@momtchev.com> and contributors

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
