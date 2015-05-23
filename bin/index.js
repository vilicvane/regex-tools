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
exports.combine = combine_1.default;
var regexLiteralRegex = /(\/(?:[^\r\n\u2028\u2029*/\[\\]|\\[^\r\n\u2028\u2029]|\[(?:[^\r\n\u2028\u2029\]\\]|\\[^\r\n\u2028\u2029])*\])(?:[^\r\n\u2028\u2029/\[\\]|\\[^\r\n\u2028\u2029]|\[(?:[^\r\n\u2028\u2029\]\\]|\\[^\r\n\u2028\u2029])*\])*\/[gimy]{0,4})/;
var paramsRegex = /(\((?:([\w$][\w\d$]*)(?:\s*:\s*string)?)?[^)]*\))/;
var groupsRegex = /\s*(var|let)\s+([\w$][\w\d$]*)\s*=\s*($groupName:[\w$][\w\d$]*)\s*\[\s*(\d+)\s*\]\s*;(?:\s*(?:var|let)\s+[\w$][\w\d$]*\s*=\s*($groupName)\s*\[\s*\d+\s*\]\s*;)*/;
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
        var newLine = (text.match(/\r/g) || []).length / (text.match(/\n/g) || []).length < 0.5 ? '\n' : '\r\n';
        var result;
        switch (operation) {
            case 'combine':
                result = exports.combine(regexs);
                break;
            default:
                return;
        }
        var matcherCommentRegex = new RegExp("([ \\t]*)(/\\*\\s*/\\$" + name + "/\\s*\\*/\\s*)");
        var matcherRegex = eval(exports.combine([
            matcherCommentRegex,
            {
                regexs: [regexLiteralRegex, paramsRegex, groupsRegex],
                or: true
            }
        ]).getRegexLiteral({
            global: true
        }));
        var updatedText = text.replace(matcherRegex, function (match, indent, prefix, literal, params, firstParamName, groupDeclarationsKeyword, firstGroupName, groupArrayName, firstGroupIndex) {
            if (literal) {
                return "" + indent + prefix + result.getRegexLiteral({
                    global: global,
                    ignoreCase: ignoreCase,
                    multiline: multiline
                });
            }
            else if (params) {
                return "" + indent + prefix + result.getParametersSnippet({
                    typed: /\.ts$/i.test(target),
                    matchName: firstParamName
                });
            }
            else if (groupDeclarationsKeyword) {
                return "" + indent + prefix + result.getGroupAliasDeclarationsSnippet({
                    useLet: groupDeclarationsKeyword == 'let',
                    arrayName: groupArrayName,
                    newLine: newLine,
                    indent: indent,
                    matchName: firstGroupIndex == '0' ? firstGroupName : undefined
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
//# sourceMappingURL=index.js.map