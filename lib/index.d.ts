export type PyNumber = number | PyObject | null;

/**
 * JavaScript representation of a Python object
 */
export class PyObject implements Iterable<PyObject> {
  /**
   * Construct a PyObject integer from a JS number or a PyObject
   * @param {number} number
   * @returns {PyObject}
   */
  static int: (v: number | bigint | PyObject) => PyObject;

  /**
   * Construct a PyObject float from a JS number or a PyObject
   * @param {number} number
   * @returns {PyObject}
   */
  static float: (v: number | PyObject) => PyObject;

  /**
   * Construct a PyObject string from a JS string
   * @param {string} string
   * @returns {PyObject}
   */
  static string: (v: string) => PyObject;

  /**
   * Construct a PyObject dictionary from a JS object
   * @param {Record<string, any>} object
   * @returns {PyObject}
   */
  static dict: (object: Record<string, any>) => PyObject;

  /**
   * Construct a PyObject list from a JS array or an iterable PyObject
   * @param {any[] | PyObject} array
   * @returns {PyObject}
   */
  static list: (array: any[] | PyObject) => PyObject;

  /**
   * Construct a PyObject tuple from a JS array or a PyObject list
   * @param {any[] | PyObject} array
   * @returns {PyObject}
   */
  static tuple: (array: any[] | PyObject) => PyObject;

  /**
   * Construct a PyObject set from a JS array or an iterable PyObject
   * @param {any[]} array
   * @returns {PyObject}
   */
  static set: (v: any[] | PyObject) => PyObject;

  /**
   * Construct a PyObject frozenset from a JS array or an iterable PyObject
   * @param {any[]} array
   * @returns {PyObject}
   */
  static frozenSet: (v: any[] | PyObject) => PyObject;

  /**
   * Construct a PyObject slice from three elements (start, stop, step).
   * In Python, a slice and a range are two different object types:
   * https://til.hashrocket.com/posts/5zuzolqlcb-range-v-slice
   * @param {PyNumber[] | { start?: PyNumber; stop?: PyNumber, step?: PyNumber; }} slice slice indices
   * @returns {PyObject}
   */
  static slice: (slice: [PyNumber, PyNumber, PyNumber] |
  { start?: PyNumber; stop?: PyNumber, step?: PyNumber; }) => PyObject;

  /**
   * Construct a PyObject bytes from a Buffer. The resulting object is a copy.
   * @param {Buffer} buffer
   * @returns {PyObject}
   */
  static bytes: (buffer: Buffer) => PyObject;

  /**
   * Construct a PyObject bytearray from a Buffer. The resulting object is a copy.
   * @param {Buffer} buffer
   * @returns {PyObject}
   */
  static bytearray: (buffer: Buffer) => PyObject;

  /**
   * Construct a PyObject memoryview from a Buffer.
   * The resulting object references directly the Buffer.
   * The Buffer is guaranteed to stay in memory for as long as the memoryview exists.
   * This is the only case in which V8 objects can be held by the Python GC.
   * @param {Buffer} buffer
   * @returns {PyObject}
   */
  static memoryview: (buffer: Buffer) => PyObject;

  /**
   * Construct a PyObject pymport.js_function from a JS function.
   * The resulting object is a Python callable.
   * @param {(...args: any[]) => any} fn arbitrary JS function
   * @returns {PyObject}
   */
  static func: (fn: (...args: any[]) => any) => PyObject;


  /**
   * Construct an automatically typed PyObject from a plain JS value.
   * The PyObject is a copy by value unless explicitly mentioned.
   * 
   * A number becomes an int when it has no decimal part or a float when it has one.
   * 
   * A BigInt becomes an int.
   * 
   * A bool becomes a bool.
   * 
   * Undefined and null become None.
   *
   * A string becomes an unicode string.
   * 
   * An array becomes a list.
   * 
   * An object becomes a dictionary.
   * 
   * A PyObject or a proxified PyObject is always passed by reference and reverts to its Python type.
   * 
   * A Buffer becomes a bytearray.
   * 
   * A JS function (including a native function) becomes a callable pymport.js_function
   * 
   * @param {any} value
   * @returns {PyObject}
   */
  static fromJS: (v: any) => PyObject;

  /**
   * Numeric id of the object, it is generally the same as the one returned by id()
   * @type {number}
   */
  readonly id: number;

  /**
   * Is the property callable
   * @type {boolean}
   */
  readonly callable: boolean;

  /**
   * The underlying Python type, equivalent to JavaScript typeof
   */
  readonly type: string;

  /**
   * Length of the underlying object if it is defined
   */
  readonly length: number | undefined;

  /**
   * The underlying Python type, equivalent to Python type() or JavaScript constructor
   */
  readonly constr: PyObject;

  /**
   * Get a property from the object, equivalent to Python member operator .
   * @param {string} name property name
   * @returns {PyObject}
   */
  get: (name: string) => PyObject;

  /**
   * Check if a property exists. Equivalent to Python hasattr(o, name)
   * @param {string | any} key property name, only sets accept values that are not a string
   * @returns {boolean}
   */
  has: (name: string | any) => boolean;

  /**
   * Retrieve an element by index, equivalent to Python subscript operator[]
   * @param {any} index index
   * @returns {boolean}
   */
  item: (index: any) => PyObject;

  /**
   * Runs the provided function in the context of this object, equivalent to Python with
   * @returns {PyObject}
   */
  with: <T>(fn: (v: PyObject) => T) => T;

