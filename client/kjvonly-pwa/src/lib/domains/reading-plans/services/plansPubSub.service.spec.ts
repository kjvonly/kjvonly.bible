import { describe, expect, it } from 'vitest';
import { plansPubSubService } from './plansPubSub.service';

describe('PlansPubSubService', () => {
	it('should subscribe subscribers', () => {
		let id = 'test';
		let called = false;
		let func = (e: any) => {
			called = true;
		};

		plansPubSubService.subscribe(id, func, 'a');

		plansPubSubService.onMessage({ data: { id: id } });

		expect(called).toBeTruthy();
	});
});
