/**
 * Regular Expression Tools
 * https://github.com/vilic/regex-tools
 *
 * by VILIC VANE
 * MIT License
 */
var hop = Object.prototype.hasOwnProperty;
var groupRegex = /\(\$(\w[\w\d]*(?:-[\w\d]+)*)(?:(:)(?!\?)|\)(?=(\d)?))|(\(\?)|(\()|(\))|(\|)|(\[)|(\])|\\(\d+)|\\.|./g;
var CombinedResult = (function () {
    function CombinedResult(combined, groupNames, groupNameToIndex) {
        this.combined = combined;
        this.groupNames = groupNames;
        this.groupNameToIndex = groupNameToIndex;
    }
    CombinedResult.prototype.getStringLiteral = function (singleQuote) {
        if (singleQuote === void 0) { singleQuote = false; }
        var literal = JSON.stringify(this.combined);
        if (singleQuote) {
            literal = literal
                .replace(/\\.|\\(")/g, function (m, quote) { return quote ? "\\'" : m; })
                .replace(/"/g, "'");
        }
        return literal;
    };
    CombinedResult.prototype.getRegexLiteral = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.global, global = _c === void 0 ? false : _c, _d = _b.ignoreCase, ignoreCase = _d === void 0 ? false : _d, _e = _b.multiline, multiline = _e === void 0 ? false : _e;
        var literal = "/" + this.combined.replace(/\\.|(\/)/g, function (m, g1) { return g1 ? '\\/' : m; }) + "/";
        if (global) {
            literal += 'g';
        }
        if (ignoreCase) {
            literal += 'i';
        }
        if (multiline) {
            literal += 'm';
        }
        return literal;
    };
    CombinedResult.prototype.getGroupAliasDeclarationsSnippet = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.arrayName, arrayName = _c === void 0 ? 'groups' : _c, _d = _b.useLet, useLet = _d === void 0 ? true : _d, _e = _b.newLine, newLine = _e === void 0 ? '\n' : _e, _f = _b.indent, indent = _f === void 0 ? '' : _f, _g = _b.matchName, matchName = _g === void 0 ? '' : _g;
        var lines = [];
        if (matchName) {
            lines.push((useLet ? 'let' : 'var') + " " + matchName + " = " + arrayName + "[0];");
        }
        lines.push.apply(lines, this.groupNames.map(function (name, index) { return ((useLet ? 'let' : 'var') + " " + name + " = " + arrayName + "[" + (index + 1) + "];"); }));
        return lines.join(newLine + indent);
    };
    CombinedResult.prototype.getParametersSnippet = function (_a) {
        var _b = _a.typed, typed = _b === void 0 ? false : _b, _c = _a.matchName, matchName = _c === void 0 ? 'match' : _c;
        if (typed) {
            return this.groupNames.length ? "(" + matchName + ": string, " + this.groupNames.map(function (name) { return name + ': string'; }).join(', ') + ")" : "(" + matchName + ": string)";
        }
        else {
            return this.groupNames.length ? "(" + matchName + ", " + this.groupNames.join(', ') + ")" : "(" + matchName + ")";
        }
    };
    return CombinedResult;
})();
exports.CombinedResult = CombinedResult;
function combine(regexs) {
    var groupCount = 0;
    var groupNameToIndex = {};
    var regexIndex = 0;
    var combined = processRegexs(regexs, true);
    var groupNames = [];
    for (var i = 0; i < groupCount; i++) {
        groupNames.push('g' + (i + 1));
    }
    for (var _i = 0, _a = Object.keys(groupNameToIndex); _i < _a.length; _i++) {
        var name_1 = _a[_i];
        groupNames[groupNameToIndex[name_1] - 1] = name_1.replace(/-([a-z])/ig, function (m, g1) { return g1.toUpperCase(); });
    }
    return new CombinedResult(combined, groupNames, groupNameToIndex);
    function processRegexs(regexs, upperOr) {
        var name;
        var regexArray;
        var or;
        var capture;
        var repeat;
        if (regexs instanceof Array) {
            regexArray = regexs;
            or = false;
            capture = false;
            repeat = '';
        }
        else {
            name = regexs.name;
            regexArray = regexs.regexs;
            if (!regexArray) {
                regexArray = [regexs.regex];
                if (!regexArray) {
                    throw new Error('At least one of `regexs` or `regex` needs to be provided');
                }
            }
            or = regexs.or;
            capture = !!name || regexs.capture;
            repeat = regexs.repeat || '';
            if (!/^(?:\?|[+*]\??|\{\d+(?:,\d*)?\})?$/.test(repeat)) {
                throw new Error("Invalid repeat option \"" + repeat + "\"");
            }
        }
        if (capture) {
            groupCount++;
            if (name) {
                groupNameToIndex[name] = groupCount;
            }
        }
        var combined = regexArray
            .map(function (regex) {
            if (regex instanceof RegExp) {
                return processPartialRegex(regex, or);
            }
            else {
                return processRegexs(regex, or);
            }
        })
            .join(or ? '|' : '');
        combined = capture ?
            "(" + combined + ")" :
            repeat || (!upperOr && or && regexArray.length > 1) ?
                "(?:" + combined + ")" : combined;
        return combined + repeat;
    }
    /**
     * divide and conquer
     */
    function processPartialRegex(regex, upperOr) {
        regexIndex++;
        var regexStr = regex.source;
        // syntax test
        try {
            new RegExp(regexStr);
        }
        catch (e) {
            e.message = e.message.replace(/^.+:\s?/, '') + " in regex #" + regexIndex;
            throw e;
        }
        // abc($name:) ($name)
        var partialGroupCount = 0;
        var sBraOpen = false;
        var bracketDepth = 0;
        // whether has | outside a group
        var hasOrOutside = false;
        var partialRegexStr = regexStr.replace(groupRegex, function (match, groupName, groupNameColon, digitFollowsBR, braWithQ, bra, ket, or, sBra, sKet, brNumber) {
            if (groupName) {
                if (sBraOpen) {
                    throw new Error("Group name can not be in a characer class in regex #" + regexIndex);
                }
                if (groupNameColon) {
                    var originalGroupName = groupName;
                    var suffixNumber = 2;
                    while (hop.call(groupNameToIndex, groupName)) {
                        groupName = originalGroupName + suffixNumber++;
                    }
                    bracketDepth++;
                    partialGroupCount++;
                    groupNameToIndex[groupName] = groupCount + partialGroupCount;
                    return '(';
                }
                else if (hop.call(groupNameToIndex, groupName)) {
                    var index = groupNameToIndex[groupName];
                    return digitFollowsBR ? "(?:\\" + index + ")" : "\\" + index;
                }
                else {
                    throw new Error("Undefined group name \"" + groupName + "\" in regex #" + regexIndex);
                }
            }
            if (braWithQ) {
                if (!sBraOpen) {
                    bracketDepth++;
                }
                return match;
            }
            if (bra) {
                if (!sBraOpen) {
                    bracketDepth++;
                    partialGroupCount++;
                }
                return match;
            }
            if (ket) {
                if (!sBraOpen) {
                    bracketDepth--;
                }
                return match;
            }
            if (or) {
                if (!hasOrOutside && !sBraOpen && bracketDepth == 0) {
                    hasOrOutside = true;
                }
                return match;
            }
            if (sBra) {
                if (!sBraOpen) {
                    sBraOpen = true;
                }
                return match;
            }
            if (sKet) {
                if (sBraOpen) {
                    sBraOpen = false;
                }
                return match;
            }
            if (brNumber) {
                var index = Number(brNumber);
                index += groupCount;
                return "\\" + index;
            }
            return match;
        });
        groupCount += partialGroupCount;
        return !upperOr && hasOrOutside ? "(?:" + partialRegexStr + ")" : partialRegexStr;
    }
}
exports.default = combine;
//# sourceMappingURL=combine.js.map