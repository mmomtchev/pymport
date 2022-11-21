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
pympip3 install numpy
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