  /**
   * Retrieve a list with the keys of the dictionary, equivalent to JS Object.keys()
   * @returns {PyObject}
   */
  static keys: (obj: PyObject) => PyObject;

  /**
   * Retrieve a list with the values of the dictionary, equivalent to JS Object.values()
   * @returns {PyObject}
   */
  static values: (obj: PyObject) => PyObject;

  /**
   * Call a callable PyObject, throws if the underlying object is not callable
   * @param {...any[]} args function arguments
   * @returns {PyObject}
   */
  call: (...args: any[]) => PyObject;

  /**
   * Asynchronously call a callable PyObject, rejects if the underlying object is not callable
   * @param {...any[]} args function arguments
   * @returns {Promise<PyObject>}
   */
  callAsync: (...args: any[]) => Promise<PyObject>;

  /**
   * Transform the PyObject to a plain JS object. Equivalent to valueOf().
   * 
   * A float becomes a Number.
   * 
   * An int becomes a Number if it is in the safe integer number range or a BigInt otherwise.
   * 
   * A bool becomes a bool.
   * 
   * None becomes null.
   *
   * An unicode string becomes a string.
   * 
   * A list, a tuple, a set or a frozenset becomes an array
   * 
   * A dictionary becomes an object.
   * 
   * Any object implementing the Buffer Protocol - bytes, bytearray or a memoryview - becomes a Buffer.
   * The memory referenced by the Buffer is a copy of the Python memory. This behavior can be disabled
   * by passing { buffer: false }.
   * 
   * A callable becomes a native (binary) function.
   * 
   * A module becomes an object.
   *
   * Everything else remains a PyObject.
   * 
   * The maximum recursion depth can be set by passing { depth: number }. Without this parameter
   * pymport will go down to the furthest possible level. By setting the depth to 1 it is possible
   * to transform a Python list to a JavaScript array while keeping all elements as Python objects.
   * Refer to the performance section of the wiki for the possible implications and especially
   * the memory overhead.
   * 
   * @param {object} [opts] options
   * @param {number} [opts.depth] maximum recursion depth, undefined for unlimited
   * @param {boolean} [opts.buffer] do not convert objects that implement only the Buffer protocol
   * @returns {any}
   */
  toJS: (opts?: { depth?: number; buffer?: boolean; }) => any;

  /**
   * Transform the PyObject to a plain JS object. Equivalent to toJS().
   * @returns {any}
   */
  valueOf: () => any;

  /**
   * Use the Python str() built-in on the object
   * @returns {string}
   */
  toString: () => string;

  /**
   * Return an iterator over the object's elements.
   * An object is iterable if it has length.
   * @returns {string}
   */
  [Symbol.iterator]: () => Iterator<PyObject>;

  /**
   * Create a new array populated with the results of calling a provided function on every element in the
   * calling array.
   * 
   * Works on all iterable objects.
   * 
   * @param {(this: U, element: PyObject, index: number, array: PyObject) => T} callback function to be called
   * on every array element
   * @param {unknown} [this] optional this value to be provided to the function
   */
  map: <T, U>(callback: (this: U, element: PyObject, index: number, iterable: PyObject) => T, thisArg?: U) => T[];
}

/**
 * Import a Python module.
 * 
 * Default search location is determined by the Python interpreter library.
 * It can be overridden by setting the PYTHONPATH environment variable.
 * 
 * If you want to load a Python file in the same directory as the calling JS you can use
 * 
 * process.env['PYTHONPATH'] = __dirname
 * 
 * before importing pymport - once Python has been initialized further modifications
 * will have no effect.
 * 
 * @param {string} name Python module name
 * @returns {PyObject}
 */
export function pymport(name: string): PyObject;

/**
 * Create a proxified version of a PyObject that works like a native Python object.
 * All values returned by its methods will also be proxified.
 * 
 * @param {PyObject} object object to proxify
 * @param {string} [name] optional name to be assigned to a proxified function
 * @returns {any}
 */
export function proxify(v: PyObject, name?: string): any;

/**
 * Eval a Python fragment. Uses Python `eval` which is a special language context.
 * The Python code must be an expression that evaluates to a value and not a statement.
 * Refer to the Python documentation for more information on what is allowed in this context.
 * If you need to execute statements, you should place them in a file and load it as a module.
 * @param {string} code Python code
 * @param {PyObject | Record<string, any>} [globals] Optional global context
 * @param {PyObject | Record<string, any>} [locals] Optional local context
 * @returns {PyObject}
 */
export function pyval(
  code: string,
  globals?: PyObject | Record<string, any>,
  locals?: PyObject | Record<string, any>
): PyObject;

/**
 * Version information
 */
declare const version: {
  readonly pymport: {
    readonly major: number,
    readonly minor: number,
    readonly patch: number,
    readonly suffix: string;
  },
  readonly pythonLibrary: {
    readonly builtin: boolean;
    readonly major: number;
    readonly minor: number;
    readonly micro: number;
    readonly release: number;
    readonly serial: number;
    /**
     * Hex number
     */
    readonly version: string;
  };
  readonly pythonHome: string;
  /**
   * Supported only on Python 3.10+
   */
  readonly pythonRuntime: null | string;
};

/**
 * Errors thrown from Python have a `pythonTrace` property that contains the Python traceback
 */
export type PythonError = (Error | TypeError | RangeError) & {
  pythonType: PyObject;
  pythonValue: PyObject;
  pythonTrace: PyObject;
};
