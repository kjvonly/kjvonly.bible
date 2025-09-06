const plansWorker = new Worker(new URL('../workers/kjvplans.worker?worker', import.meta.url), {
	type: 'module'
});

export class PlansService {
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
		plansWorker.postMessage({ action: 'empty' });
	}

	getAllReadings() {
		plansWorker.postMessage({ action: 'getAllPlans', id: 'getAllReadings' });
	}

	getAllSubs() {
		plansWorker.postMessage({ action: 'getAllSubs', id: 'getAllSubs' });
	}

	getAllPlans() {
		plansWorker.postMessage({ action: 'getAllPlans', id: 'getAllPlans' });
	}
}

export let plansService = new PlansService()