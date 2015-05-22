# Regular Expression Tools

I use regular expressions to do a lot of things, and managing a long regular expression could be painful.
So I write this simple tool to manage long and complex regular expressions such as regular expressions of lex parser.

### Install

```sh
npm install regex-tools --save-dev
```

### RX File

Create a `test.rx` file and write something like this.

```javascript
exports.options = {
    name: 'test',
    operation: 'combine',
    target: 'target.js', // support *.ts file, too
    global: true,
    regexs: [
		/</,
		[
			/($term:\w+)/,
			/\d*/
		],
		/>/
	]
};
```

### Source File

Create a `target.js` and mark related code with `/* /$test/ */` (`$` follows the name you configured in .rx file).

```typescript
var testRegex = /* /$test/ */ /./;

var groups = testRegex.exec('<abc123>');

/* /$test/ */
var text = groups[0];

'<def456>'.replace(testRegex, function /* /$test/ */(text) {
	return text;
});
```

### A Basic Task

Create a task and run it.

```javascript
var Gulp = require('gulp');
var RegexTools = require('regex-tools');

var glob = require('glob');

Gulp.task('update-regex', function () {
    var rxFiles = glob.sync('*.rx');

    rxFiles.forEach(function (path) {
        RegexTools.processRxFile(path);
    });
});
```

After that, `target.js` should look like:

```javascript
var testRegex = /* /$test/ */ /<(?:\w+\d*)>/g;

var groups = testRegex.exec('<abc123>');

/* /$test/ */
var text = groups[0];
var term = groups[1];

'<def456>'.replace(testRegex, function /* /$test/ */(text, term) {
	return text;
});
```

Problem solved! You may checkout demo for a relatively more complex example.

## API References

A .rx file is actually a node module that exports options. `module.options` could be either `RxOptions` or `RxOptions[]`.

And here's related type declarations:

```typescript
interface RxOptions {
	/** name that will match related tag in target source file. */
    name: string;
	/** target source file. */
    target: string;
	/** only "combine" so far. */
    operation: string;
    global?: boolean;
    multiline?: boolean;
    ignoreCase?: boolean;
    regexs: NestedRegexs;
}

interface RxModule {
    options: RxOptions|RxOptions[];
}

interface NestedRegexOptions {
	/** captured group name. */
    name?: string;
	/** whether to use `|`, default to false. */
    or?: boolean;
	/** whether to capture, default to false if `name` is not provided, otherwise true. */
    capture?: boolean;
	/** ?, *, +, {1}, {1,}, {1,2} */
    limit?: string;
    regexs: NestedRegexArray;
}

interface NestedRegexArray
    extends Array<RegExp|NestedRegexArray|NestedRegexOptions> { }

type NestedRegexs = NestedRegexArray|NestedRegexOptions;
```

## Tips

When updating group array aliases, the index start at either 0 or 1, depending on your code.

You may also use `require('regex-tools').combine()` for more flexible usage, please check out source code (as it's typed) for more information.

# License

MIT License.
