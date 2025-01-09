import { type ChapterSettings, newChapterSettings } from "../../routes/(bible)/bible/models/chapterSettings";

class ColorTheme {

    chapterSettings: ChapterSettings
    constructor() {
        this.chapterSettings = newChapterSettings()
    }

    init() {
        this.chapterSettings = newChapterSettings()
        let cs = localStorage.getItem('chapterSettings');
        if (cs != null) {
            let chapterSettings: ChapterSettings | null = JSON.parse(cs);
            if (chapterSettings?.colorTheme) {
                this.setColorTheme(chapterSettings.colorTheme)
            }
        }
    }



    setColorTheme(theme: string) {
        let html = document.getElementById('kjvonly-html');
        html?.classList.forEach(   (className: string) => {
            if (className.includes('color-theme')){
                html?.classList.remove(className);
            }
        })

        html?.classList.add(theme)
        this.chapterSettings.colorTheme = theme;
    }
}


export let colorTheme = new ColorTheme()