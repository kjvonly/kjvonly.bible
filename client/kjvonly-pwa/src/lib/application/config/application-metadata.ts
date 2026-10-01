export interface ApplicationMetadata {
	readonly name: string;
	readonly version: string;
	readonly releaseDate: string;
	readonly gitCommit: string;
	readonly gitTag: string;
	readonly sourceCodeUrl: string;
	readonly license: string;
	readonly licensor: string;
}

///////////////////////////////////////////////////////////////////////////////

export const applicationMetadata: ApplicationMetadata = {
	name: 'KJVonly.bible',
	version: import.meta.env.VITE_APP_VERSION ?? 'development',
	releaseDate: import.meta.env.VITE_APP_RELEASE_DATE ?? '',
	gitCommit: import.meta.env.VITE_APP_GIT_COMMIT ?? 'development',
	gitTag: import.meta.env.VITE_APP_GIT_TAG ?? '',
	sourceCodeUrl: 'https://github.com/kjvonly/kjvonly.bible',
	license: 'MIT License + “Commons Clause” License Condition v1.0',
	licensor: 'man4christ'
};
