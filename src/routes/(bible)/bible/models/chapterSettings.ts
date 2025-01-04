export interface ChapterSettings {
    fontSize: string
}

export function newChapterSettings(): ChapterSettings{
    return {
        fontSize: 'text-base'
    };
}