var RegexTools = require('../bld/index');

// remove the second argument (skipWrite) to actually update target source files.
var tagUpdated = RegexTools.process('tag-regex.js', true);
var stringLiteralUpdated = RegexTools.process('string-literal-regex.js', true);

console.log('tag.js');
console.log(tagUpdated);

console.log('string-literal.js');
console.log(stringLiteralUpdated);