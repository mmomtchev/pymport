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
   * Get a property from the object
   * @param {string} name property name
   * @returns {PyObject}
   */
  get: (name: string) => PyObject;

  /**
   * Call a callable property from the object
   * @param {...any[]} args function arguments
   * @returns {PyObject}
   */
  call: (...args: any[]) => PyObject;

  /**
   * Transform the PyObject to a plain JS object
   * @returns {any}
   */
  toJS: () => any;

  /**
   * Use the Python str() built-in on the object
   * @returns {string}
   */
  toString: () => string;
}

/**
 * Import a Python module
 * @param {string} name Python module name
 * @returns {PyObject}
 */
export function pymport(name: string): PyObject;

/**
 * Create a profixied version of a PyObject
 * that works like a native Python object
 * @param {PyObject} object object to proxify
 * @returns {any}
 */
export function proxify(v: PyObject): any;