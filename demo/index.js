var RegexTools = require('../bin/index');

// remove the second argument (skipWrite) to actually update target source files.
var tagUpdated = RegexTools.processRxFile('tag.rx', true);
var stringLiteralUpdated = RegexTools.processRxFile('string-literal.rx', true);

console.log('tag.js');
console.log(tagUpdated);

console.log('string-literal.js');
console.log(stringLiteralUpdated);