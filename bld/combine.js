/**
 * Regular Expression Tools
 * https://github.com/vilic/regex-tools
 *
 * by VILIC VANE
 * MIT License
 */
var hop = Object.prototype.hasOwnProperty;
var groupRegex = /\(\$(~?[\w$][\w\d$]*)(?:(:)(?!\?)|\)(?=(\d)?))|(\(\?)|(\()|(\))|(\|)|(\[)|(\])|\\(\d+)|\\.|./g;
var CombinedResult = (function () {
    function CombinedResult(combined, groupNames, groupNameToIndex, groupNameHideMap) {
        this.combined = combined;
        this.groupNames = groupNames;
        this.groupNameToIndex = groupNameToIndex;
        this.groupNameHideMap = groupNameHideMap;
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
    CombinedResult.prototype.getParametersSnippet = function (_a) {
        var _b = _a.typed, typed = _b === void 0 ? false : _b, _c = _a.matchName, matchName = _c === void 0 ? 'match' : _c;
        if (typed) {
            return this.groupNames.length ? "(" + matchName + ": string, " + this.groupNames.map(function (name) { return name + ': string'; }).join(', ') + ")" : "(" + matchName + ": string)";
        }
        else {
            return this.groupNames.length ? "(" + matchName + ", " + this.groupNames.join(', ') + ")" : "(" + matchName + ")";
        }
    };
    CombinedResult.prototype.getGroupAliasDeclarationsSnippet = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.arrayName, arrayName = _c === void 0 ? 'groups' : _c, _d = _b.useLet, useLet = _d === void 0 ? true : _d, _e = _b.newLine, newLine = _e === void 0 ? '\n' : _e, _f = _b.lineIndent, lineIndent = _f === void 0 ? '' : _f, _g = _b.matchName, matchName = _g === void 0 ? '' : _g;
        var lines = [];
        if (matchName) {
            lines.push((useLet ? 'let' : 'var') + " " + matchName + " = " + arrayName + "[0];");
        }
        var hideMap = this.groupNameHideMap;
        this.groupNames.forEach(function (name, index) {
            if (!hop.call(hideMap, name)) {
                lines.push((useLet ? 'let' : 'var') + " " + name + " = " + arrayName + "[" + (index + 1) + "];");
            }
        });
        return lines.join(newLine + lineIndent);
    };
    CombinedResult.prototype.getEnumDeclaration = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.useConst, useConst = _c === void 0 ? false : _c, _d = _b.name, name = _d === void 0 ? 'ExecGroup' : _d, _e = _b.newLine, newLine = _e === void 0 ? '\n' : _e, _f = _b.lineIndent, lineIndent = _f === void 0 ? '' : _f, _g = _b.indent, indent = _g === void 0 ? '    ' : _g;
        var lines = [];
        var hideMap = this.groupNameHideMap;
        var skipped = true; // skipped 0 as it starts from 1.
        this.groupNames.forEach(function (name, index) {
            if (hop.call(hideMap, name)) {
                skipped = true;
            }
            else if (skipped) {
                skipped = false;
                lines.push(name + " = " + (index + 1));
            }
            else {
                lines.push("" + name);
            }
        });
        return (((useConst ? 'const ' : '') + "enum " + name + " {" + newLine) +
            ("" + (lineIndent + indent) + lines.join(',' + newLine + lineIndent + indent) + newLine) +
            (lineIndent + "}"));
    };
    return CombinedResult;
})();
exports.CombinedResult = CombinedResult;
function combine(regexs) {
    var groupCount = 0;
    var groupNameToIndex = {};
    var groupNameHideMap = {};
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
    return new CombinedResult(combined, groupNames, groupNameToIndex, groupNameHideMap);
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
            var optionRegexs = regexs.regexs;
            if (optionRegexs instanceof Array) {
                regexArray = optionRegexs;
            }
            else {
                regexArray = [optionRegexs];
            }
            or = regexs.or;
            capture = !!name || regexs.capture;
            repeat = regexs.repeat || '';
            if (!/^(?:\?\??|[+*]\??|\{\d+\}|\{\d+,\d*\}\??)?$/.test(repeat)) {
                throw new Error("Invalid repeat option \"" + repeat + "\"");
            }
        }
        if (!regexArray.length) {
            return '(?:)';
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
                    //throw new Error(`Group name can not be in a character class "[...]" in regex #${regexIndex}`);
                    return match;
                }
                if (groupNameColon) {
                    var toHide = groupName.charAt(0) == '~';
                    if (toHide) {
                        groupName = groupName.substr(1);
                    }
                    var originalGroupName = groupName;
                    var suffixNumber = 2;
                    while (hop.call(groupNameToIndex, groupName)) {
                        groupName = originalGroupName + suffixNumber++;
                    }
                    if (toHide) {
                        groupNameHideMap[groupName] = null;
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = combine;
//# sourceMappingURL=combine.js.map