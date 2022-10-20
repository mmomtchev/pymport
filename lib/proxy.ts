const pymportProxy = {
  get(target: any, prop: string): any {
    if (['toJS', 'get', 'call'].includes(prop))
      return () => target[prop]();

    const attr = target.get(prop);

    if (attr.callable)
      return (...args: any[]) => {
        const r = attr.call(...args);
        return new Proxy(r, pymportProxy);
      };

    return attr;
  }
};

export default pymportProxy;
