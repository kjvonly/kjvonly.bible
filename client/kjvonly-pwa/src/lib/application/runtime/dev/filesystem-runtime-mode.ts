/**
 * Filesystem backing selected by the application composition root.
 *
 * `indexeddb` is the normal application runtime. `mock` exists only for
 * FileManager / Filesystem development workflows.
 */
export type FilesystemRuntimeMode =
	| 'indexeddb'
	| 'mock';

const DEFAULT_FILESYSTEM_RUNTIME_MODE:
	FilesystemRuntimeMode =
	'indexeddb';

/**
 * Resolves the Filesystem runtime mode without allowing development overrides
 * to affect production composition.
 *
 * @param isDevelopment Whether the application is running in a development build.
 * @param configuredMode Optional development mode supplied by the Vite environment.
 */
export function resolveFilesystemRuntimeMode(
	isDevelopment: boolean,
	configuredMode: string | undefined
): FilesystemRuntimeMode {
	if (!isDevelopment) {
		return 'indexeddb';
	}

	const mode =
		configuredMode?.trim();

	if (!mode) {
		return DEFAULT_FILESYSTEM_RUNTIME_MODE;
	}

	if (
		mode === 'indexeddb' ||
		mode === 'mock'
	) {
		return mode;
	}

	throw new Error(
		`Unsupported VITE_FILESYSTEM_DEV_MODE: ${configuredMode}. ` +
		'Expected indexeddb or mock.'
	);
}

/**
 * Resolves the Filesystem runtime mode for the current application build.
 */
export function createFilesystemRuntimeMode():
	FilesystemRuntimeMode {
	return resolveFilesystemRuntimeMode(
		import.meta.env.DEV,
		import.meta.env.VITE_FILESYSTEM_DEV_MODE
	);
}
