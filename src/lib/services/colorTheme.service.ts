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
                if (chapterSettings.colorTheme === 'light') {
                    this.setLightTheme();
                } else {
                    this.setDarkTheme();
                }
            }
        }
    }

    setLightTheme() {
        let html = document.getElementById('kjvonly-html');
        html?.classList.remove('dark');
        this.chapterSettings.colorTheme = 'light';
    }
    setDarkTheme() {
        let html = document.getElementById('kjvonly-html');
        html?.classList.add('dark');
        this.chapterSettings.colorTheme = 'dark';
    }
}


export let colorTheme = new ColorTheme()