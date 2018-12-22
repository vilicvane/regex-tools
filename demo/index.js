'use strict';

const Path = require('path');

const RegexTools = require('../bld/library');

const names = ['tag', 'string-literal'];

for (let name of names) {
  let sourceFilePath = Path.join(__dirname, name + '.js');
  let regexFilePath = Path.join(__dirname, name + '-regex.js');

  console.log(Array(80).join('='));
  console.log('SOURCE FILE', sourceFilePath);
  console.log(Array(80).join('='));
  console.log();
  // remove the second argument (skipWrite) to actually update target source files.
  console.log(RegexTools.process(regexFilePath, true));
}
