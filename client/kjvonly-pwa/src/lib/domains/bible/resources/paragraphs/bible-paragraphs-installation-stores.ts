import type {
	BibleParagraphsStore
} from '../../persistence/bible-paragraphs-store';

import type {
	ResourceInstallationStore
} from '$lib/resource';

export interface BibleParagraphsInstallationStores {
	readonly paragraphs:
		BibleParagraphsStore;

	readonly resourceInstallations:
		ResourceInstallationStore;
}

export interface BibleParagraphsInstallationTransaction {
	run<TResult>(
		operation:
			(
				stores:
					BibleParagraphsInstallationStores
			) => Promise<TResult>
	): Promise<TResult>;
}
