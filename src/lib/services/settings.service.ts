import { type Settings, newSettings } from "../models/settings.model";

class SettingsService {

    VALID_COLOR_THEMES = [
        'red',
        'light-blue',
        'purple',
        'cyan',
        'pink'
    ]

    setTheme(theme: string) {

        if (!this.VALID_COLOR_THEMES.includes(theme)) {
            theme = this.VALID_COLOR_THEMES[0]
        }
        let html = document.getElementById('kjvonly-html');
        html?.classList.forEach((className: string) => {
            if (className.includes('color-theme')) {
                html?.classList.remove(className);
            }
        })

        let cs = this.getSettings()
        if (!cs) {
            return
        }


        let classes = []
        if (cs.isDarkTheme) {
            //    html?.classList.add(`color-theme-dark-${theme}`)
            classes.push(`color-theme-dark-${theme}`)
        } else {
            //  html?.classList.add(`color-theme-${theme}`)
            classes.push(`color-theme-${theme}`)
        }


        classes.push(cs.fontSize)
        classes.push(cs.fontFamily)


        let currentClasses: string[] = []
        html?.classList.forEach((c) => {
            currentClasses.push(c)
        })


        if (html) {
            currentClasses.forEach((c: string) => {
                html?.classList.remove(c)
            })

            classes.forEach(c => {
                html?.classList.add(c)
            })
        }

    }

    getSettings(): Settings {
        let cs = localStorage.getItem('settings');
        if (cs != null) {
            let settings: Settings | null = JSON.parse(cs);
            if (settings) {
                return settings
            }
        }
        return newSettings()
    }

}


export let settingsService = new SettingsService()