# Regular Expression Tools [![Build Status](https://travis-ci.org/vilic/regex-tools.svg)](https://travis-ci.org/vilic/regex-tools)

I use regular expressions to do a lot of things, and managing a long regular expression could be painful.
So I write this simple tool to manage long and complex regular expressions such as regular expressions of lex parser.

### Install

```sh
npm install regex-tools --save-dev
```

### Create Options File

Create a `test-regex.js` file and write something like this.

```javascript
exports.options = {
    name: 'test',
    operation: 'combine',
    target: 'target.js', // support *.ts file, too
    global: true,
    regexes: [
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

Create a `target.js` and mark related code with `/* /$test/ */` (`$` followed by the name you configured in options file).

```typescript
let testRegex = /* /$test/ */ /./;

let groups = testRegex.exec('<abc123>');

/* /$test/ */
let text = groups[0];

'<def456>'.replace(testRegex, function /* /$test/ */ (text) {
	return text;
});
```

### A Basic Task

Create a task and run it.

```javascript
let Gulp = require('gulp');
let RegexTools = require('regex-tools');

let glob = require('glob');

Gulp.task('update-regex', function () {
    let optionsFiles = glob.sync('*-regex.rx');

    optionsFiles.forEach(function (path) {
        RegexTools.process(path);
    });
});
```

After that, `target.js` should look like:

```javascript
let testRegex = /* /$test/ */ /<(\w+)\d*>/g;

let groups = testRegex.exec('<abc123>');

/* /$test/ */
let text = groups[0];
let term = groups[1];

'<def456>'.replace(testRegex, function /* /$test/ */(text, term) {
	return text;
});
```

Problem solved! You may checkout demo for relatively more complex examples.

## API References

An options file is a node module that exports options. `exports.options` could be either `RxOptions` or `RxOptions[]`.

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
    regexes: NestedRegexes;
}

interface RxModule {
    options: RxOptions | RxOptions[];
}

type Lookahead = boolean | '=' | '!';

interface NestedRegexOptions {
	/** captured group name. */
    name?: string;
	/** whether to use `|`, default to false. */
    or?: boolean;
	/** whether to capture, default to false if `name` is not provided, otherwise true. */
    capture?: boolean;
    /** lookahead, `true` or `"="` for positive and `"!"` for negative. */
    lookahead?: Lookahead;
	/** ?, *, +, *?, +?, {1}, {1,}, {1,2} */
    repeat?: string;
    regexes: RegExp | NestedRegexArray | NestedRegexOptions;
}

interface NestedRegexArray
    extends Array<RegExp | NestedRegexArray | NestedRegexOptions> { }

type NestedRegexes = NestedRegexArray | NestedRegexOptions;
```

## Back Reference Tracking

If you are using back reference, it will keep the index updated. That means you should write back refenrences relative to the current part of regular expression.

The options below will result in `/(distraction)(["'])\2/`.

```js
exports.options = {
    name: 'test',
    operation: 'combine',
    target: 'target.js',
    regexes: [
		/(distraction)/,
        /(["'])\1/
	]
};
```

However as `\[number]` can also be a char with code in octal form, it's kind of complex to deal with. Please avoid writing a char (instead of a back reference) in this form.

## Named References

Another way to deal with back references is to use named references provided by the tool.

```js
exports.options = {
    name: 'test',
    operation: 'combine',
    target: 'target.js',
    regexes: [
		/($quote:["'])/,
        /.*?/,
        /($quote)/
	]
};
```

When generating group/parameter/enumerator list, the name of named reference (as well as name specified in `NestedRegexOptions`) will be exported according to its capture index.

For groups and enumerator list, if you don't want some of them to show up, you may add a `~` between `$` and name. Such as `($~quote:["'])`.

## Tips

When updating group array aliases, the index starts at either 0 or 1, depending on your code.

You may also use `require('regex-tools').combine()` for more flexible usage, please check out source code (as it's typed) for more information.

# License

MIT License.
