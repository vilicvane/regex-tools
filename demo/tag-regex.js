'use strict';

let tagOpen = /</;
let tagName = /($tag:[a-z][^\s/>]*)/;

let spaces = /\s+/;
let optionalSpaces = /\s*/;

let attributeName = /[^=\s]+/;
let equalSign = /=/;
let quotedValue = /($quote:["'])(?:(?!($quote))[\s\S])*($quote)/;
let unquotedValue = /\S+/;

let attribute = [
    attributeName,
    {
        regexes: [
            optionalSpaces,
            equalSign,
            optionalSpaces,
            {
                regexes: [
                    quotedValue,
                    unquotedValue
                ],
                or: true
            }
        ],
        repeat: '?'
    }
];

let tagClose = /\/?>/;

let tag = [
    tagOpen,
    tagName,
    {
        regexes: [
            spaces,
            attribute
        ],
        repeat: '*'
    },
    optionalSpaces,
    tagClose
];

exports.options = {
    name: 'tag',
    operation: 'combine',
    target: 'tag.js',
    global: true,
    regexes: tag
};
