import type {
	Modules
} from '../models/modules.model';

import type {
	NavigationViewState
} from '../services/navigation.service';

export interface ApplicationReference {
	readonly referenceType: string;
	readonly value: string;
}

export interface ApplicationReferenceConsumerRegistration {
	readonly referenceType: string;
	readonly module: Modules;
	readonly view: string | number;
	readonly createState:
		(value: string) => NavigationViewState;
}

export interface ApplicationReferenceDestination {
	readonly module: Modules;
	readonly view: string | number;
	readonly state: NavigationViewState;
}

/**
 * Resolves typed application references to the Module/view that consumes them.
 *
 * The reference value is opaque to this resolver. Its registered consumer owns
 * the meaning of everything after the first `:` delimiter.
 */
export class ApplicationReferenceResolver {
	private readonly registrations =
		new Map<
			string,
			ApplicationReferenceConsumerRegistration
		>();

	constructor(
		registrations:
			readonly ApplicationReferenceConsumerRegistration[]
	) {
		for (const registration of registrations) {
			validateReferenceType(
				registration.referenceType
			);

			if (
				this.registrations.has(
					registration.referenceType
				)
			) {
				throw new Error(
					`Application reference consumer already registered: ${registration.referenceType}`
				);
			}

			this.registrations.set(
				registration.referenceType,
				registration
			);
		}
	}

	resolve(
		reference: string
	): ApplicationReferenceDestination | undefined {
		const parsed =
			parseApplicationReference(
				reference
			);

		if (!parsed) {
			return undefined;
		}

		const registration =
			this.registrations.get(
				parsed.referenceType
			);

		if (!registration) {
			return undefined;
		}

		return {
			module:
				registration.module,
			view:
				registration.view,
			state:
				registration.createState(
					parsed.value
				)
		};
	}
}

/**
 * Parses `<referenceType>:<value>` while preserving the value as opaque data.
 */
export function parseApplicationReference(
	reference: string
): ApplicationReference | undefined {
	const delimiterIndex =
		reference.indexOf(':');

	if (
		delimiterIndex <= 0 ||
		delimiterIndex ===
			reference.length - 1
	) {
		return undefined;
	}

	return {
		referenceType:
			reference.slice(
				0,
				delimiterIndex
			),
		value:
			reference.slice(
				delimiterIndex + 1
			)
	};
}

function validateReferenceType(
	referenceType: string
): void {
	if (
		referenceType.length === 0 ||
		referenceType.includes(':')
	) {
		throw new Error(
			`Invalid application reference type: ${referenceType}`
		);
	}
}
