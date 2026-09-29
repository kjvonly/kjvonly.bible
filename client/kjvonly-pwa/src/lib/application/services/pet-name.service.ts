const PET_NAMES_STORAGE_KEY = 'kjvonly.pet-names.v1';

/**
 * Resolves user-local display names for stable identities such as Nostr pubkeys.
 *
 * Pet names are deliberately local application data. They do not claim to be
 * authoritative profile metadata for the identity they label.
 */
export class PetNameService {
	private readonly petNames = new Map<string, string>();

	constructor(
		private readonly storage: Pick<Storage, 'getItem' | 'setItem'>,
		defaults: Readonly<Record<string, string>> = {}
	) {
		this.load();

		for (const [identity, petName] of Object.entries(defaults)) {
			if (!this.petNames.has(identity)) {
				this.petNames.set(identity, petName);
			}
		}
	}

	/**
	 * Returns a local pet name when one exists, otherwise a compact identity.
	 */
	resolve(identity: string): string {
		return this.petNames.get(identity) ?? compactIdentity(identity);
	}

	/**
	 * Stores a local pet name. Passing an empty name removes the existing one.
	 */
	set(identity: string, petName: string): void {
		const normalizedIdentity = identity.trim();
		const normalizedPetName = petName.trim();

		if (normalizedIdentity.length === 0) {
			throw new Error('Pet name identity cannot be empty.');
		}

		if (normalizedPetName.length === 0) {
			this.petNames.delete(normalizedIdentity);
		} else {
			this.petNames.set(normalizedIdentity, normalizedPetName);
		}

		this.persist();
	}

	private load(): void {
		const serialized = this.storage.getItem(PET_NAMES_STORAGE_KEY);

		if (serialized === null) {
			return;
		}

		try {
			const parsed = JSON.parse(serialized) as unknown;

			if (!isRecord(parsed)) {
				return;
			}

			for (const [identity, petName] of Object.entries(parsed)) {
				if (typeof petName === 'string' && petName.trim().length > 0) {
					this.petNames.set(identity, petName.trim());
				}
			}
		} catch {
			// Invalid local data should fall back to defaults / compact identities.
		}
	}

	private persist(): void {
		this.storage.setItem(
			PET_NAMES_STORAGE_KEY,
			JSON.stringify(Object.fromEntries(this.petNames))
		);
	}
}

function compactIdentity(identity: string): string {
	if (identity.length <= 20) {
		return identity;
	}

	return `${identity.slice(0, 8)}…${identity.slice(-8)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value)
	);
}
