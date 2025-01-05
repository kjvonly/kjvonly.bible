export interface ChapterSettings {
    fontSize: string
    fontFamily: string
    colorTheme: string
}

export function newChapterSettings(): ChapterSettings{
    return {
        fontSize: 'text-base',
        fontFamily: 'font-sans',
        colorTheme: 'light'
    };
}