export interface ChapterSettings {
    fontSize: string
    fontFamily: string
    colorTheme?: string
    isDarkTheme?: boolean
    doChapterFadeAnimation?: boolean
}

export function newChapterSettings(): ChapterSettings{
    return {
        fontSize: 'text-base',
        fontFamily: 'font-sans',
        colorTheme: 'red',
        isDarkTheme: false,
        doChapterFadeAnimation: false,
    };
}
