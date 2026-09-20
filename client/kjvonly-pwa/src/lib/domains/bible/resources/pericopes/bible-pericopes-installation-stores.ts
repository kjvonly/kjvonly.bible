import type {
	BiblePericopesStore
} from '../../persistence/bible-pericopes-store';

import type {
	ResourceInstallationStore
} from '$lib/resource';

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
