const os = require('os');
const dlopen = require('process').dlopen;
const path = require('path');
const binary = require('@mapbox/node-pre-gyp');
const binding_path = binary.find(path.resolve(path.join(__dirname, '../package.json')));

process.env['PYMPORTPATH'] = path.resolve(path.dirname(binding_path));
dlopen(module, binding_path, os.constants.dlopen.RTLD_NOW | os.constants.dlopen.RTLD_GLOBAL);

const proxyStore = new WeakMap();

function proxify(v, name) {
  if (v instanceof module.exports.PyObject) {
    let r = proxyStore[v.id];
    if (r !== undefined) return r;
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
    proxyStore[v.id] = r;
    return r;
  }
  return v;
}

const proxy = {
  get(target, prop) {
    // Some properties are special cases
    if (prop === '__PyObject__') return target.__PyObject__;
    if (!target.__pymport_proxy__) {
      Object.defineProperty(target, '__pymport_proxy__', { value: {}, enumerable: false });
    }
    if (target.__pymport_proxy__[prop]) return target.__pymport_proxy__[prop];
    if (prop === Symbol.toStringTag) return target.toString();
    if (prop === Symbol.toPrimitive) return () => target.toJS();

    let r;
    // attr is the Python attribute of the underlying Python object
    const attr = target.get(prop);
    if (attr === undefined && target[prop]) {
      // there is no underlying Python attribute of this name
      // but there is a PyObject method
      if (typeof target[prop] === 'function') {
        // Created a proxified function for the underlying PyObject method
        r = (...args) => {
          const result = target[prop](...args);
          return proxify(result);
        };
        Object.defineProperty(r, 'name', { value: prop, writable: false });
        target.__pymport_proxy__[prop] = r;
      } else {
        // Create a profixied object for the PyObject value
        r = proxify(target[prop]);
      }
    } else if (attr !== undefined) {
      // Create a proxified object for the Python attribute
      r = proxify(attr, prop);
    } else {
      // No such attribute
      return undefined;
    }

    return r;
  }
};

module.exports.proxify = proxify;

exports = module.exports;
