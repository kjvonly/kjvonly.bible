import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	ToastService
} from './toast.service';

describe(
	'ToastService',
	() => {
		it(
			'publishes each toast message to subscribers',
			() => {
				const service =
					new ToastService();

				const subscriber =
					vi.fn();

				service.subscribeToToasts(
					subscriber
				);

				service.showToast(
					'Copied Verses'
				);

				expect(
					subscriber
				).toHaveBeenCalledWith(
					'Copied Verses'
				);
			}
		);

		it(
			'stops publishing after a subscriber unsubscribes',
			() => {
				const service =
					new ToastService();

				const subscriber =
					vi.fn();

				const unsubscribe =
					service.subscribeToToasts(
						subscriber
					);

				unsubscribe();

				service.showToast(
					'ignored'
				);

				expect(
					subscriber
				).not.toHaveBeenCalled();
			}
		);
	}
);
