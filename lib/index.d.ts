declare module pymport {
    export class PyObject {
        static int: (v: number) => PyObject;
        static float: (v: number) => PyObject;
        
        get: (name: string) => PyObject;
        call: (...args: any[]) => PyObject;
        toJS: () => unknown;
    }
}