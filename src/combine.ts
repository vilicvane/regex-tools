/**
 * Regular Expression Tools
 * https://github.com/vilic/regex-tools
 *
 * by VILIC VANE
 * MIT License
 */

const hop = Object.prototype.hasOwnProperty;

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

const groupRegex = /\(\$(~?[\w$][\w\d$]*)(?:(:)(?!\?)|\)(?=(\d)?))|(\(\?)|(\()|(\))|(\|)|(\[)|(\])|\\(\d+)|\\.|./g;

export class CombinedResult {
    constructor(
        public combined: string,
        public groupNames: string[],
        public groupNameToIndex: Dictionary<number>,
        public groupNameHideMap: Dictionary<void>
    ) { }
    
    getRegexLiteral({
        global = false,
        ignoreCase = false,
        multiline = false
    } = <any>{}): string {
        let literal = `/${this.combined.replace(/\\.|(\/)/g, (m: string, g1: string) => g1 ? '\\/' : m) }/`;

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
        matchName = 'text',
        separator = ', '
    }): string {
        let names = [matchName].concat(this.groupNames);
        
        if (typed) {
            return names.map(name => name + ': string').join(separator);
        } else {
            return names.join(separator);
        }
    }
    
    getGroupAliasDeclarationsSnippet({
        arrayName = 'groups',
        useLet = true,
        newLine = '\n',
        lineIndent = '',
        matchName = ''
    } = <any>{}): string {
        let lines: string[] = [];

        if (matchName) {
            lines.push(`${useLet ? 'let' : 'var'} ${matchName} = ${arrayName}[0];`);
        }

        let hideMap = this.groupNameHideMap;
        
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
        let lines: string[] = [];
        
        let hideMap = this.groupNameHideMap;
        let skipped = true; // skipped 0 as it starts from 1.

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
    let groupCount = 0;
    let groupNameToIndex: Dictionary<number> = {};
    let groupNameHideMap: Dictionary<void> = {};

    let regexIndex = 0;

    let combined = processRegexs(regexs, true);

    let groupNames: string[] = [];

    for (let i = 0; i < groupCount; i++) {
        groupNames.push('g' + (i + 1));
    }
    
    for (let name of Object.keys(groupNameToIndex)) {
        groupNames[groupNameToIndex[name] - 1] = name.replace(/-([a-z])/ig, (m: string, g1: string) => g1.toUpperCase());
    }
    
    return new CombinedResult(combined, groupNames, groupNameToIndex, groupNameHideMap);

    function processRegexs(regexs: NestedRegexs, upperOr: boolean): string {
        let name: string;
        let regexArray: NestedRegexArray;
        let or: boolean;
        let capture: boolean;
        let repeat: string;
        
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

            if (!/^(?:\?\??|[+*]\??|\{\d+\}|\{\d+,\d*\}\??)?$/.test(repeat)) {
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
        
        let combined = regexArray
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

        let regexStr = regex.source;

        // syntax test
        try {
            new RegExp(regexStr);
        } catch (e) {
            e.message = `${e.message.replace(/^.+:\s?/, '')} in regex #${regexIndex}`;
            throw e;
        }

        // abc($name:) ($name)
        let partialGroupCount = 0;

        let sBraOpen = false;
        let bracketDepth = 0;
        // whether has | outside a group
        let hasOrOutside = false;

        let partialRegexStr = regexStr.replace(
            groupRegex, (
                text: string,
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
                        return text;
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
                        let index = groupNameToIndex[groupName];
                        return digitFollowsBR ? `(?:\\${index})` : `\\${index}`;
                    } else {
                        throw new Error(`Undefined group name "${groupName}" in regex #${regexIndex}`);
                    }
                }

                if (braWithQ) {
                    if (!sBraOpen) {
                        bracketDepth++;
                    }
                    return text;
                }

                if (bra) {
                    if (!sBraOpen) {
                        bracketDepth++;
                        partialGroupCount++;
                    }
                    return text;
                }

                if (ket) {
                    if (!sBraOpen) {
                        bracketDepth--;
                    }
                    return text;
                }

                if (or) {
                    if (!hasOrOutside && !sBraOpen && bracketDepth == 0) {
                        hasOrOutside = true;
                    }
                    return text;
                }

                if (sBra) {
                    if (!sBraOpen) {
                        sBraOpen = true;
                    }
                    return text;
                }

                if (sKet) {
                    if (sBraOpen) {
                        sBraOpen = false;
                    }
                    return text;
                }

                if (brNumber) {
                    let index = Number(brNumber);
                    index += groupCount;
                    return `\\${index}`;
                }

                return text;
            });

        groupCount += partialGroupCount;

        return !upperOr && hasOrOutside ? `(?:${partialRegexStr})` : partialRegexStr;
    }
}
