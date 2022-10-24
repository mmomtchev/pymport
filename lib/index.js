const os = require('os');
const dlopen = require('process').dlopen;
const path = require('path');
const binary = require('@mapbox/node-pre-gyp');
const binding_path = binary.find(path.resolve(path.join(__dirname, '../package.json')));

dlopen(module, binding_path, os.constants.dlopen.RTLD_NOW | os.constants.dlopen.RTLD_GLOBAL);

function proxify(v, name) {
  if (v instanceof module.exports.PyObject) {
    let r;
    if (v.callable) {
      r = (...args) => {
        const result = v.call(...args);
        return proxify(result);
      };
    } else {
      r = new Proxy(v, proxy);
    }
    Object.defineProperty(r, '__PyObject__', { value: v, enumerable: false });
    if (name !== undefined) {
      Object.defineProperty(r, 'name', { value: name, writable: false });
    }
    return r;
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

      r = proxify(attr, prop);
    }

    target.__pymport_proxy__[prop] = r;
    return target.__pymport_proxy__[prop];
  }
};

module.exports.proxify = proxify;

exports = module.exports;
