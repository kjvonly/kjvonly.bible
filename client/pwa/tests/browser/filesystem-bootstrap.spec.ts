import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	Application
} from '$lib/application/runtime/application';

import {
	KJVONLY_PUBKEY
} from '$lib/infrastructure/nostr/nostr';

import {
	ResourceWorkerClient
} from '$lib/resource/worker';

const FILESYSTEM_BOOTSTRAP_RESOURCE_ID =
	'kjvonly/filesystem/app-filesystem';

describe(
	'Filesystem bootstrap',
	() => {
		let application:
			Application |
			undefined;

		afterEach(
			async () => {
				if (
					application !==
						undefined
				) {
					await application.stop();
				}

				vi.unstubAllEnvs();
				vi.restoreAllMocks();
			}
		);

		it(
			'does not install the Filesystem Resource when bootstrap is disabled',
			async () => {
				configureFocusedFilesystemDevelopment({
					bootstrapMode:
						'disabled',

					runtimeMode:
						'indexeddb'
				});

				const install =
					vi.spyOn(
						ResourceWorkerClient.prototype,
						'install'
					).mockResolvedValue({
						requested: {
							publisher:
								KJVONLY_PUBKEY,

							resourceId:
								FILESYSTEM_BOOTSTRAP_RESOURCE_ID
						},

						found:
							true,

						resources:
							[]
					});

				application =
					createApplication();

				await application.start();
				await authenticate(application);

				await Promise.resolve();

				expect(
					install
				).not.toHaveBeenCalled();
			}
		);

		it(
			'installs the configured Filesystem Resource when bootstrap is enabled',
			async () => {
				configureFocusedFilesystemDevelopment({
					bootstrapMode:
						'enabled',

					runtimeMode:
						'indexeddb'
				});

				const install =
					vi.spyOn(
						ResourceWorkerClient.prototype,
						'install'
					).mockResolvedValue({
						requested: {
							publisher:
								KJVONLY_PUBKEY,

							resourceId:
								FILESYSTEM_BOOTSTRAP_RESOURCE_ID
						},

						found:
							true,

						resources:
							[]
					});

				application =
					createApplication();

				await application.start();
				await authenticate(application);

				await vi.waitFor(
					() => {
						expect(
							install
						).toHaveBeenCalledTimes(1);

						expect(
							install
						).toHaveBeenCalledWith({
							publisher:
								KJVONLY_PUBKEY,

							resourceId:
								FILESYSTEM_BOOTSTRAP_RESOURCE_ID
						});
					}
				);
			}
		);

		it(
			'does not install the published Filesystem while using the mock runtime',
			async () => {
				configureFocusedFilesystemDevelopment({
					bootstrapMode:
						'enabled',

					runtimeMode:
						'mock'
				});

				const install =
					vi.spyOn(
						ResourceWorkerClient.prototype,
						'install'
					);

				application =
					createApplication();

				await application.start();
				await authenticate(application);

				await Promise.resolve();

				expect(
					install
				).not.toHaveBeenCalled();
			}
		);
	}
);

///////////////////////////////////////////////////////////////////////////////

function configureFocusedFilesystemDevelopment(
	options: {
		bootstrapMode:
			'enabled' |
			'disabled';

		runtimeMode:
			'indexeddb' |
			'mock';
	}
): void {
	vi.stubEnv(
		'VITE_APPLICATION_BOOTSTRAP_DEV_MODE',
		'disabled'
	);

	vi.stubEnv(
		'VITE_FILESYSTEM_BOOTSTRAP_MODE',
		options.bootstrapMode
	);

	vi.stubEnv(
		'VITE_FILESYSTEM_DEV_MODE',
		options.runtimeMode
	);
}

///////////////////////////////////////////////////////////////////////////////

function createApplication():
	Application {
	return new Application({
		resourceRelays:
			[]
	});
}

///////////////////////////////////////////////////////////////////////////////

async function authenticate(
	application:
		Application
): Promise<void> {
	await application
		.context
		.authenticationService
		.createIdentity();
}
