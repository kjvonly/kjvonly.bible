import { type ChapterSettings, newChapterSettings } from "../../routes/(bible)/bible/models/chapterSettings";

class ColorTheme {

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

        let cs = this.getChapterSettings()
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


        if (html) {
            html?.classList.forEach((c) => {
                html?.classList.remove(c)
            })

            classes.forEach(c => {
                html?.classList.add(c)
            })
        }

    }

    getChapterSettings(): ChapterSettings {
        let cs = localStorage.getItem('chapterSettings');
        if (cs != null) {
            let chapterSettings: ChapterSettings | null = JSON.parse(cs);
            if (chapterSettings) {
                return chapterSettings
            }
        }
        return newChapterSettings()
    }

}


export let colorTheme = new ColorTheme()