import { assert, describe, expect, it } from 'vitest'
import { numberToLetters, renderGridTemplateAreas } from './dynamicGrid.service'

describe('suite name', () => {
    it('large grid vertical', () => {
        let root = {
            id: 'root',
            split: 'v',
            left: {
                split: 'h',
                left: {
                    split: 'v',
                    left: {
                        id: 'a',
                    },
                    right: {
                        split: 'h',
                        left: {
                            split: 'v',
                            left: {
                                id: 'b'
                            },
                            right: {
                                split: 'v',
                                left: {
                                    id: 'c'
                                },
                                right: {
                                    id: 'd'
                                },

                            }

                        },
                        right: {
                            id: 'e'
                        }
                    },
                },
                right: {
                    split: 'h',
                    left: {
                        id: 'f'
                    },
                    right: {
                        split: 'v',
                        left: {
                            id: 'g',
                        },
                        right: {
                            id: 'h',
                        },
                    },
                },
            },
            right: {
                split: 'h',
                left: {
                    split: 'v',
                    left: {
                        id: 'i',
                    },
                    right: {
                        split: 'h',
                        left: {
                            split: 'v',
                            left: {
                                id: 'j'
                            },
                            right: {
                                split: 'v',
                                left: {
                                    id: 'k'
                                },
                                right: {
                                    id: 'l'
                                },

                            }

                        },
                        right: {
                            id: 'm'
                        }
                    },
                },
                right: {
                    split: 'h',
                    left: {
                        id: 'n'
                    },
                    right: {
                        split: 'v',
                        left: {
                            id: 'o',
                        },
                        right: {
                            id: 'p',
                        },
                    },
                },
            }
        }

        let l = renderGridTemplateAreas(root)
        let grid = ''
        for (let i = 0; i < l.length; i++) {
            let s = ''
            for (let j = 0; j < l[i].length; j++) {
                s += `${l[i][j]} `
            }
            grid += '"' + s + '"\n'
        }

        let expectedGrid = `"a a a a a a a a b b b b c c d d i i i i i i i i j j j j k k l l "
"a a a a a a a a e e e e e e e e i i i i i i i i m m m m m m m m "
"f f f f f f f f f f f f f f f f n n n n n n n n n n n n n n n n "
"g g g g g g g g h h h h h h h h o o o o o o o o p p p p p p p p "
`
        expect(grid, 'expected grids to match but they do not').toEqual(expectedGrid)
    })


    it('large grid horizontal', () => {
        let root = {
            id: 'root',
            split: 'h',
            left: {
                split: 'h',
                left: {
                    split: 'v',
                    left: {
                        id: 'a',
                    },
                    right: {
                        split: 'h',
                        left: {
                            split: 'v',
                            left: {
                                id: 'b'
                            },
                            right: {
                                split: 'v',
                                left: {
                                    id: 'c'
                                },
                                right: {
                                    id: 'd'
                                },

                            }

                        },
                        right: {
                            id: 'e'
                        }
                    },
                },
                right: {
                    split: 'h',
                    left: {
                        id: 'f'
                    },
                    right: {
                        split: 'v',
                        left: {
                            id: 'g',
                        },
                        right: {
                            id: 'h',
                        },
                    },
                },
            },
            right: {
                split: 'h',
                left: {
                    split: 'v',
                    left: {
                        id: 'i',
                    },
                    right: {
                        split: 'h',
                        left: {
                            split: 'v',
                            left: {
                                id: 'j'
                            },
                            right: {
                                split: 'v',
                                left: {
                                    id: 'k'
                                },
                                right: {
                                    id: 'l'
                                },

                            }

                        },
                        right: {
                            id: 'm'
                        }
                    },
                },
                right: {
                    split: 'h',
                    left: {
                        id: 'n'
                    },
                    right: {
                        split: 'v',
                        left: {
                            id: 'o',
                        },
                        right: {
                            id: 'p',
                        },
                    },
                },
            }
        }

        let l = renderGridTemplateAreas(root)
        let grid = ''
        for (let i = 0; i < l.length; i++) {
            let s = ''
            for (let j = 0; j < l[i].length; j++) {
                s += `${l[i][j]} `
            }
            grid += '"' + s + '"\n'
        }

        let expectedGrid = `"a a a a a a a a b b b b c c d d "
"a a a a a a a a e e e e e e e e "
"f f f f f f f f f f f f f f f f "
"g g g g g g g g h h h h h h h h "
"i i i i i i i i j j j j k k l l "
"i i i i i i i i m m m m m m m m "
"n n n n n n n n n n n n n n n n "
"o o o o o o o o p p p p p p p p "
`
        expect(grid, 'expected grids to match but they do not').toEqual(expectedGrid)
    })

    it('simple vertical', () => {

        let root = {
            id: 'root',
            split: 'v',
            left: {
                id: 'b',
            },
            right: {
                id: 'c',
            },
        }


        let gta = renderGridTemplateAreas(root)
        expect(gta).toEqual([['b', 'c']])
    })

    it('simple horizontal', () => {

        let root = {
            id: 'root',
            split: 'h',
            left: {
                id: 'b',
            },
            right: {
                id: 'c',
            },
        }


        let gta = renderGridTemplateAreas(root)
        expect(gta).toEqual([['b'], ['c']])
    })

    it('failing grid', () => {

        let json = `{
    "split": "v",
    "left": {
        "split": "h",
        "left": {
            "id": "a"
        },
        "right": {
            "buffer": {
                "key": "a77d4181-844d-4da4-8817-3f5da52e4d44",
                "name": "Modules",
                "componentName": "Modules",
                "keyboardBindings": {},
                "selected": false,
                "bag": {
                    "chapterKey": "2_8",
                    "lastVerse": 1
                }
            },
            "split": "h",
            "left": {
                "id": "d"
            },
            "right": {
                "id": "e",
                "buffer": {
                    "key": "766af5c1-4623-4c6e-9c2b-dfb020714b0f",
                    "name": "StrongsVersesRefs",
                    "componentName": "StrongsVersesRefs",
                    "keyboardBindings": {},
                    "selected": false,
                    "bag": {
                        "word": {
                            "text": "people",
                            "class": [
                                "xref"
                            ],
                            "href": [
                                "H5971"
                            ],
                            "emphasis": false
                        }
                    }
                }
            }
        }
    },
    "right": {
        "buffer": {
            "key": "ff21c5bb-6fb7-4d9e-be45-f42129894997",
            "name": "Modules",
            "componentName": "Modules",
            "keyboardBindings": {},
            "selected": false,
            "bag": {
                "chapterKey": "2_8",
                "lastVerse": 3
            }
        },
        "split": "h",
        "left": {
            "id": "b"
        },
        "right": {
            "id": "c",
            "buffer": {
                "key": "a99c9c4e-f666-4c4d-a503-28f20d4e7398",
                "name": "StrongsVersesRefs",
                "componentName": "StrongsVersesRefs",
                "keyboardBindings": {},
                "selected": false,
                "bag": {
                    "word": {
                        "text": "come",
                        "class": [
                            "xref"
                        ],
                        "href": [
                            "H935"
                        ],
                        "emphasis": false
                    }
                }
            }
        }
    },
    "buffer": {
        "key": "cbe962bf-8c93-47a9-a1fa-82f75f4f12b7",
        "name": "ChapterContainer",
        "componentName": "ChapterContainer",
        "keyboardBindings": {},
        "selected": false,
        "bag": {
            "chapterKey": "2_8"
        }
    }
}`

        let root = JSON.parse(json)


        let gta = renderGridTemplateAreas(root)
        console.log(gta)
        expect(gta).toEqual([
            ['a', 'b'],
            ['a', 'b'],
            ['d', 'b'],
            ['d', 'c'],
            ['e', 'c'],
            ['e', 'c']
        ]
        )
    })

    it('failing grid', () => {

        let json = `{
    "split": "v",
    "left": {
        "split": "h",
        "left": {
            "id": "a"
        },
        "right": {
            "id": "d",
            "buffer": {
                "key": "a8ea4ce4-81d3-453f-aef9-3e12583f8d37",
                "name": "Modules",
                "componentName": "Modules",
                "keyboardBindings": {},
                "selected": false,
                "bag": {
                    "chapterKey": "2_9"
                }
            }
        }
    },
    "right": {
        "buffer": {
            "key": "e20f803e-6e57-425c-9663-dba529749c3b",
            "name": "Modules",
            "componentName": "Modules",
            "keyboardBindings": {},
            "selected": false,
            "bag": {
                "chapterKey": "2_9"
            }
        },
        "split": "h",
        "left": {
            "id": "b"
        },
        "right": {
            "id": "c",
            "buffer": {
                "key": "52f3e9db-95c2-4d21-9a3f-2433c9f7f457",
                "name": "Modules",
                "componentName": "Modules",
                "keyboardBindings": {},
                "selected": false,
                "bag": {
                    "chapterKey": "2_9"
                }
            }
        }
    },
    "buffer": {
        "key": "fd459d14-87df-4a4b-add7-2b8540dc0acb",
        "name": "ChapterContainer",
        "componentName": "ChapterContainer",
        "keyboardBindings": {},
        "selected": false,
        "bag": {
            "chapterKey": "2_9"
        }
    }
}`

        let root = JSON.parse(json)


        let gta = renderGridTemplateAreas(root)
        console.log(gta)
        expect(gta).toEqual([
            ['a', 'b'],
            ['a', 'b'],
            ['d', 'b'],
            ['d', 'c'],
            ['e', 'c'],
            ['e', 'c']
        ]
        )
    })

    it('should convert numbers to letters', () => {
        let result = numberToLetters(13)
        expect(result).toEqual('m')

        result = numberToLetters(27)
        expect(result).toEqual('aa')

    })

})