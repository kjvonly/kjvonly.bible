const plansWorker = new Worker(new URL('../workers/kjvplans.worker?worker', import.meta.url), {
	type: 'module'
});

export class ReadingsService {
//todo unsubscribe
	subscribers: any[] = [];

	constructor() {
		plansWorker.onmessage = (e) => {
			this.subscribers.forEach((s) => {
				if (s.id === e.data.id) {
					s.fn(e.data);
				}
			});
		};
	}

	subscribe(id: any, fn: any) {
		this.subscribers.push({ id: id, fn: fn });
	}

	init() {

	}
}

export let readingsService = new ReadingsService()