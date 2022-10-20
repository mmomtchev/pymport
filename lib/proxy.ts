const pymportProxy = {
  get(target: any, prop: string): any {
    if (!target.__pymport_proxy__) target.__pymport_proxy__ = {};
    if (target.__pymport_proxy__[prop]) return target.__pymport_proxy__[prop];

    let r;
    if (target[prop]) {
      if (typeof target[prop] === 'function') {
        r = () => target[prop]();
        Object.defineProperty(r, 'name', { value: prop, writable: false });
      } else {
        r = target[prop];
      }
    } else {
      const attr = target.get(prop);

      if (attr.callable) {
        r = (...args: any[]) => {
          const r = attr.call(...args);
          return new Proxy(r, pymportProxy);
        };
        Object.defineProperty(r, 'name', { value: prop, writable: false });
      } else {
        r = attr;
      }
    }

    target.__pymport_proxy__[prop] = r;
    return target.__pymport_proxy__[prop];
  }
};

export default pymportProxy;
