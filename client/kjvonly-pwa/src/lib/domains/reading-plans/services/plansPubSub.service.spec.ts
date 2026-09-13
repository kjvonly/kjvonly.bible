import { describe, expect, it, vi } from 'vitest';
import { PlansPubSubService } from './plansPubSub.service';

describe('PlansPubSubService', () => {
	it('notifies matching subscribers', () => {
		const service = new PlansPubSubService();
		const listener = vi.fn();

		service.subscribe('test', listener, 'subscriber-a');
		service.onMessage({ data: { id: 'test' } });

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('removes only the requested subscriber', () => {
		const service = new PlansPubSubService();
		const first = vi.fn();
		const second = vi.fn();

		service.subscribe('test', first, 'subscriber-a');
		service.subscribe('test', second, 'subscriber-b');

		service.unsubscribe('subscriber-a');
		service.onMessage({ data: { id: 'test' } });

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(1);
	});
});
