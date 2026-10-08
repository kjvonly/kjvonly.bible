/**
 * Controls whether the application installs its published Filesystem Resource
 * after authentication.
 *
 * This is release configuration rather than a development runtime override.
 * It is intentionally independent from the Filesystem persistence backing.
 */
export type FilesystemBootstrapMode =
	| 'enabled'
	| 'disabled';

const DEFAULT_FILESYSTEM_BOOTSTRAP_MODE:
	FilesystemBootstrapMode =
	'disabled';

/**
 * Resolves whether the published application Filesystem should be installed.
 *
 * The feature defaults to disabled while the configured bootstrap Resource is
 * still the small integration fixture. Production and development builds may
 * both explicitly enable or disable it.
 *
 * @param configuredMode Optional mode supplied by the Vite environment.
 */
export function resolveFilesystemBootstrapMode(
	configuredMode: string | undefined
): FilesystemBootstrapMode {
	const mode =
		configuredMode?.trim();

	if (!mode) {
		return DEFAULT_FILESYSTEM_BOOTSTRAP_MODE;
	}

	if (
		mode === 'enabled' ||
		mode === 'disabled'
	) {
		return mode;
	}

	throw new Error(
		`Unsupported VITE_FILESYSTEM_BOOTSTRAP_MODE: ${configuredMode}. ` +
		'Expected enabled or disabled.'
	);
}

/**
 * Resolves Filesystem bootstrap behavior for the current application build.
 */
export function createFilesystemBootstrapMode():
	FilesystemBootstrapMode {
	return resolveFilesystemBootstrapMode(
		import.meta.env.VITE_FILESYSTEM_BOOTSTRAP_MODE
	);
}
