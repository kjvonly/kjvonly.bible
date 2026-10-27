/**
 * Controls whether the normal application bootstrap Resource is installed
 * after authentication during development.
 *
 * `enabled` is the normal application behavior. `disabled` exists only to
 * support focused development workflows that do not need the full bootstrap
 * Resource graph.
 */
export type ApplicationBootstrapMode =
	| 'enabled'
	| 'disabled';

const DEFAULT_APPLICATION_BOOTSTRAP_MODE:
	ApplicationBootstrapMode =
	'enabled';

/**
 * Resolves application bootstrap behavior without allowing a development
 * override to disable bootstrap installation in production builds.
 *
 * @param isDevelopment Whether the application is running in a development build.
 * @param configuredMode Optional mode supplied by the Vite environment.
 */
export function resolveApplicationBootstrapMode(
	isDevelopment: boolean,
	configuredMode: string | undefined
): ApplicationBootstrapMode {
	if (!isDevelopment) {
		return 'enabled';
	}

	const mode =
		configuredMode?.trim();

	if (!mode) {
		return DEFAULT_APPLICATION_BOOTSTRAP_MODE;
	}

	if (
		mode === 'enabled' ||
		mode === 'disabled'
	) {
		return mode;
	}

	throw new Error(
		`Unsupported VITE_APPLICATION_BOOTSTRAP_DEV_MODE: ${configuredMode}. ` +
		'Expected enabled or disabled.'
	);
}

/**
 * Resolves application bootstrap behavior for the current application build.
 */
export function createApplicationBootstrapMode():
	ApplicationBootstrapMode {
	return resolveApplicationBootstrapMode(
		import.meta.env.DEV,
		import.meta.env.VITE_APPLICATION_BOOTSTRAP_DEV_MODE
	);
}
