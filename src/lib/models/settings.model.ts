export interface Settings {
    fontSize: string
    fontTheme: string
    colorTheme?: string
    isDarkTheme?: boolean
}

export function newSettings(): Settings{
    return {
        fontSize: 'text-base',
        fontTheme: 'sans',
        colorTheme: 'red',
        isDarkTheme: false
    };
}
