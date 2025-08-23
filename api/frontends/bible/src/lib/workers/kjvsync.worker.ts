import { chapterService, ChapterService } from "$lib/api/chapters.api";

async function sync(){

    console.log("synced")
}

onmessage = async (e) => {
    switch (e.data.action) {
        case 'sync':
            await sync()
            break;
    }
}

export { };