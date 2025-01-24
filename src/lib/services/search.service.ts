class SearchService {
    webWorker = new Worker(new URL('../workers/kjvsearch.worker?worker', import.meta.url), {
        type: 'module'
    });

    constructor(){
        this.webWorker.onmessage = (e) => {
            console.log('message received from web worker', e.data)
        }
        this.webWorker.postMessage('init')

    }
}

export const searchService = new SearchService()




