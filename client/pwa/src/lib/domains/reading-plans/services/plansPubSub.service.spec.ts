import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	PLAN_PUBSUB_SUBSCRIPTIONS,
	type Sub
} from '../models/plans.model';
import {
	PLANS_WORKER_INITIALIZED,
	PLANS_WORKER_REFRESH,
	type PlansSubscriptionsMessage,
	type PlansWorkerCommand
} from '../models/plans-worker.model';

import {
	PlansPubSubService,
	type PlansWorkerPort
} from './plansPubSub.service';

function worker(): {
	port: PlansWorkerPort;
	postMessage: ReturnType<typeof vi.fn>;
} {
	const postMessage = vi.fn();

	return {
		port: {
			onmessage: null,
			postMessage
		},
		postMessage
	};
}

function subscriptionsMessage(): PlansSubscriptionsMessage {
	return {
		id: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
		subs: new Map<string, Sub>()
	};
}

describe(
	'PlansPubSubService',
	() => {
		it(
			'owns the worker message handler for its lifetime',
			() => {
				const fakeWorker =
					worker();

				const service =
					new PlansPubSubService(
						fakeWorker.port
					);

				expect(
					fakeWorker.port.onmessage
				).toBeTypeOf(
					'function'
				);

				void service;
			}
		);

		it(
			'notifies subscribers with the typed subscriptions message',
			() => {
				const service =
					new PlansPubSubService();

				const listener =
					vi.fn();

				const message =
					subscriptionsMessage();

				service.subscribe(
					PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
					listener,
					'subscriber-a'
				);

				service.onMessage({
					data: message
				});

				expect(
					listener
				).toHaveBeenCalledWith(
					message
				);
			}
		);

		it(
			'does not publish the worker initialization message to subscribers',
			() => {
				const service =
					new PlansPubSubService();

				const listener =
					vi.fn();

				service.subscribe(
					PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
					listener,
					'subscriber-a'
				);

				service.onMessage({
					data: {
						id: PLANS_WORKER_INITIALIZED
					}
				});

				expect(
					listener
				).not.toHaveBeenCalled();
			}
		);

		it(
			'removes only the requested subscriber',
			() => {
				const service =
					new PlansPubSubService();

				const first =
					vi.fn();

				const second =
					vi.fn();

				service.subscribe(
					PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
					first,
					'subscriber-a'
				);

				service.subscribe(
					PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
					second,
					'subscriber-b'
				);

				service.unsubscribe(
					'subscriber-a'
				);

				service.onMessage({
					data: subscriptionsMessage()
				});

				expect(
					first
				).not.toHaveBeenCalled();

				expect(
					second
				).toHaveBeenCalledTimes(
					1
				);
			}
		);


		it(
			'requests worker-side persistence refresh after initialization',
			async () => {
				const fakeWorker =
					worker();

				const service =
					new PlansPubSubService(
						fakeWorker.port
					);

				const initialization =
					service.initialize(
						{},
						[],
						[]
					);

				service.onMessage({
					data: {
						id: PLANS_WORKER_INITIALIZED
					}
				});

				await initialization;

				fakeWorker.postMessage
					.mockClear();

				service.refresh();

				await Promise.resolve();

				expect(
					fakeWorker.postMessage
				).toHaveBeenCalledWith({
					action: PLANS_WORKER_REFRESH
				});
			}
		);

		it(
			'does not refresh a Plans worker that has not been initialized',
			() => {
				const fakeWorker =
					worker();

				const service =
					new PlansPubSubService(
						fakeWorker.port
					);

				service.refresh();

				expect(
					fakeWorker.postMessage
				).not.toHaveBeenCalled();
			}
		);
		it(
			'publishes typed commands through its owned worker',
			() => {
				const fakeWorker =
					worker();

				const service =
					new PlansPubSubService(
						fakeWorker.port
					);

				service.getAllSubs();

				const expected:
					PlansWorkerCommand = {
						action: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
						id: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS
					};

				expect(
					fakeWorker.postMessage
				).toHaveBeenCalledWith(
					expected
				);
			}
		);
	}
);
