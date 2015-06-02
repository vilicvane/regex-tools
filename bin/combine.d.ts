export interface NestedRegexOptions {
    name?: string;
    or?: boolean;
    capture?: boolean;
    repeat?: string;
    regexs?: RegExp | NestedRegexArray | NestedRegexOptions;
}
export interface NestedRegexArray extends Array<RegExp | NestedRegexArray | NestedRegexOptions> {
}
export declare type NestedRegexs = NestedRegexArray | NestedRegexOptions;
export declare class CombinedResult {
    combined: string;
    groupNames: string[];
    groupNameToIndex: Dictionary<number>;
    groupNameHideMap: Dictionary<void>;
    constructor(combined: string, groupNames: string[], groupNameToIndex: Dictionary<number>, groupNameHideMap: Dictionary<void>);
    getStringLiteral(singleQuote?: boolean): string;
    getRegexLiteral({global, ignoreCase, multiline}?: any): string;
    getParametersSnippet({typed, matchName}: {
        typed?: boolean;
        matchName?: string;
    }): string;
    getGroupAliasDeclarationsSnippet({arrayName, useLet, newLine, lineIndent, matchName}?: any): string;
    getEnumDeclaration({useConst, name, newLine, lineIndent, indent}?: any): string;
}
export default function combine(regexs: NestedRegexs): CombinedResult;
