/**
 * JavaScript representation of a Python object
 */
export class PyObject {
  /**
   * Construct a PyObject integer from a JS number
   * @param {number} number
   * @returns {PyObject}
   */
  static int: (v: number) => PyObject;

  /**
   * Construct a PyObject float from a JS number
   * @param {number} number
   * @returns {PyObject}
   */
  static float: (v: number) => PyObject;

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
  static dict: (v: Record<string, any>) => PyObject;

  /**
   * Construct a PyObject list from a JS array
   * @param {any[]} array
   * @returns {PyObject}
   */
  static list: (v: any[]) => PyObject;

  /**
   * Construct a PyObject tuple from a JS array
   * @param {any[]} array
   * @returns {PyObject}
   */
  static tuple: (v: any[]) => PyObject;

  /**
   * Construct a PyObject slice from three elements (start, stop, step)
   * @param {any[3]} array
   * @returns {PyObject}
   */
  static slice: (v: any[3]) => PyObject;

  /**
   * Construct an automatically typed PyObject from a plain JS value
   * @param {any} value
   * @returns {PyObject}
   */
  static fromJS: (v: any) => PyObject;

  /**
   * Is the property callable
   * @type {boolean}
   */
  readonly callable: boolean;

  /**
   * The underlying Python type
   */
  readonly type: string;

  /**
   * Length of the underlying object if it is defined
   */
  readonly length: number | undefined;

  /**
   * Get a property from the object, equivalent to Python member operator .
   * @param {string} name property name
   * @returns {PyObject}
   */
  get: (name: string) => PyObject;

  /**
   * Check if a property exists
   * @param {string} name property name
   * @returns {boolean}
   */
  has: (name: string) => boolean;

  /**
   * Retrieve an element by index, equivalent to Python subscript operator[]
   * @param {any} index index
   * @returns {boolean}
   */
  item: (index: any) => PyObject;

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
   * Call a callable property from the object
   * @param {...any[]} args function arguments
   * @returns {PyObject}
   */
  call: (...args: any[]) => PyObject;

  /**
   * Transform the PyObject to a plain JS object. Equivalent to valueOf().
   * @returns {any}
   */
  toJS: () => any;

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
 * Create a profixied version of a PyObject
 * that works like a native Python object
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
  /**
   * Supported only on Python 3.11+
   */
  readonly pythonRuntime: null | string;
  readonly pythonHome: string;
};

/**
 * Errors thrown from Python have a `pythonTrace` property that contains the Python traceback
 */
export type PythonError = (Error | TypeError | RangeError) & { pythonTrace: PyObject; };
