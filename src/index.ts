/**
 * Regular Expression Tools
 * https://github.com/vilic/regex-tools
 *
 * by VILIC VANE
 * MIT License
 */

import * as Path from 'path';
import * as FS from 'fs';

import rxCombine, { CombinedResult, NestedRegexs } from './combine';

export var combine = rxCombine;

interface RxOptions {
    name: string;
    target: string;
    operation: string;
    global?: boolean;
    multiline?: boolean;
    ignoreCase?: boolean;
    regexs: NestedRegexs;
}

interface RxModule {
    options: RxOptions|RxOptions[];
}

interface OutputCache {
    original: string;
    text: string;
}

var regexLiteralRegex = /(\/(?:[^\r\n\u2028\u2029*/\[\\]|\\[^\r\n\u2028\u2029]|\[(?:[^\r\n\u2028\u2029\]\\]|\\[^\r\n\u2028\u2029])*\])(?:[^\r\n\u2028\u2029/\[\\]|\\[^\r\n\u2028\u2029]|\[(?:[^\r\n\u2028\u2029\]\\]|\\[^\r\n\u2028\u2029])*\])*\/[gimy]{0,4})/;
var paramsRegex = /(\((?:([\w$][\w\d$]*)(?:\s*:\s*string)?)?[^)]*\))/;
var groupsRegex = /\s*(var|let)\s+([\w$][\w\d$]*)\s*=\s*($groupName:[\w$][\w\d$]*)\s*\[\s*(\d+)\s*\]\s*;(?:\s*(?:var|let)\s+[\w$][\w\d$]*\s*=\s*($groupName)\s*\[\s*\d+\s*\]\s*;)*/;

export function processRxFile(path: string, skipWrite = false): string|string[] {
    path = Path.resolve(path);
    var dir = Path.dirname(path);

    var rxModule: RxModule = require(path);

    var rxOptions = rxModule.options;
    var isOptionsArray = rxOptions instanceof Array;
    var optionGroups = isOptionsArray ? <RxOptions[]>rxOptions : [<RxOptions>rxOptions];

    var cacheMap: Dictionary<OutputCache> = {};
    var targets: string[] = [];

    optionGroups.forEach(options => {
        var {
            name,
            target,
            operation,
            global,
            ignoreCase,
            multiline,
            regexs
        } = options;

        target = Path.resolve(dir, target);
        targets.push(target);

        var cache = cacheMap[target];

        var text: string;

        if (cache) {
            text = cache.text;
        } else {
            text = FS.readFileSync(target, 'utf-8');

            cache = cacheMap[target] = {
                original: text,
                text
            };
        }
        
        var newLine = (text.match(/\r/g) || []).length / (text.match(/\n/g) || []).length < 0.5 ? '\n' : '\r\n';

        var result: CombinedResult;

        switch (operation) {
            case 'combine':
                result = combine(regexs);
                break;
            default:
                return;
        }

        var matcherCommentRegex = new RegExp(`([ \\t]*)(/\\*\\s*/\\$${name}/\\s*\\*/\\s*)`);

        var matcherRegex =
            <RegExp>eval(combine([
                matcherCommentRegex,
                {
                    regexs: [regexLiteralRegex, paramsRegex, groupsRegex],
                    or: true
                }
            ]).getRegexLiteral({
                global: true
            }));

        var updatedText = text.replace(matcherRegex, function(match: string, indent: string, prefix: string, literal: string, params: string, firstParamName: string, groupDeclarationsKeyword: string, firstGroupName: string, groupArrayName: string, firstGroupIndex: string) {
            if (literal) {
                return `${indent}${prefix}${result.getRegexLiteral({
                    global,
                    ignoreCase,
                    multiline
                })}`;
            } else if (params) {
                return `${indent}${prefix}${result.getParametersSnippet({
                    typed: /\.ts$/i.test(target),
                    matchName: firstParamName
                })}`;
            } else if (groupDeclarationsKeyword) {
                return `${indent}${prefix}${result.getGroupAliasDeclarationsSnippet({
                    useLet: groupDeclarationsKeyword == 'let',
                    arrayName: groupArrayName,
                    newLine,
                    indent,
                    matchName: firstGroupIndex == '0' ? firstGroupName : undefined
                })}`;
            } else {
                return match;
            }
        });

        if (updatedText != text) {
            cache.text = updatedText;
        }
    });
    
    if (!skipWrite) {
        for (let path of Object.keys(cacheMap)) {
            let cache = cacheMap[path];

            if (cache.text != cache.original) {
                FS.writeFileSync(path, cache.text);
            }
        }
    }

    var updatedTexts = targets.map(target => cacheMap[target].text);

    return isOptionsArray ? updatedTexts : updatedTexts[0];
}
