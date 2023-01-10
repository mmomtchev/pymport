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
    let r = proxyStore.get(v);
    if (r !== undefined) return r;
    if (v.callable) {
      const fn = (...args) => {
        proxifyCallbackArguments(args);
        const result = v.call(...args);
        return proxify(result);
      };
      if (name !== undefined) {
        Object.defineProperty(fn, 'name', { value: name, writable: false });
      }
      r = new Proxy(fn, proxy);
    } else {
      r = new Proxy(v, proxy);
    }
    Object.defineProperty(r, '__PyObject__', { value: v, enumerable: false });
    proxyStore.set(v, r);
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

const symbols = {
  propStore: Symbol('pymport.propStore'),
  toString: Symbol('pymport.toString'),
  toPrimitive: Symbol('pymport.toPrimitive'),
  iterator: Symbol('pymport.iterator')
};

function handleSpecialPropStore(target, ersatz, value) {
  if (!target[symbols.propStore][ersatz])
    target[symbols.propStore][ersatz] = value;
  return target[symbols.propStore][ersatz];
}

const proxy = {
  get(target, prop) {
    // Some properties are special cases
    if (prop === '__PyObject__') return target.__PyObject__;
    if (prop === Symbol.toStringTag) return target.toString();

    let proxyProp;
    if (typeof target === 'function') {
      proxyProp = target[prop];
      target = target.__PyObject__;
    }

    if (!target[symbols.propStore]) {
      Object.defineProperty(target, symbols.propStore, { value: {}, enumerable: false });
    }

    if (prop === 'toString') return handleSpecialPropStore(target, symbols.toString, () => target.toString());
    if (prop === Symbol.toPrimitive) return handleSpecialPropStore(target, symbols.toPrimitive, () => target.toJS());
    if (prop === Symbol.iterator) return handleSpecialPropStore(target, symbols.iterator, proxyIterator.bind(target));

    if (target[symbols.propStore][prop]) return target[symbols.propStore][prop];

    // Preference order:
    // 1. Python attribute
    // 2. PyObject attribute
    // 3. Proxy object attribute

    let r;
    // attr is the Python attribute of the underlying Python object
    const attr = target.get(prop);
    if (attr === undefined) {
      if (target[prop] !== undefined) {
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
          target[symbols.propStore][prop] = r;
        } else {
          // Create a proxified object for the PyObject value
          r = proxify(target[prop]);
        }
      } else if (proxyProp !== undefined) {
        // there is no underlying Python attribute of this name
        // but there is a Proxy property (this is probably the name)
        r = proxyProp;
      }
    } else {
      // Create a proxified object for the Python attribute
      r = proxify(attr, prop);
    }

    return r;
  }
};

module.exports.PyObject.prototype.with = function (fn) {
  const value = this.get('__enter__').call();
  let ret;
  try {
    ret = fn(value);
  } catch (e) {
    let args;
    if (e.pythonValue) {
      args = [e.pythonType, e.pythonValue, e.pythonTrace];
    } else {
      args = [e.constructor, e, e.stack];
    }
    const handled = this.get('__exit__').call(...args);
    if (!handled.toJS())
      throw e;
    return undefined;
  }
  this.get('__exit__').call(null, null, null);
  return ret;
};

module.exports.PyObject.prototype.map = function (cb, thisArg) {
  if (this.length === undefined)
    throw new TypeError('PyObject is not iterable');

  const r = [];
  let i = 0;
  for (const element of this) {
    r.push(cb.call(thisArg, element, i, this));
    i++;
  }
  return r;
};

module.exports.proxify = proxify;

exports = module.exports;
