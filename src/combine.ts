/**
 * Regular Expression Tools
 * https://github.com/vilic/regex-tools
 *
 * by VILIC VANE
 * MIT License
 */

var hop = Object.prototype.hasOwnProperty;

export interface NestedRegexOptions {
    name?: string;
    or?: boolean;
    capture?: boolean;
    repeat?: string;
    regexs?: RegExp|NestedRegexArray|NestedRegexOptions;
}

export interface NestedRegexArray
    extends Array<RegExp|NestedRegexArray|NestedRegexOptions> { }

export type NestedRegexs = NestedRegexArray|NestedRegexOptions;

var groupRegex = /\(\$(~?[\w$][\w\d$]*)(?:(:)(?!\?)|\)(?=(\d)?))|(\(\?)|(\()|(\))|(\|)|(\[)|(\])|\\(\d+)|\\.|./g;

export class CombinedResult {
    constructor(
        public combined: string,
        public groupNames: string[],
        public groupNameToIndex: Dictionary<number>,
        public groupNameHideMap: Dictionary<void>
    ) { }

    getStringLiteral(singleQuote = false): string {
        var literal = JSON.stringify(this.combined);

        if (singleQuote) {
            literal = literal
                .replace(/\\.|\\(")/g, (m: string, quote: string) => quote ? `\\'` : m)
                .replace(/"/g, `'`);
        }

        return literal;
    }
    
    getRegexLiteral({
        global = false,
        ignoreCase = false,
        multiline = false
    } = <any>{}): string {
        var literal = `/${this.combined.replace(/\\.|(\/)/g, (m: string, g1: string) => g1 ? '\\/' : m) }/`;

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
    }

    getParametersSnippet({
        typed = false,
        matchName = 'match'
    }): string {
        if (typed) {
            return this.groupNames.length ? `(${matchName}: string, ${this.groupNames.map(name => name + ': string').join(', ') })` : `(${matchName}: string)`;
        } else {
            return this.groupNames.length ? `(${matchName}, ${this.groupNames.join(', ') })` : `(${matchName})`;
        }
    }
    
    getGroupAliasDeclarationsSnippet({
        arrayName = 'groups',
        useLet = true,
        newLine = '\n',
        lineIndent = '',
        matchName = ''
    } = <any>{}): string {
        var lines: string[] = [];

        if (matchName) {
            lines.push(`${useLet ? 'let' : 'var'} ${matchName} = ${arrayName}[0];`);
        }

        var hideMap = this.groupNameHideMap;
        
        this.groupNames.forEach((name, index) => {
            if (!hop.call(hideMap, name)) {
                lines.push(`${useLet ? 'let' : 'var'} ${name} = ${arrayName}[${index + 1}];`);
            }
        });

        return lines.join(newLine + lineIndent);
    }

    getEnumDeclaration({
        useConst = false,
        name = 'ExecGroup',
        newLine = '\n',
        lineIndent = '',
        indent = '    '
    } = <any>{}): string {
        var lines: string[] = [];
        
        var hideMap = this.groupNameHideMap;
        var skipped = true; // skipped 0 as it starts from 1.

        this.groupNames.forEach((name, index) => {
            if (hop.call(hideMap, name)) {
                skipped = true;
            } else if (skipped) {
                skipped = false;
                lines.push(`${name} = ${index + 1}`);
            } else {
                lines.push(`${name}`);
            }
        });
        
        return (
            `${useConst ? 'const ' : ''}enum ${name} {${newLine}` +
            `${lineIndent + indent}${lines.join(',' + newLine + lineIndent + indent) }${newLine}` +
            `${lineIndent}}`
        );
    }
}

export default function combine(regexs: NestedRegexs): CombinedResult {
    var groupCount = 0;
    var groupNameToIndex: Dictionary<number> = {};
    var groupNameHideMap: Dictionary<void> = {};

    var regexIndex = 0;

    var combined = processRegexs(regexs, true);

    var groupNames: string[] = [];

    for (var i = 0; i < groupCount; i++) {
        groupNames.push('g' + (i + 1));
    }
    
    for (let name of Object.keys(groupNameToIndex)) {
        groupNames[groupNameToIndex[name] - 1] = name.replace(/-([a-z])/ig, (m: string, g1: string) => g1.toUpperCase());
    }
    
    return new CombinedResult(combined, groupNames, groupNameToIndex, groupNameHideMap);

    function processRegexs(regexs: NestedRegexs, upperOr: boolean): string {
        var name: string;
        var regexArray: NestedRegexArray;
        var or: boolean;
        var capture: boolean;
        var repeat: string;

        if (regexs instanceof Array) {
            regexArray = regexs;
            or = false;
            capture = false;
            repeat = '';
        } else {
            name = (<NestedRegexOptions>regexs).name;
            let optionRegexs = (<NestedRegexOptions>regexs).regexs;

            if (optionRegexs instanceof Array) {
                regexArray = optionRegexs;
            } else {
                regexArray = [optionRegexs];
            }
            
            or = (<NestedRegexOptions>regexs).or;
            capture = !!name || (<NestedRegexOptions>regexs).capture;
            repeat = (<NestedRegexOptions>regexs).repeat || '';

            if (!/^(?:\?|[+*]\??|\{\d+(?:,\d*)?\})?$/.test(repeat)) {
                throw new Error(`Invalid repeat option "${repeat}"`);
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
            .map(regex => {
                if (regex instanceof RegExp) {
                    return processPartialRegex(regex, or);
                } else {
                    return processRegexs(<NestedRegexs>regex, or);
                }
            })
            .join(or ? '|' : '');
        
        combined = capture ?
            `(${combined})` :
            repeat || (!upperOr && or && regexArray.length > 1) ?
                `(?:${combined})` : combined;
        
        return combined + repeat;
    }

    /**
     * divide and conquer
     */
    function processPartialRegex(regex: RegExp, upperOr: boolean): string {
        regexIndex++;

        var regexStr = regex.source;

        // syntax test
        try {
            new RegExp(regexStr);
        } catch (e) {
            e.message = `${e.message.replace(/^.+:\s?/, '')} in regex #${regexIndex}`;
            throw e;
        }

        // abc($name:) ($name)
        var partialGroupCount = 0;

        var sBraOpen = false;
        var bracketDepth = 0;
        // whether has | outside a group
        var hasOrOutside = false;

        var partialRegexStr = regexStr.replace(
            groupRegex, (
                match: string,
                groupName: string,
                groupNameColon: string,
                digitFollowsBR: string,
                braWithQ: string,
                bra: string,
                ket: string,
                or: string,
                sBra: string,
                sKet: string,
                brNumber: string
            ) => {
                if (groupName) {
                    if (sBraOpen) {
                        //throw new Error(`Group name can not be in a character class "[...]" in regex #${regexIndex}`);
                        return match;
                    }

                    if (groupNameColon) {
                        let toHide = groupName.charAt(0) == '~';

                        if (toHide) {
                            groupName = groupName.substr(1);
                        }

                        let originalGroupName = groupName;
                        let suffixNumber = 2;

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
                    } else if (hop.call(groupNameToIndex, groupName)) {
                        var index = groupNameToIndex[groupName];
                        return digitFollowsBR ? `(?:\\${index})` : `\\${index}`;
                    } else {
                        throw new Error(`Undefined group name "${groupName}" in regex #${regexIndex}`);
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
                    return `\\${index}`;
                }

                return match;
            });

        groupCount += partialGroupCount;

        return !upperOr && hasOrOutside ? `(?:${partialRegexStr})` : partialRegexStr;
    }
}
