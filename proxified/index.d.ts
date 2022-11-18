import { PyObject as rawPyObject } from '..';

/**
 * A proxified version of PyObject, constructs proxified objects
 * @param {string} name module name
 * @return {any}
 */
export const PyObject: typeof rawPyObject & any;

/**
 * A proxified version of pymport, returns a proxified Python module
 * @param {string} name module name
 * @return {PyObject}
 */
export const pymport: (mod: string) => any;

/**
 * A proxified version of pyval, returns a proxified PyObject
* @param {string} code Python code
 * @param {PyObject | Record<string, any>} [globals] Optional global context
 * @param {PyObject | Record<string, any>} [locals] Optional local context
 * @returns {PyObject}
 */
export function pyval(
  code: string,
  globals?: typeof PyObject | Record<string, any>,
  locals?: typeof PyObject | Record<string, any>
): any;
