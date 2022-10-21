const os = require('os');
const dlopen = require('process').dlopen;

// TODO find an elegant solution
dlopen(module, './build/Debug/pymport-native.node', os.constants.dlopen.RTLD_NOW | os.constants.dlopen.RTLD_GLOBAL);

/**
 * Creates a profixied version of a PyObject
 * that works like a native Python object
 * @param {PyObject} object object to proxify
 * @returns {any}
 */
function proxify(v) {
  if (v instanceof module.exports.PyObject)
    return new Proxy(v, proxy);
  return v;
}

const proxy = {
  get(target, prop) {
    if (!target.__pymport_proxy__) {
      Object.defineProperty(target, '__pymport_proxy__', { value: {}, enumerable: false });
    }
    if (target.__pymport_proxy__[prop]) return target.__pymport_proxy__[prop];
    if (prop === Symbol.toStringTag) return target.toString();

    let r;
    if (target[prop]) {
      if (typeof target[prop] === 'function') {
        r = () => {
          const result = target[prop]();
          return proxify(result);
        };
        Object.defineProperty(r, 'name', { value: prop, writable: false });
      } else {
        r = proxify(target[prop]);
      }
    } else {
      const attr = target.get(prop);

      if (attr.callable) {
        r = (...args) => {
          const result = attr.call(...args);
          return proxify(result);
        };
        Object.defineProperty(r, 'name', { value: prop, writable: false });
        Object.defineProperty(r, '__PyObject__', { value: target, enumerable: false });
      } else {
        r = proxify(attr);
      }
    }

    target.__pymport_proxy__[prop] = r;
    return target.__pymport_proxy__[prop];
  }
};

module.exports.proxify = proxify;

exports = module.exports;
