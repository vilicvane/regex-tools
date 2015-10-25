var tagOpen = /</;
var tagName = /($tag:[a-z][^\s/>]*)/;

var spaces = /\s+/;
var optionalSpaces = /\s*/;

var attributeName = /[^=\s]+/;
var equalSign = /=/;
var quotedValue = /($quote:["'])(?:(?!($quote))[\s\S])*($quote)/;
var unquotedValue = /\S+/;

var attribute = [
    attributeName,
    {
        regexs: [
            optionalSpaces,
            equalSign,
            optionalSpaces,
            {
                regexs: [
                    quotedValue,
                    unquotedValue
                ],
                or: true
            }
        ],
        repeat: '?'
    }
];

var tagClose = /\/?>/;

var tag = [
    tagOpen,
    tagName,
    {
        regexs: [
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
    regexs: tag
};
