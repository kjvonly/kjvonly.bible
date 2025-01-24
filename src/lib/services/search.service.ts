class SearchService {
    webWorker = new Worker(new URL('../workers/kjvsearch.worker?worker', import.meta.url), {
        type: 'module'
    });

    subscribers: any[] = []
    constructor() {
        this.webWorker.onmessage = (e) => {
            this.subscribers.forEach((s) => {
                if (s.id === e.data.id){
                    s.fn(e.data)
                }
            })

        }

        this.webWorker.postMessage({action: 'init'})

    }

    subscribe(id: any, fn: any) {
        this.subscribers.push({ id: id, fn: fn })
    }

    search(id: string, text: string){
       this.webWorker.postMessage({action: 'search', id: id, text: text})
    }


}

export const searchService = new SearchService()




