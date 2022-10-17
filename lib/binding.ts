interface IPyObject {
    get: (name: string) => IPyObject;
    call: (...args: any[]) => IPyObject;
    toJS: () => unknown;
};

import * as os from 'os';

(process as any).dlopen(module, './build/Debug/pymport-native.node', (os.constants as any).dlopen.RTLD_NOW | (os.constants as any).dlopen.RTLD_GLOBAL);

const addon = require('../build/Debug/pymport-native') as {
    pymport: (name: string) => IPyObject,
    PyObject: {
        new: () => IPyObject,
        int: (v: number) => IPyObject
    }
};

export = addon;
