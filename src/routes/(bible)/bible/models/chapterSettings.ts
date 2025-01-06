export interface ChapterSettings {
    fontSize: string
    fontFamily: string
    colorTheme: string
    doChapterFadeAnimation?: boolean
}

export function newChapterSettings(): ChapterSettings{
    return {
        fontSize: 'text-base',
        fontFamily: 'font-sans',
        colorTheme: 'light',
        doChapterFadeAnimation: false,
    };
}
