const main = require('..');

class PyObject {
  constructor() {
    throw new Error('PyObject cannot be constructed');
  }

  static [Symbol.hasInstance](obj) {
    return obj.constructor == PyObject.constructor || obj instanceof main.PyObject;
  }
}

const desc = Object.getOwnPropertyDescriptors(main.PyObject);
for (const m of Object.keys(desc)) {
  if (typeof desc[m].value === 'function') {
    PyObject[m] = function (...args) {
      return main.proxify(main.PyObject[m].apply(this, args));
    };
  }
}

const pymport = (mod) => main.proxify(main.pymport(mod));
const pyval = (expr, globals, locals) => main.proxify(main.pyval(expr, globals, locals));

module.exports = {
  pymport,
  pyval,
  PyObject
};
