const os = require('os');
const dlopen = require('process').dlopen;
const path = require('path');
const binary = require('@mapbox/node-pre-gyp');
const binding_path = binary.find(path.resolve(path.join(__dirname, '../package.json')));

dlopen(module, binding_path, os.constants.dlopen.RTLD_NOW | os.constants.dlopen.RTLD_GLOBAL);

function proxify(v) {
  if (v instanceof module.exports.PyObject) {
    const p = new Proxy(v, proxy);
    Object.defineProperty(p, '__PyObject__', { value: v, enumerable: false });
    return p;
  }
  return v;
}

const proxy = {
  get(target, prop) {
    if (prop === '__PyObject__') return target.__PyObject__;
    if (!target.__pymport_proxy__) {
      Object.defineProperty(target, '__pymport_proxy__', { value: {}, enumerable: false });
    }
    if (target.__pymport_proxy__[prop]) return target.__pymport_proxy__[prop];
    if (prop === Symbol.toStringTag) return target.toString();

    let r;
    if (target[prop]) {
      if (typeof target[prop] === 'function') {
        r = (...args) => {
          const result = target[prop](...args);
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
