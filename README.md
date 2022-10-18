# pymport

Use Python libraries from Node.js

# Status

Not ready

# Usage

```js
// import numpy as np
const np = pymport('numpy');

// a = np.arange(15).reshape(3, 5)
const a = np.get('arange').call(15).get('reshape').call(3, 5);

// print(a.tolist())
console.log(a.get('tolist').call().toJS());
```
