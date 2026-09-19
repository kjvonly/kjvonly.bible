import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BibleLocationReferenceService
} from './bibleLocationReference.service';

import {
	BibleNavigationService
} from './bibleNavigation.service';

describe(
	'BibleNavigationService',
	() => {
		const service =
			new BibleNavigationService(
				new BibleLocationReferenceService()
			);

		it(
			'moves to the next chapter',
			() => {
				expect(
					service.next('1_1')
				).toBe('1_2');
			}
		);

		it(
			'moves to the previous chapter',
			() => {
				expect(
					service.previous('1_2')
				).toBe('1_1');
			}
		);

		it(
			'ignores version, verse, and word-index detail when navigating',
			() => {
				expect(
					service.next('kjv/1_1_3_4')
				).toBe('1_2');
			}
		);

		it(
			'wraps from the final chapter to the first chapter',
			() => {
				expect(
					service.next('73_22')
				).toBe('1_1');
			}
		);

		it(
			'wraps from the first chapter to the final chapter',
			() => {
				expect(
					service.previous('1_1')
				).toBe('73_22');
			}
		);
	}
);
