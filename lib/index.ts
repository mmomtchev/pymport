
/// <reference path = "index.d.ts" />

import * as os from 'os';

// TODO find an elegant solution
(process as any).dlopen(module, './build/Debug/pymport-native.node', (os.constants as any).dlopen.RTLD_NOW | (os.constants as any).dlopen.RTLD_GLOBAL);

const addon = require('../build/Debug/pymport-native') as {
    pymport: (name: string) => pymport.PyObject,
    PyObject: typeof pymport.PyObject;
};

export = addon;
