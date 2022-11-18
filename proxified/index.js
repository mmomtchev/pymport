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

let desc = Object.getOwnPropertyDescriptors(PyObject.prototype);
for (const m of Object.keys(desc)) {
  if (typeof desc[m].value === 'function') {
    // Proxify a method
    proxifiedPyObject.prototype[m] = function (...args) {
      return proxify(PyObject.prototype[m].apply(this, args));
    };
    proxifiedPyObject.prototype[m].name = m;
  } else if (typeof desc[m].get === 'function') {
    // Proxify a getter
    Object.defineProperty(proxifiedPyObject.prototype, m, {
      get: function () {
        return proxify(PyObject.prototype[m]);
      }
    });
  }
}

desc = Object.getOwnPropertyDescriptors(PyObject);
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
