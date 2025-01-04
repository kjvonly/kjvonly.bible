export interface ChapterSettings {
    fontSize: string
    fontFamily: string
}

export function newChapterSettings(): ChapterSettings{
    return {
        fontSize: 'text-base',
        fontFamily: 'font-sans'
    };
}