process.env['PYTHONPATH'] = __dirname;

import { version, pymport } from 'pymport';

console.log(`pymport: ` +
  `${version.pymport.major}.${version.pymport.minor}.${version.pymport.patch}` +
  `${version.pymport.suffix ? `-${version.pymport.suffix}` : ''}`);
console.log(
  `Python library: (${version.pythonLibrary.builtin ? 'builtin' : 'system'}) ` +
  `${version.pythonLibrary.major}.${version.pythonLibrary.minor}.${version.pythonLibrary.micro}.` +
  `${version.pythonLibrary.release}.${version.pythonLibrary.serial}`
);
console.log(`Python home: ${version.pythonHome || 'default from library'}`);
console.log('');

exports.mochaHooks = {
  afterEach: global.gc,
  afterAll: function () {
    if (process.env['PYTHONDUMP']) {
      const dump = pymport('dump');
      dump.get('memory_dump').call();
    }
  }
};
