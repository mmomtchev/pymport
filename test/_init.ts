import { version } from 'pymport';
import { pymport } from 'pymport/proxified';
import wtf from 'wtfnode';

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

const sys = pymport('sys');
sys.path.insert(1, __dirname);

const interval = setInterval(() => wtf.dump(), 5000);
interval.unref();

exports.mochaHooks = {
  afterEach: global.gc,
  afterAll: function () {
    if (process.env['PYTHONDUMP']) {
      const dump = pymport('dump');
      dump.memory_dump();
    }
  }
};
