/*!
 * Regular Expression Tools
 * https://github.com/vilic/regex-tools
 */

import * as Path from 'path';
import * as FS from 'fs';

import combine, { CombinedResult, NestedRegexes } from './combine';

export { default as combine, NestedRegexes } from './combine';

interface RxOptions {
    name: string;
    target: string;
    operation: string;
    global?: boolean;
    multiline?: boolean;
    ignoreCase?: boolean;
    regexes: NestedRegexes;
}

interface RxModule {
    options: RxOptions | RxOptions[];
}

interface OutputCache {
    original: string;
    text: string;
}

interface TextStyle {
    indent: string;
    newLine: string;
}

const REGEX_LITERAL_REGEX = /(\/(?:[^\r\n\u2028\u2029*/\[\\]|\\[^\r\n\u2028\u2029]|\[(?:[^\r\n\u2028\u2029\]\\]|\\[^\r\n\u2028\u2029])*\])(?:[^\r\n\u2028\u2029/\[\\]|\\[^\r\n\u2028\u2029]|\[(?:[^\r\n\u2028\u2029\]\\]|\\[^\r\n\u2028\u2029])*\])*\/[gimy]{0,4})/;
const PARAMS_REGEX = /(\((?:(\s*)([\w$][\w\d$]*)(?:\s*:\s*string)?)?(?:(\s*,\s*)[^)]*\S)?(\s*)\))/;
const GROUPS_REGEX = /(var|let)\s+([\w$][\w\d$]*)\s*=\s*($groupName:[\w$][\w\d$]*)\s*\[\s*(\d+)\s*\]\s*;(?:\s*(?:var|let)\s+[\w$][\w\d$]*\s*=\s*($groupName)\s*\[\s*\d+\s*\]\s*;)*/;
const ENUM_REGEX = /(const\s+)?enum\s+([\w$][\w\d$]*)\s*\{[^}]*\}/;

export function process(path: string, skipWrite = false): string | string[] {
    path = Path.resolve(path);
    let dir = Path.dirname(path);

    let rxModule: RxModule = require(path);

    let rxOptions = rxModule.options;
    let optionGroups = rxOptions instanceof Array ? rxOptions : [rxOptions];

    let cacheMap: Dictionary<OutputCache> = {};
    let targets: string[] = [];

    for (let options of optionGroups) {
        let {
            name,
            target,
            operation,
            global,
            ignoreCase,
            multiline,
            regexes
        } = options;

        target = Path.resolve(dir, target);
        targets.push(target);

        let cache = cacheMap[target];

        let text: string;

        if (cache) {
            text = cache.text;
        } else {
            text = FS.readFileSync(target, 'utf-8');

            cache = cacheMap[target] = {
                original: text,
                text
            };
        }
        
        let { newLine, indent } = detectTextStyle(text);

        let result: CombinedResult;

        switch (operation) {
            case 'combine':
                result = combine(regexes);
                break;
            default:
                continue;
        }

        let matcherCommentRegex = new RegExp(`([ \\t]*)(/\\*\\s*/\\$${name}/\\s*\\*/\\s*)`);

        let matcherRegex = eval(
            combine([
                matcherCommentRegex,
                {
                    regexes: [
                        REGEX_LITERAL_REGEX,
                        PARAMS_REGEX,
                        GROUPS_REGEX,
                        ENUM_REGEX
                    ],
                    or: true
                }
            ]).getRegexLiteral({
                global: true
            })
        ) as RegExp;

        let updatedText = text.replace(matcherRegex, (
            text: string,
            lineIndent: string,
            prefix: string,
            literal: string,
            params: string,
            whitespacesBeforeParams: string,
            firstParamName: string,
            separatorBetweenParams: string,
            whitespacesAfterParams: string,
            groupDeclarationsKeyword: string,
            firstGroupName: string,
            groupArrayName: string,
            firstGroupIndex: string,
            constEnum: string,
            enumName: string
        ) => {
            if (literal) {
                return `${lineIndent}${prefix}${result.getRegexLiteral({
                    global,
                    ignoreCase,
                    multiline
                })}`;
            } else if (params) {
                let separator = whitespacesBeforeParams ?
                    ',' + whitespacesBeforeParams :
                    separatorBetweenParams || ', ';
                
                return `${lineIndent}${prefix}(${whitespacesBeforeParams}${
                    result.getParametersSnippet({
                        typed: /\.ts$/i.test(target),
                        matchName: firstParamName,
                        separator
                    })
                }${whitespacesAfterParams})`;
            } else if (groupDeclarationsKeyword) {
                return `${lineIndent}${prefix}${result.getGroupAliasDeclarationsSnippet({
                    useLet: groupDeclarationsKeyword === 'let',
                    arrayName: groupArrayName,
                    newLine,
                    lineIndent,
                    matchName: firstGroupIndex === '0' ? firstGroupName : undefined
                })}`;
            } else if (enumName) {
                return `${lineIndent}${prefix}${result.getEnumDeclaration({
                    useConst: !!constEnum,
                    name: enumName,
                    newLine,
                    lineIndent,
                    indent
                })}`;
            } else {
                return text;
            }
        });

        if (updatedText !== text) {
            cache.text = updatedText;
        }
    }
    
    if (!skipWrite) {
        for (let path of Object.keys(cacheMap)) {
            let cache = cacheMap[path];

            if (cache.text !== cache.original) {
                FS.writeFileSync(path, cache.text);
            }
        }
    }

    let updatedTexts = targets.map(target => cacheMap[target].text);

    return rxOptions instanceof Array ? updatedTexts : updatedTexts[0];
}

function detectTextStyle(text: string): TextStyle {
    let indentSpaces: string[] = text.match(/^[ \t]+/gm) || [];
    let tabCount = 0;

    let lastIndentLength: number | undefined;

    let lengthToCount: number[] = [];

    for (let indentSpace of indentSpaces) {
        if (/\t/.test(indentSpace)) {
            tabCount++;
        } else {
            let length = indentSpace.length;

            if (lastIndentLength !== undefined && length > lastIndentLength) {
                let indentDiff = length - lastIndentLength;
                lengthToCount[indentDiff] = (lengthToCount[indentDiff] || 0) + 1;
            }

            lastIndentLength = length; 
        }
    }

    let indent: string;

    if (tabCount < indentSpaces.length / 2) {
        let indentInfos = lengthToCount
            .map((count, length) => ({
                count,
                length
            }))
            .sort((a, b) => b.count - a.count);

        if (indentInfos.length) {
            indent = Array(indentInfos[0].length + 1).join(' ');
        } else {
            indent = '    ';
        }
    } else {
        indent = '\t';
    }

    let newLine = (text.match(/\r/g) || []).length / (text.match(/\n/g) || []).length < 0.5 ? '\n' : '\r\n';

    return {
        indent,
        newLine
    };
}
