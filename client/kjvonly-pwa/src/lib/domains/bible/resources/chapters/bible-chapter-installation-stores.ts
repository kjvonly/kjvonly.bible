import type {
	ChapterStore
} from '../../persistence/chapter-store';

import type {
	BibleVersionStore
} from '../../persistence/bible-version-store';

import type {
	ResourceInstallationStore,
	InstallationTransaction
} from '$lib/resource';

export interface BibleChapterInstallationStores {
	readonly chapters:
		ChapterStore;

	readonly bibleVersions:
		BibleVersionStore;

	readonly resourceInstallations:
		ResourceInstallationStore;
}

export type BibleChapterInstallationTransaction =
	InstallationTransaction<
		BibleChapterInstallationStores
	>;