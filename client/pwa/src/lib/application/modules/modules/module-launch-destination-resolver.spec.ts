import {
	describe,
	expect,
	it
} from 'vitest';

import {
	Modules
} from '../../models/modules.model';

import {
	ModuleLaunchDestinationResolver
} from './module-launch-destination-resolver';

describe(
	'ModuleLaunchDestinationResolver',
	() => {
		it(
			'resolves a fresh destination state for each launch',
			() => {
				const resolver =
					new ModuleLaunchDestinationResolver([
						{
							module:
								Modules.BIBLE,
							view:
								'bible.reader',
							createState:
								() => ({})
						}
					]);

				const first =
					resolver.resolve(
						Modules.BIBLE
					);

				const second =
					resolver.resolve(
						Modules.BIBLE
					);

				expect(
					first.view
				).toBe(
					'bible.reader'
				);

				expect(
					first.state
				).not.toBe(
					second.state
				);
			}
		);

		it(
			'rejects duplicate Module registrations',
			() => {
				expect(
					() =>
						new ModuleLaunchDestinationResolver([
							{
								module:
									Modules.BIBLE,
								view:
									'bible.reader',
								createState:
									() => ({})
							},
							{
								module:
									Modules.BIBLE,
								view:
									'bible.other',
								createState:
									() => ({})
							}
						])
			).toThrow(
				'Module launch destination already registered'
			);
			}
		);

		it(
			'rejects Modules without a launch destination',
			() => {
				const resolver =
					new ModuleLaunchDestinationResolver(
						[]
					);

				expect(
					() =>
						resolver.resolve(
							Modules.BIBLE
						)
			).toThrow(
				'Module launch destination not registered'
			);
			}
		);
	}
);
