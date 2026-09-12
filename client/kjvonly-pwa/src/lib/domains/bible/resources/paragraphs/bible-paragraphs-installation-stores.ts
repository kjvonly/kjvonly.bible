import type {
	BibleParagraphsStore
} from '$lib/domains/bible/persistence/bible-paragraphs-store';

import type {
	ResourceInstallationStore
} from '$lib/resource/installation/resource-installation-store';

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
