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


})