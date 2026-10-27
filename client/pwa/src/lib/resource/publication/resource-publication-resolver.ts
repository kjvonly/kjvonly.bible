import type {
	ResourcePublication
} from './resource-publication';

export interface ResourcePublicationRegistration {
	readonly objectType:
		string;

	readonly create:
		(
			objectId: string,
			value: unknown
		) => ResourcePublication;
}

export class ResourcePublicationResolver {
	private readonly registrations:
		ReadonlyMap<
			string,
			ResourcePublicationRegistration
		>;

	constructor(
		registrations:
			readonly ResourcePublicationRegistration[]
	) {
		const map =
			new Map<
				string,
				ResourcePublicationRegistration
			>();

		for (
			const registration
			of registrations
		) {
			if (
				map.has(
					registration.objectType
				)
			) {
				throw new Error(
					`Duplicate Resource publication registration: ${registration.objectType}`
				);
			}

			map.set(
				registration.objectType,
				registration
			);
		}

		this.registrations =
			map;
	}

	resolve(
		objectType: string,
		objectId: string,
		value: unknown
	): ResourcePublication |
		undefined {
		return this.registrations
			.get(
				objectType
			)
			?.create(
				objectId,
				value
			);
	}
}
