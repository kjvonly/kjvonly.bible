import type {
	BiblePericopesStore
} from '$lib/domains/bible/persistence/bible-pericopes-store';

import type {
	ResourceInstallationStore
} from '$lib/resource/installation/resource-installation-store';

export interface BiblePericopesInstallationStores {
	readonly pericopes:
		BiblePericopesStore;

	readonly resourceInstallations:
		ResourceInstallationStore;
}

export interface BiblePericopesInstallationTransaction {
	run<TResult>(
		operation:
			(
				stores:
					BiblePericopesInstallationStores
			) => Promise<TResult>
	): Promise<TResult>;
}
