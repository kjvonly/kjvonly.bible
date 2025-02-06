export interface Settings {
    fontSize: string
    fontFamily: string
    colorTheme?: string
    isDarkTheme?: boolean
    doChapterFadeAnimation?: boolean
}

export function newSettings(): Settings{
    return {
        fontSize: 'text-base',
        fontFamily: 'font-sans',
        colorTheme: 'red',
        isDarkTheme: false,
        doChapterFadeAnimation: false,
    };
}
