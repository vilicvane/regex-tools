/**
 * Regular Expression Tools
 * https://github.com/vilic/regex-tools
 *
 * by VILIC VANE
 * MIT License
 */

var hop = Object.prototype.hasOwnProperty;

export interface Dictionary<T> {
    [key: string]: T;
}

export interface NestedRegexOptions {
    name?: string;
    or?: boolean;
    capture?: boolean;
    limit?: string;
    regexs: NestedRegexArray;
}

export interface NestedRegexArray
    extends Array<RegExp|NestedRegexArray|NestedRegexOptions> { }

export type NestedRegexs = NestedRegexArray|NestedRegexOptions;

var groupRegex = /\(\$(\w[\w\d]*(?:-[\w\d]+)*)(?:(:)(?!\?)|\))|(\(\?)|(\()|(\))|(\|)|(\[)|(\])|\\(\d)|\\.|./g;

export class CombinedResult {
    constructor(
        public combined: string,
        public groupNames: string[],
        public groupNameToIndex: Dictionary<number>
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
    
    getGroupAliasDeclarationsSnippet({
        arrayName = 'groups',
        useLet = true,
        newLine = '\n',
        indent = '',
        matchName = ''
    } = <any>{}): string {
        var lines: string[] = [];

        if (matchName) {
            lines.push(`${useLet ? 'let' : 'var'} ${matchName} = ${arrayName}[0];`);
        }

        lines.push(...this.groupNames.map((name, index) => `${useLet ? 'let' : 'var'} ${name} = ${arrayName}[${index + 1}];`));

        return indent + lines.join(newLine + indent);
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
}

export default function combine(regexs: NestedRegexs): CombinedResult {
    var groupCount = 0;
    var groupNameToIndex: Dictionary<number> = {};

    var regexIndex = 0;

    var combined = processRegexs(regexs);

    var groupNames: string[] = [];

    for (var i = 0; i < groupCount; i++) {
        groupNames.push('g' + (i + 1));
    }
    
    for (let name of Object.keys(groupNameToIndex)) {
        groupNames[groupNameToIndex[name] - 1] = name.replace(/-([a-z])/ig, (m: string, g1: string) => g1.toUpperCase());
    }
    
    return new CombinedResult(combined, groupNames, groupNameToIndex);

    function processRegexs(regexs: NestedRegexs): string {
        var name: string;
        var regexArray: NestedRegexArray;
        var or: boolean;
        var capture: boolean;
        var limit: string;

        if (regexs instanceof Array) {
            regexArray = regexs;
            or = false;
            capture = false;
            limit = '';
        } else {
            name = (<NestedRegexOptions>regexs).name;
            regexArray = (<NestedRegexOptions>regexs).regexs;
            or = (<NestedRegexOptions>regexs).or;
            capture = !!name || (<NestedRegexOptions>regexs).capture;
            limit = (<NestedRegexOptions>regexs).limit || '';

            if (!/^(?:[?+*]|\{\d+(?:,\d*)?\})?$/.test(limit)) {
                throw new Error(`Invalid limit "${limit}"`);
            }
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
                    return processRegexs(<NestedRegexs>regex);
                }
            })
            .join(or ? '|' : '');
        
        combined = capture ?
            `(${combined})` :
            limit || (or && regexArray.length > 1) ?
                `(?:${combined})` : combined;
        
        return combined + limit;
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
                        throw new Error(`Group name can not be in a characer class in regex #${regexIndex}`);
                    }

                    if (groupNameColon) {
                        let originalGroupName = groupName;
                        let suffixNumber = 2;

                        while (hop.call(groupNameToIndex, groupName)) {
                            groupName = originalGroupName + suffixNumber++;
                        }
                        
                        bracketDepth++;
                        partialGroupCount++;
                        groupNameToIndex[groupName] = groupCount + partialGroupCount;
                        return '(';
                    } else if (hop.call(groupNameToIndex, groupName)) {
                        var index = groupNameToIndex[groupName];

                        if (index < 10) {
                            return '\\' + index;
                        } else {
                            throw new Error(`Back reference index (${groupName}:${index}) in regex #${regexIndex} exceeds limit`);
                        }
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

                    if (index < 10) {
                        return '\\' + index;
                    } else {
                        throw new Error(`Back reference index (${brNumber}->${index}) in regex #${regexIndex} exceeds limit`);
                    }
                }

                return match;
            });

        groupCount += partialGroupCount;

        return !upperOr && hasOrOutside ? `(?:${partialRegexStr})` : partialRegexStr;
    }
}
