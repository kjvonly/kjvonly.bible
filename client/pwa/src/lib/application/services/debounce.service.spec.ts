import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	DebounceService
} from './debounce.service';

describe(
	'DebounceService',
	() => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it(
			'runs an operation after the configured delay',
			() => {
				vi.useFakeTimers();

				const operation = vi.fn();
				const service = new DebounceService(300);

				service.schedule(operation);

				vi.advanceTimersByTime(299);
				expect(operation).not.toHaveBeenCalled();

				vi.advanceTimersByTime(1);
				expect(operation).toHaveBeenCalledTimes(1);
			}
		);

		it(
			'restarts the delay when another operation is scheduled',
			() => {
				vi.useFakeTimers();

				const firstOperation = vi.fn();
				const secondOperation = vi.fn();
				const service = new DebounceService(300);

				service.schedule(firstOperation);
				vi.advanceTimersByTime(200);

				service.schedule(secondOperation);
				vi.advanceTimersByTime(299);

				expect(firstOperation).not.toHaveBeenCalled();
				expect(secondOperation).not.toHaveBeenCalled();

				vi.advanceTimersByTime(1);

				expect(firstOperation).not.toHaveBeenCalled();
				expect(secondOperation).toHaveBeenCalledTimes(1);
			}
		);

		it(
			'cancels a pending operation',
			() => {
				vi.useFakeTimers();

				const operation = vi.fn();
				const service = new DebounceService(300);

				service.schedule(operation);
				service.cancel();
				vi.advanceTimersByTime(300);

				expect(operation).not.toHaveBeenCalled();
			}
		);
	}
);
