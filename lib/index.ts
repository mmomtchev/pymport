
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path = "index.d.ts" />

import * as os from 'os';

// TODO find an elegant solution
(process as any).dlopen(module, './build/Debug/pymport-native.node',
    (os.constants as any).dlopen.RTLD_NOW | (os.constants as any).dlopen.RTLD_GLOBAL);

function proxify(v: pymport.PyObject) {
    return new Proxy(v, proxy);
}

const typedAddon = module.exports as {
    pymport: (name: string) => pymport.PyObject,
    PyObject: typeof pymport.PyObject;
    proxify: typeof proxify;
};

const proxy = {
    get(target: any, prop: string | symbol): any {
        if (!target.__pymport_proxy__) target.__pymport_proxy__ = {};
        if (target.__pymport_proxy__[prop]) return target.__pymport_proxy__[prop];
        if (prop === Symbol.toStringTag) return target.toString();

        let r;
        if (target[prop]) {
            if (typeof target[prop] === 'function') {
                r = () => {
                    const result = target[prop]();
                    if (result instanceof typedAddon.PyObject)
                        return new Proxy(result, proxy);
                    return result;
                };
                Object.defineProperty(r, 'name', { value: prop, writable: false });
            } else {
                r = target[prop];
            }
        } else {
            const attr = target.get(prop);

            if (attr.callable) {
                r = (...args: any[]) => {
                    const result = attr.call(...args);
                    if (result instanceof typedAddon.PyObject)
                        return new Proxy(result, proxy);
                    return result;
                };
                Object.defineProperty(r, 'name', { value: prop, writable: false });
                Object.defineProperty(r, '__PyObject__', { value: target, enumerable: false });
            } else {
                r = attr;
            }
        }

        target.__pymport_proxy__[prop] = r;
        return target.__pymport_proxy__[prop];
    }
};

typedAddon.proxify = proxify;

export = typedAddon;
