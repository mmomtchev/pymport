import { PyObject } from '..';

export type TypedArray = Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array |
  BigUint64Array | BigInt64Array | Float32Array | Float64Array;

/**
 * Get the TypedArray constructor that corresponds to the Python array.array object.
 * @param {PyObject} array Python array.array
 * @return {ArrayConstructor}
 */
export function getJSType(array: PyObject): ArrayConstructor;

/**
 * Get the Python letter code that corresponds to the TypedArray object.
 * @param {ArrayBuffer} array TypedArray
 * @return {string}
 */
export function getPythonType(array: TypedArray): string;

/**
 * Convert the Python array.array to JS TypedArray. The array contents are copied.
 * @param {PyObject} array Python array.array
 * @return {ArrayBuffer}
 */
export function toTypedArray(array: PyObject): TypedArray;

/**
 * Convert the TypedArray to Python array.array. The array contents are copied.
 * @param {ArrayBuffer} array TypedArray
 * @return {PyObject}
 */
export function toPythonArray(array: TypedArray): PyObject;
