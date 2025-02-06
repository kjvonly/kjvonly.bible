import type { Pane } from "$lib/models/pane.model"


export function numberToLetters(number: number) {
    let result = ""
    while (number > 0) {
        number -= 1
        let remainder = number % 26
        result = String.fromCharCode(97 + remainder) + result
        number = (number - remainder) // 26
    }
    return result
}

function gcd(a: number, b: number): number {
    while (b !== 0) {
        let temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}


/** renders vertical grid template areas
 * 
 * takes a left grid template areas, determines if any columns need to repeat, repeats them for each row
 * then the same for the right grid
 * then concats the rows of left and the right
 */
function joinVerticalGridTemplateAreas(
    gta: string[][],
    lrgta: string[][],
    rrgta: string[][]
) {

    let leftNumRows = lrgta.length
    let rightNumRows = rrgta.length

    let leftNumCols = lrgta[0].length
    let rightNumCols = rrgta[0].length

    let lColRepeat = rightNumCols  / gcd(rightNumCols, leftNumCols)
    let lRowRepeat = rightNumRows / gcd(rightNumRows, leftNumRows)
    let lRepeatRow = []
    for (let i = 0; i < leftNumRows; i++) {
        for (let m = 0; m < lRowRepeat; m++) {
            let repeatCol: string[] = []
            for (let j = 0; j < leftNumCols; j++) {
                for (let k = 0; k < lColRepeat; k++) {
                    repeatCol.push(lrgta[i][j])
                }
            }
            lRepeatRow.push(repeatCol)
        }
    }

    let rRepeatRow = []
    let rColRepeat = leftNumCols  / gcd(leftNumCols, rightNumCols)
    let rRowRepeat = leftNumRows / gcd(leftNumRows, rightNumRows)
    for (let i = 0; i < rightNumRows; i++) {
        for (let m = 0; m < rRowRepeat; m++) {
            let repeatCol: string[] = []
            for (let j = 0; j < rightNumCols; j++) {
                for (let k = 0; k < rColRepeat; k++) {
                    repeatCol.push(rrgta[i][j])
                }
            }
            rRepeatRow.push(repeatCol)
        }
    }


    for (let i = 0; i < rRepeatRow.length; i++) {
        let row = []

        for (let j = 0; j < lRepeatRow[i].length; j++) {
            row.push(lRepeatRow[i][j])
        }

        for (let j = 0; j < rRepeatRow[i].length; j++) {
            row.push(rRepeatRow[i][j])
        }
        gta.push(row)
    }

}


function joinHorizontalGridTemplateAreas(
    gta: string[][],
    lrgta: string[][],
    rrgta: string[][]
) {

    let leftNumRows = lrgta.length
    let rightNumRows = rrgta.length

    let leftNumCols = lrgta[0].length
    let rightNumCols = rrgta[0].length

    /** ensure the left (top) and right (bottom) areas have equal col length. 
     * if differ in columns repeat an all indexes in a row n number of 
     * times to ensure row length is equal
     * 
     * e.g. if a left (top) is 1, 2 and the right (bottom) is 3, 3, 4, 5
     * the result should be
     * 
     * 1, 1, 2, 2 
     * 3, 3, 4, 5
     * 
     * lrepeat = (4 * 2) / 2 = 2 
     * each index is repeated twice to get 1, 1, 2, 2
    */
    let lRepeatRows = []

    let lColRepeat = rightNumCols  / gcd(rightNumCols, leftNumCols)
    let lRowRepeat = rightNumRows / gcd(rightNumRows, leftNumRows)

    for (let i = 0; i < leftNumRows; i++) {
        for (let m = 0; m < lRowRepeat; m++) {
            let repeatRow = []
            for (let j = 0; j < leftNumCols; j++) {
                for (let k = 0; k < lColRepeat; k++) {
                    repeatRow.push(lrgta[i][j])
                }
            }
            lRepeatRows.push(repeatRow)
        }
    }

    let rRepeatRows = []
    let rColRepeat = leftNumCols  / gcd(rightNumCols, leftNumCols)
    let rRowRepeat = leftNumRows / gcd(rightNumRows, leftNumRows)
    for (let i = 0; i < rightNumRows; i++) {
        for (let m = 0; m < rRowRepeat; m++) {
            let repeatRow = []
            for (let j = 0; j < rightNumCols; j++) {
                for (let k = 0; k < rColRepeat; k++) {
                    repeatRow.push(rrgta[i][j])
                }
            }
            rRepeatRows.push(repeatRow)
        }
    }

    for (let j = 0; j < lRepeatRows.length; j++) {
        gta.push(lRepeatRows[j])
    }
    for (let j = 0; j < rRepeatRows.length; j++) {
        gta.push(rRepeatRows[j])
    }
}

/**
 * 
 * @param lrgta left grid template area that is rendered.
 * @param rrgta right grid template area that is rendered.
 * @param split how to join them. v for vertical. h for horizontal.
 * @returns returns the joined grid template areas. updating the areas as needed e.g. filling in the grid as necessary.
 */
function joinGridTemplateAreas(lrgta: string[][], rrgta: string[][], split: string) {
    let gta: string[][] = [];

    if (split === 'v') {
        joinVerticalGridTemplateAreas(gta, lrgta, rrgta)
    }

    if (split === 'h') {
        joinHorizontalGridTemplateAreas(gta, lrgta, rrgta)
    }

    return gta;
}

export function renderGridTemplateAreas(n: Pane | any) {
    if (n.split === undefined) {
        return [[n.id]];
    } else {
        let leftRenderedGridTemplateAreas = renderGridTemplateAreas(n.left)
        let rightRenderedGridTemplateAreas = renderGridTemplateAreas(n.right)
        let renderedGridTemplateAreas = joinGridTemplateAreas(leftRenderedGridTemplateAreas, rightRenderedGridTemplateAreas, n.split);

        for (let i = 0; i < renderedGridTemplateAreas.length; i++) {
            let s = ''
            for (let j = 0; j < renderedGridTemplateAreas[i].length; j++) {
                s += `${renderedGridTemplateAreas[i][j]} `
            }
        }
        return renderedGridTemplateAreas
    }
}