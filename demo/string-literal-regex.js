/**
 * This is a sample of a regular expression that matches string literal (ES5).
 * https://github.com/vilic/regex-tools
 */

'use strict';

let quote = /($~quote:["'])/;
let matchQuote = /($quote)/;

let lineTerminator = /[\r\n\u2028\u2029]/;

let lineTerminatorSequence = /\r?\n|\r(?!\n)|[\u2028\u2029]/;

let singleEscapeChar = /['"\\bfnrtv]/;
let escapeChar = /['"\\bfnrtv\dxu]/;
let nonEscapeChar = /[^'"\\bfnrtv\dxu\r\n\u2028\u2029]/;

let hexEscapeSequence = /x[\da-fA-F]{2}/;
let unicodeEscapeSequence = /u[\da-fA-F]{4}/;

let zeroNotFollowedByDigit = /0(?!\d)/;

let charEscapeSequence = {
    regexes: [
        singleEscapeChar,
        nonEscapeChar
    ],
    or: true
};

let slashEscapeSequence = [
    /\\/, 
    {
        regexes: [
            charEscapeSequence,
            zeroNotFollowedByDigit,
            hexEscapeSequence,
            unicodeEscapeSequence
        ],
        or: true
    }
];

let lineContinuation = /\\(?:\r?\n|\r(?!\n)|[\u2028\u2029])/;

let unescapedStringChar = /(?!($quote)|[\\\r\n\u2028\u2029])[\s\S]/;

let optionalStringChars = {
    regexes: [
        unescapedStringChar,
        slashEscapeSequence,
        lineContinuation
    ],
    or: true,
    repeat: '*'
};

let stringLiteral = [
    quote,
    optionalStringChars,
    matchQuote
];

exports.options = {
    name: 'stringLiteral',
    operation: 'combine',
    target: 'string-literal.js',
    global: true,
    regexes: stringLiteral
};
