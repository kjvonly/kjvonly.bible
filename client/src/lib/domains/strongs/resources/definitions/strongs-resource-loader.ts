import type {
	StrongsResourceService
} from './strongs-resource-service';

import {
	STRONGS_RESOURCE_TYPE
} from './strongs-interpreter';

export class StrongsResourceLoader {

	constructor(
		private readonly resources:
			Pick<
				StrongsResourceService,
				'install'
			>
	) {}

	async load(
		publisher: string,
		version: string,
		key: string
	): Promise<boolean> {

		const individualFound =
			await this.resources.install({
				publisher,

				resourceId:
					`${STRONGS_RESOURCE_TYPE}/${version}/${key}`
			});

		if (
			individualFound
		) {
			return true;
		}

		return await this.resources.install({
			publisher,

			resourceId:
				`${STRONGS_RESOURCE_TYPE}/${version}`
		});
	}
}