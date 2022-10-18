declare module pymport {
    export class PyObject {
        static int: (v: number) => PyObject;
        static float: (v: number) => PyObject;
        static string: (v: string) => PyObject;
        static fromJS: (v: any) => PyObject;
        
        get: (name: string) => PyObject;
        call: (...args: any[]) => PyObject;
        toJS: () => unknown;
    }
}