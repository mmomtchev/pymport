import { version } from 'pymport';

console.log(`pymport: ${version.pymport.major}.${version.pymport.minor}.${version.pymport.patch}`);
console.log(
  `Python library: (${version.pythonLibrary.builtin ? 'builtin' : 'system'}) ` +
  `${version.pythonLibrary.major}.${version.pythonLibrary.minor}.${version.pythonLibrary.micro}.` +
  `${version.pythonLibrary.release}.${version.pythonLibrary.serial}`
);
console.log(`Python home: ${version.pythonHome || 'default from library'}`);
console.log('');
