/*!
 * Regular Expression Tools
 * https://github.com/vilic/regex-tools
 */

export type Lookahead = boolean | '=' | '!';

export interface NestedRegexOptions {
    name?: string;
    or?: boolean;
    capture?: boolean;
    lookahead?: Lookahead;
    repeat?: string;
    regexes: RegExp | NestedRegexArray | NestedRegexOptions;
}

export interface NestedRegexArray
    extends Array<RegExp | NestedRegexArray | NestedRegexOptions> { }

export type NestedRegexes = NestedRegexArray | NestedRegexOptions;

const GROUP_REGEX = /\(\$(~?[\w$][\w\d$]*)(?:(:)(?!\?)|\)(?=(\d)?))|(\(\?)|(\()|(\))|(\|)|(\[)|(\])|\\(\d+)|\\.|./g;

export class CombinedResult {
    constructor(
        public combined: string,
        public groupNames: string[],
        public groupNameToIndex: Dictionary<number>,
        public groupNameHideMap: Dictionary<void>
    ) { }

    getRegexLiteral(flags?: string): string {
        let literal = `/${this.combined.replace(/\\.|(\/)/g, (m: string, g1: string) => g1 ? '\\/' : m) }/`;
        return literal + (flags || '');
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

        for (let [index, name] of this.groupNames.entries()) {
            if (!(name in hideMap)) {
                lines.push(`${useLet ? 'let' : 'var'} ${name} = ${arrayName}[${index + 1}];`);
            }
        }

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

        for (let [index, name] of this.groupNames.entries()) {
            if (name in hideMap) {
                skipped = true;
            } else if (skipped) {
                skipped = false;
                lines.push(`${name} = ${index + 1}`);
            } else {
                lines.push(`${name}`);
            }
        }

        return (
            `${useConst ? 'const ' : ''}enum ${name} {${newLine}` +
            `${lineIndent + indent}${lines.join(',' + newLine + lineIndent + indent) }${newLine}` +
            `${lineIndent}}`
        );
    }
}

export default function combine(regexes: NestedRegexes): CombinedResult {
    let groupCount = 0;
    let groupNameToIndex: Dictionary<number> = {};
    let groupNameHideMap: Dictionary<void> = {};

    let regexIndex = 0;

    let combined = processRegexes(regexes, true);

    let groupNames: string[] = [];

    for (let i = 0; i < groupCount; i++) {
        groupNames.push('g' + (i + 1));
    }

    for (let name of Object.keys(groupNameToIndex)) {
        groupNames[groupNameToIndex[name] - 1] = name.replace(/-([a-z])/ig, (m: string, g1: string) => g1.toUpperCase());
    }

    return new CombinedResult(combined, groupNames, groupNameToIndex, groupNameHideMap);

    function processRegexes(regexes: NestedRegexes, upperOr: boolean): string {
        let name: string | undefined;
        let regexArray: NestedRegexArray;
        let or: boolean;
        let capture: boolean;
        let lookahead: Lookahead;
        let repeat: string;

        if (regexes instanceof Array) {
            regexArray = regexes;
            or = false;
            capture = false;
            lookahead = false;
            repeat = '';
        } else {
            name = regexes.name;
            let optionRegexes = regexes.regexes;

            if (optionRegexes instanceof Array) {
                regexArray = optionRegexes;
            } else {
                regexArray = [optionRegexes];
            }

            or = !!regexes.or;
            capture = !!name || !!regexes.capture;
            lookahead = regexes.lookahead === true ? '=' : regexes.lookahead || false;
            repeat = regexes.repeat || '';

            if (!/^(?:\?\??|[+*]\??|\{\d+,\d*\}\??|\{\d+\})?$/.test(repeat)) {
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
                    return processRegexes(regex as NestedRegexes, or);
                }
            })
            .join(or ? '|' : '');

        combined = capture ?
            `(${combined})` :
            repeat || (!upperOr && or && regexArray.length > 1) ?
                `(?:${combined})` : combined;

        combined += repeat;

        if (lookahead) {
            combined = `(?${lookahead}${combined})`;
        }

        return combined;
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
            GROUP_REGEX, (
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
                        // throw new Error(`Group name can not be in a character class "[...]" in regex #${regexIndex}`);
                        return text;
                    }

                    if (groupNameColon) {
                        let toHide = groupName.charAt(0) === '~';

                        if (toHide) {
                            groupName = groupName.substr(1);
                        }

                        let originalGroupName = groupName;
                        let suffixNumber = 2;

                        while (groupName in groupNameToIndex) {
                            groupName = originalGroupName + suffixNumber++;
                        }

                        if (toHide) {
                            groupNameHideMap[groupName] = undefined;
                        }

                        bracketDepth++;
                        partialGroupCount++;
                        groupNameToIndex[groupName] = groupCount + partialGroupCount;
                        return '(';
                    } else if (groupName in groupNameToIndex) {
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
                    if (!hasOrOutside && !sBraOpen && bracketDepth === 0) {
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
