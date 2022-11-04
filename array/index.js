const { PyObject, pymport } = require('..');
const array = pymport('array');

function getJSType(py_array) {
  if (typeof py_array !== 'object' || !(py_array instanceof PyObject) || py_array.type !== 'array.array')
    throw new TypeError('Passed value is not a Python array.array');

  const typecode = py_array.typecode.toJS();

  switch (typecode) {
    case 'f':
      return Float32Array;
    case 'd':
      return Float64Array;
  }
  const unsigned = typecode == typecode.toUpperCase();

  switch (py_array.itemsize.toJS()) {
    case 1:
      return unsigned ? Uint8Array : Int8Array;
    case 2:
      return unsigned ? Uint16Array : Int16Array;
    case 4:
      return unsigned ? Uint32Array : Int32Array;
    case 8:
      return unsigned ? BigUint64Array : BigInt64Array;
    default:
      throw new TypeError(`Python type ${typecode} is not supported in Node.js`);
  }
}

function toTypedArray(py_array) {
  const cons = getJSType(py_array);

  return new cons(py_array.toJS().buffer);
}

const pythonTypes = {
  'Uint8Array': 'B',
  'Int8Array': 'b',
  'Int16Array': 'h',
  'Uint16Array': 'H',
  'Int32Array': 'i',
  'Uint32Array': 'I',
  'BigInt64Array': 'q',
  'BigUint64Array': 'Q',
  'Float32Array': 'f',
  'Float64Array': 'd'
};

function getPythonType(typed_array) {
  const t = pythonTypes[typed_array.constructor.name];
  if (t === undefined) throw new TypeError('Value is not a supported TypedArray type');
  return t;
}

function toPythonArray(typed_array) {
  const type = getPythonType(typed_array);

  const buffer = Buffer.from(typed_array.buffer, typed_array.byteOffset, typed_array.byteLength);
  const py_array = array.get('array').call(type, PyObject.fromJS(buffer));

  return py_array;
}

module.exports = {
  getJSType,
  getPythonType,
  toTypedArray,
  toPythonArray
};