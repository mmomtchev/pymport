declare namespace pymport {
    export class PyObject {
        static int: (v: number) => PyObject;
        static float: (v: number) => PyObject;
        static string: (v: string) => PyObject;
        static dict: (v: Record<string, unknown>) => PyObject;
        static list: (v: any[]) => PyObject;
        static tuple: (v: any[]) => PyObject;
        static fromJS: (v: any) => PyObject;
        
        get: (name: string) => PyObject;
        call: (...args: any[]) => PyObject;
        toJS: () => any;
    }
}