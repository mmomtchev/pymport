const os = require('os');
const dlopen = require('process').dlopen;
const path = require('path');
const binary = require('@mapbox/node-pre-gyp');
const binding_path = binary.find(path.resolve(path.join(__dirname, '..', 'package.json')));

process.env['PYMPORTPATH'] = path.resolve(path.dirname(binding_path));
dlopen(module, binding_path, os.constants.dlopen.RTLD_NOW | os.constants.dlopen.RTLD_GLOBAL);

module.exports.PyObject.prototype[Symbol.iterator] = function () {
  // We are called on the Python iterator/generator itself
  // Iterate
  const py_next = this.get('__next__');
  if (py_next === undefined || !py_next.callable) {

    const py_iter = this.get('__iter__');
    if (py_iter !== undefined && py_iter.callable) {
      // We are called on an object that has an iterator (an iterable)
      // Get this iterator and return it
      return py_iter.call()[Symbol.iterator]();
    }
    throw new TypeError(`PyObject type ${this.type} is not iterable`);
  }

  return {
    next() {
      try {
        const el = py_next.call();
        return {
          done: false,
          value: el
        };
      } catch (e) {
        return {
          done: true,
          value: null
        };
      }
    }
  };
};

const proxyStore = new WeakMap();

// If one of the arguments is a function,
// replace it with a wrapper that proxifies the arguments
function proxifyCallbackArguments(args) {
  for (let i = 0; i < args.length; i++)
    if (typeof args[i] === 'function') {
      const fn = args[i];
      args[i] = (...fnArgs) => {
        for (let j = 0; j < fnArgs.length; j++) {
          if (typeof fnArgs[j] === 'object' && fnArgs[j] instanceof module.exports.PyObject) {
            fnArgs[j] = proxify(fnArgs[j]);
          }
        }
        return fn(...fnArgs);
      };
    }
}

function proxify(v, name) {
  if (v instanceof module.exports.PyObject) {
    let r = proxyStore[v.id];
    if (r !== undefined) return r;
    if (v.callable) {
      r = (...args) => {
        proxifyCallbackArguments(args);
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

function proxyIterator() {
  const it = this[Symbol.iterator]();

  return {
    next() {
      const el = it.next();
      return {
        done: el.done,
        value: proxify(el.value)
      };
    }
  };
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
    if (prop === Symbol.iterator) return proxyIterator.bind(target);

    let r;
    // attr is the Python attribute of the underlying Python object
    const attr = target.get(prop);
    if (attr === undefined && target[prop]) {
      // there is no underlying Python attribute of this name
      // but there is a PyObject method
      if (typeof target[prop] === 'function') {
        // Created a proxified function for the underlying PyObject method
        r = (...args) => {
          proxifyCallbackArguments(args);
          const result = target[prop](...args);
          return proxify(result);
        };
        Object.defineProperty(r, 'name', { value: prop, writable: false });
        target.__pymport_proxy__[prop] = r;
      } else {
        // Create a proxified object for the PyObject value
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
