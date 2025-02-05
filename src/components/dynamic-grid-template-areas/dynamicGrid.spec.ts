import { assert, describe, expect, it } from 'vitest'
import { renderGridTemplateAreas } from './dynamicGrid'

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

    it('simple horizontal', () => {

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
                        "key": "7919c0ef-c36e-40a4-bee4-b15d27f746e4",
                        "name": "Modules",
                        "componentName": "Modules",
                        "keyboardBindings": {},
                        "selected": false,
                        "bag": {}
                    }
                }
            },
            "right": {
                "buffer": {
                    "key": "384fa306-84ae-4a94-8c17-2d4c4df1ca8d",
                    "name": "Modules",
                    "componentName": "Modules",
                    "keyboardBindings": {},
                    "selected": false,
                    "bag": {}
                },
                "split": "h",
                "left": {
                    "id": "b"
                },
                "right": {
                    "id": "c",
                    "buffer": {
                        "key": "3623bbcf-054c-4742-bc77-6b3b6df472ff",
                        "name": "ChapterContainer",
                        "componentName": "ChapterContainer",
                        "keyboardBindings": {},
                        "selected": false,
                        "bag": {
                            "chapterKey": "2_8"
                        }
                    }
                }
            },
            "buffer": {
                "key": "846e8b5e-3afc-492c-aa80-fa652b6ca4bc",
                "name": "ChapterContainer",
                "componentName": "ChapterContainer",
                "keyboardBindings": {},
                "selected": false,
                "bag": {
                    "chapterKey": "1_1"
                }
            }
        }`

        root = JSON.parse(json)


        let gta = renderGridTemplateAreas(root)
        expect(gta).toEqual([['b'], ['c']])
    })
})