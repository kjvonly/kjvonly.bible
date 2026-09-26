import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	Modules
} from '../../models/modules.model';

import {
	PROFILE_VIEWS
} from '../profile/profile-navigation.model';

import {
	completeAuthenticationNavigation
} from './complete-authentication-navigation';

///////////////////////////////////////////////////////////////////////////////

describe(
	'completeAuthenticationNavigation',
	() => {
		it(
			'returns to the Pane root before opening Profile',
			() => {
				let depth = 3;

				const back = vi.fn(
					() => {
						depth -= 1;
					}
				);

				const pushModule = vi.fn();

				completeAuthenticationNavigation({
					canGoBack: () => depth > 1,
					back,
					pushModule
				} as Parameters<
					typeof completeAuthenticationNavigation
				>[0]);

				expect(back).toHaveBeenCalledTimes(2);
				expect(pushModule).toHaveBeenCalledWith(
					Modules.PROFILE,
					PROFILE_VIEWS.ROOT,
					{}
				);
			}
		);
	}
);
