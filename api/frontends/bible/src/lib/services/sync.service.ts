
export class SyncService {

    worker: Worker | undefined = undefined
    init(){
        this.worker = new Worker(new URL('../workers/kjvsync.worker?worker', import.meta.url), {
			type: 'module'
		});
    }

    postMessage(message: any){
        this.worker?.postMessage(message)

    }
}

export let syncService = new SyncService() 