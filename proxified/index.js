const main = require('..');
const { PyObject, pymport, pyval, proxify } = main;

const proxifiedPyObject = class PyObject {
  constructor() {
    throw new Error('PyObject cannot be constructed');
  }

  static [Symbol.hasInstance](obj) {
    return obj.constructor == PyObject.constructor || obj instanceof main.PyObject;
  }
};

const desc = Object.getOwnPropertyDescriptors(PyObject);
for (const m of Object.keys(desc)) {
  if (typeof desc[m].value === 'function') {
    proxifiedPyObject[m] = function (...args) {
      return proxify(PyObject[m].apply(this, args));
    };
  }
}

module.exports = {
  pymport: (mod) => proxify(pymport(mod)),
  pyval: (expr, globals, locals) => proxify(pyval(expr, globals, locals)),
  PyObject: proxifiedPyObject
};
