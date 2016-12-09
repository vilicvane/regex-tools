import { expect, assert } from 'chai';

import * as RegexTools from '../';

interface CombineTestCase {
    regexes: RegexTools.NestedRegexes;
    expect: RegExp;
}

let caseCategoryMap: Dictionary<Dictionary<CombineTestCase[]>> = {
    "(?:...) wrapping": {
        "should not wrap root |": [
            {
                regexes: {
                    regexes: [
                        /abc/,
                        /def/
                    ],
                    or: true
                },
                expect: /abc|def/
            }
        ],
        "should wrap combined regex that has | if its upper has no |": [
            {
                regexes: [
                    /biu/,
                    {
                        regexes: [
                            /abc/,
                            /def/
                        ],
                        or: true
                    },
                    /pia/
                ],
                expect: /biu(?:abc|def)pia/
            }
        ],
        "should not wrap combined regex that has | if its upper has |": [
            {
                regexes: {
                    regexes: [
                        /biu/,
                        {
                            regexes: [
                                /abc/,
                                /def/
                            ],
                            or: true
                        },
                        /pia/
                    ],
                    or: true
                },
                expect: /biu|abc|def|pia/
            }
        ],
        "should not wrap combined regex that has | if it's already been wrapped": [
            {
                regexes: [
                    /biu/,
                    {
                        regexes: [
                            /abc/,
                            /def/
                        ],
                        or: true,
                        capture: true
                    },
                    /pia/
                ],
                expect: /biu(abc|def)pia/
            },
            {
                regexes: [
                    /biu/,
                    {
                        regexes: [
                            /(abc|def)/
                        ],
                        or: true
                    },
                    /pia/
                ],
                expect: /biu(abc|def)pia/
            }
        ],
        "should wrap or not wrap combined regex that has | based on conditions": [
            {
                regexes: [
                    /biu/,
                    {
                        regexes: [
                            /abc/,
                            /def/,
                            {
                                regexes: [
                                    /ghi/,
                                    /jkl/
                                ],
                                or: true
                            }
                        ],
                        or: true
                    },
                    /pia/
                ],
                expect: /biu(?:abc|def|ghi|jkl)pia/
            }
        ],
        "should wrap single regex that has root | and its upper has no |": [
            {
                regexes: [
                    /biu/,
                    /abc|def/,
                    /pia/
                ],
                expect: /biu(?:abc|def)pia/
            }
        ],
        "should not wrap single regex that has root | but its upper has no |": [
            {
                regexes: [
                    /biu/,
                    /abc|def/,
                    /pia/
                ],
                expect: /biu(?:abc|def)pia/
            }
        ],
        "should wrap regex that has repeat pattern": [
            {
                regexes: {
                    regexes: [
                        /biu/,
                        /pia/
                    ],
                    repeat: '+'
                },
                expect: /(?:biupia)+/
            }
        ]
    },
    "group capturing": {
        "should capture group that has name option": [
            {
                regexes: {
                    name: 'abc',
                    regexes: [
                        /abc/,
                        /def/,
                        {
                            regexes: [
                                /ghi/,
                                /jkl/
                            ],
                            or: true
                        }
                    ]
                },
                expect: /(abcdef(?:ghi|jkl))/
            },
            {
                regexes: [
                    {
                        name: 'abc',
                        regexes: /def/
                    }
                ],
                expect: /(def)/
            }
        ],
        "should capture group that has capture option true": [
            {
                regexes: {
                    regexes: [
                        /abc/,
                        /def/,
                        {
                            regexes: [
                                /ghi/,
                                /jkl/
                            ],
                            or: true
                        }
                    ],
                    capture: true
                },
                expect: /(abcdef(?:ghi|jkl))/
            },
            {
                regexes: [
                    {
                        regexes: /def/,
                        capture: true
                    }
                ],
                expect: /(def)/
            }
        ]
    },
    "group matching": {
        "should increase back reference number if it has other groups captured before": [
            {
                regexes: [
                    /a($name:b)c(def)/,
                    /([abc])\1/
                ],
                expect: /a(b)c(def)([abc])\3/
            }
        ],
        "should handle back reference by named group properly": [
            {
                regexes: [
                    /a($name:b)c(def)/,
                    /([abc])($name)/
                ],
                expect: /a(b)c(def)([abc])\1/
            },
            {
                regexes: [
                    /a($name:b)c(def)/,
                    {
                        regexes: [
                            /xxx/,
                            /yyy/,
                            [
                                /zzz/,
                                /vvv($name)/
                            ]
                        ],
                        or: true
                    }
                ],
                expect: /a(b)c(def)(?:xxx|yyy|zzzvvv\1)/
            }
        ],
        "should handle back reference number that's greater than 9": [
            {
                regexes: [
                    /()()/,
                    /()()()()()()()()()()(...)\11/,
                ],
                expect: /()()()()()()()()()()()()(...)\13/
            },
            {
                regexes: [
                    /()()()()()()()()()()($name:...)/,
                    {
                        regexes: [
                            /abc/,
                            /($name)/
                        ],
                        or: true
                    }
                ],
                expect: /()()()()()()()()()()(...)(?:abc|\11)/
            },
            {
                regexes: [
                    /()()()()()()()()()()($name:...)/,
                    {
                        regexes: [
                            /abc/,
                            /($name)123/
                        ],
                        or: true
                    }
                ],
                expect: /()()()()()()()()()()(...)(?:abc|(?:\11)123)/
            }
        ]
    },
    "lookahead": {
        "should handle lookahead": [
            {
                regexes: {
                    regexes: [
                        /abc/,
                        /def/
                    ],
                    lookahead: true
                },
                expect: /(?=abcdef)/
            },
            {
                regexes: {
                    regexes: [
                        /abc/,
                        /def/
                    ],
                    lookahead: '='
                },
                expect: /(?=abcdef)/
            }
        ],
        "should handle negative lookahead": [
            {
                regexes: {
                    regexes: [
                        /abc/,
                        /def/
                    ],
                    lookahead: '!'
                },
                expect: /(?!abcdef)/
            }
        ],
        "should handle lookahead that captures": [
            {
                regexes: [
                    {
                        name: 'abc',
                        regexes: /def/,
                        lookahead: '='
                    }
                ],
                expect: /(?=(def))/
            }
        ]
    }
};

for (let caseCategoryName of Object.keys(caseCategoryMap)) {
    describe(caseCategoryName, () => {
        let caseCategory = caseCategoryMap[caseCategoryName];
        for (let caseName of Object.keys(caseCategory)) {
            it(caseName, () => {
                for (let testCase of caseCategory[caseName]) {
                    RegexTools
                        .combine(testCase.regexes)
                        .combined
                        .should.equal(testCase.expect.source);
                }
            });
        }
    });
}
