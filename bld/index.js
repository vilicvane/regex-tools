/**
 * Regular Expression Tools
 * https://github.com/vilic/regex-tools
 *
 * by VILIC VANE
 * MIT License
 */
var Path = require('path');
var FS = require('fs');
var combine_1 = require('./combine');
var combine_2 = require('./combine');
exports.combine = combine_2.default;
var regexLiteralRegex = /(\/(?:[^\r\n\u2028\u2029*/\[\\]|\\[^\r\n\u2028\u2029]|\[(?:[^\r\n\u2028\u2029\]\\]|\\[^\r\n\u2028\u2029])*\])(?:[^\r\n\u2028\u2029/\[\\]|\\[^\r\n\u2028\u2029]|\[(?:[^\r\n\u2028\u2029\]\\]|\\[^\r\n\u2028\u2029])*\])*\/[gimy]{0,4})/;
var paramsRegex = /(\((?:([\w$][\w\d$]*)(?:\s*:\s*string)?)?[^)]*\))/;
var groupsRegex = /(var|let)\s+([\w$][\w\d$]*)\s*=\s*($groupName:[\w$][\w\d$]*)\s*\[\s*(\d+)\s*\]\s*;(?:\s*(?:var|let)\s+[\w$][\w\d$]*\s*=\s*($groupName)\s*\[\s*\d+\s*\]\s*;)*/;
var enumRegex = /(const\s+)?enum\s+([\w$][\w\d$]*)\s*\{[^}]*\}/;
function processRxFile(path, skipWrite) {
    if (skipWrite === void 0) { skipWrite = false; }
    path = Path.resolve(path);
    var dir = Path.dirname(path);
    var rxModule = require(path);
    var rxOptions = rxModule.options;
    var isOptionsArray = rxOptions instanceof Array;
    var optionGroups = isOptionsArray ? rxOptions : [rxOptions];
    var cacheMap = {};
    var targets = [];
    optionGroups.forEach(function (options) {
        var name = options.name, target = options.target, operation = options.operation, global = options.global, ignoreCase = options.ignoreCase, multiline = options.multiline, regexs = options.regexs;
        target = Path.resolve(dir, target);
        targets.push(target);
        var cache = cacheMap[target];
        var text;
        if (cache) {
            text = cache.text;
        }
        else {
            text = FS.readFileSync(target, 'utf-8');
            cache = cacheMap[target] = {
                original: text,
                text: text
            };
        }
        var _a = detectTextStyle(text), newLine = _a.newLine, indent = _a.indent;
        var result;
        switch (operation) {
            case 'combine':
                result = combine_1.default(regexs);
                break;
            default:
                return;
        }
        var matcherCommentRegex = new RegExp("([ \\t]*)(/\\*\\s*/\\$" + name + "/\\s*\\*/\\s*)");
        var matcherRegex = eval(combine_1.default([
            matcherCommentRegex,
            {
                regexs: [
                    regexLiteralRegex,
                    paramsRegex,
                    groupsRegex,
                    enumRegex
                ],
                or: true
            }
        ]).getRegexLiteral({
            global: true
        }));
        var updatedText = text.replace(matcherRegex, function (match, lineIndent, prefix, literal, params, firstParamName, groupDeclarationsKeyword, firstGroupName, groupArrayName, firstGroupIndex, constEnum, enumName) {
            if (literal) {
                return "" + lineIndent + prefix + result.getRegexLiteral({
                    global: global,
                    ignoreCase: ignoreCase,
                    multiline: multiline
                });
            }
            else if (params) {
                return "" + lineIndent + prefix + result.getParametersSnippet({
                    typed: /\.ts$/i.test(target),
                    matchName: firstParamName
                });
            }
            else if (groupDeclarationsKeyword) {
                return "" + lineIndent + prefix + result.getGroupAliasDeclarationsSnippet({
                    useLet: groupDeclarationsKeyword == 'let',
                    arrayName: groupArrayName,
                    newLine: newLine,
                    lineIndent: lineIndent,
                    matchName: firstGroupIndex == '0' ? firstGroupName : undefined
                });
            }
            else if (enumName) {
                return "" + lineIndent + prefix + result.getEnumDeclaration({
                    useConst: !!constEnum,
                    name: enumName,
                    newLine: newLine,
                    lineIndent: lineIndent,
                    indent: indent
                });
            }
            else {
                return match;
            }
        });
        if (updatedText != text) {
            cache.text = updatedText;
        }
    });
    if (!skipWrite) {
        for (var _i = 0, _a = Object.keys(cacheMap); _i < _a.length; _i++) {
            var path_1 = _a[_i];
            var cache = cacheMap[path_1];
            if (cache.text != cache.original) {
                FS.writeFileSync(path_1, cache.text);
            }
        }
    }
    var updatedTexts = targets.map(function (target) { return cacheMap[target].text; });
    return isOptionsArray ? updatedTexts : updatedTexts[0];
}
exports.processRxFile = processRxFile;
function detectTextStyle(text) {
    var indentSpaces = text.match(/^[ \t]+/gm) || [];
    var tabCount = 0;
    var lastIndentLength;
    var lengthToCount = [];
    for (var _i = 0; _i < indentSpaces.length; _i++) {
        var indentSpace = indentSpaces[_i];
        if (/\t/.test(indentSpace)) {
            tabCount++;
        }
        else {
            var length_1 = indentSpace.length;
            if (lastIndentLength != undefined && length_1 > lastIndentLength) {
                var indentDiff = length_1 - lastIndentLength;
                lengthToCount[indentDiff] = (lengthToCount[indentDiff] || 0) + 1;
            }
            lastIndentLength = length_1;
        }
    }
    var indent;
    if (tabCount < indentSpaces.length / 2) {
        var indentInfos = lengthToCount
            .map(function (count, length) { return ({
            count: count,
            length: length
        }); })
            .sort(function (a, b) { return b.count - a.count; });
        if (indentInfos.length) {
            indent = Array(indentInfos[0].length + 1).join(' ');
        }
        else {
            indent = '    ';
        }
    }
    else {
        indent = '\t';
    }
    var newLine = (text.match(/\r/g) || []).length / (text.match(/\n/g) || []).length < 0.5 ? '\n' : '\r\n';
    return {
        indent: indent,
        newLine: newLine
    };
}
//# sourceMappingURL=index.js.map