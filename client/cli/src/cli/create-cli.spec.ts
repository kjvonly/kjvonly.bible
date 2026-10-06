import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	createCli,
	type CliDependencies
} from './create-cli.js';


const EMPTY_DIAGNOSTICS = {
	blocksProduced: 0,
	wordsProduced: 0,
	sourceIdsPreserved: 0,
	idsGenerated: 0,
	linkedWordsProduced: 0,
	warnings: []
} as const;

function createDependencies(
	overrides:
		Partial<CliDependencies> = {}
): CliDependencies {
	return {
		parseDirectory: {
			run:
				vi.fn()
					.mockResolvedValue({
						total: 0,
						converted: 0,
						failed: 0,
						outputs: [],
						failures: []
					})
		},
		buildManifest: {
			build:
				vi.fn()
		},
		publishManifest: {
			publish:
				vi.fn()
		},
		syncManifest: {
			sync:
				vi.fn()
		},
		setVerbose:
			vi.fn(),
		...overrides
	};
}

afterEach(
	() => {
		process.exitCode =
			undefined;

		vi.restoreAllMocks();
	}
);

describe(
	'createCli',
	() => {
		it(
			'routes parse html to ParseDirectory',
			async () => {
				const run =
					vi.fn()
						.mockResolvedValue({
							total: 1,
							converted: 1,
							failed: 0,
							outputs: [
								{
									sourcePath:
										'/docs/a.html',
									outputPath:
										'/docs/a.json',
									diagnostics:
										EMPTY_DIAGNOSTICS
								}
							],
							failures: []
						});

				vi.spyOn(
					console,
					'log'
				).mockImplementation(
					() => undefined
				);

				const cli =
					createCli(
						createDependencies({
							parseDirectory: {
								run
							}
						})
					);

				await cli.parseAsync([
					'node',
					'kjvonly',
					'parse',
					'html',
					'./documents',
					'--root-selector',
					'#content',
					'--overwrite'
				]);

				expect(
					run
				).toHaveBeenCalledOnce();

				expect(
					run
				).toHaveBeenCalledWith({
					format:
						'html',
					directory:
						'./documents',
					rootSelector:
						'#content',
					overwrite:
						true
				});
			}
		);

		it(
			'reports parse diagnostics and warnings without changing the written document contract',
			async () => {
				const run =
					vi.fn()
						.mockResolvedValue({
							total: 1,
							converted: 1,
							failed: 0,
							outputs: [
								{
									sourcePath: '/docs/a.html',
									outputPath: '/docs/a.json',
									diagnostics: {
										blocksProduced: 2,
										wordsProduced: 3,
										sourceIdsPreserved: 1,
										idsGenerated: 1,
										linkedWordsProduced: 1,
										warnings: [
											{
												code: 'html-class-ignored',
												message: 'Ignored source HTML class "legacy".',
												count: 2
											}
										]
									}
								}
							],
							failures: []
						});

				const log =
					vi.spyOn(
						console,
						'log'
					).mockImplementation(
						() => undefined
					);

				const warn =
					vi.spyOn(
						console,
						'warn'
					).mockImplementation(
						() => undefined
					);

				const cli =
					createCli(
						createDependencies({
							parseDirectory: {
								run
							}
						})
					);

				await cli.parseAsync([
					'node',
					'kjvonly',
					'parse',
					'html',
					'./documents'
				]);

				expect(
					warn
				).toHaveBeenCalledWith(
					'[WARN] /docs/a.html: Ignored source HTML class "legacy". (2)'
				);

				expect(
					log
				).toHaveBeenCalledWith(
					'Produced 2 block(s), 3 word(s); preserved 1 source id(s), generated 1 id(s), linked 1 word(s).'
				);
			}
		);

		it(
			'marks the process unsuccessful when a parse batch contains failures',
			async () => {
				const run =
					vi.fn()
						.mockResolvedValue({
							total: 1,
							converted: 0,
							failed: 1,
							outputs: [],
							failures: [
								{
									sourcePath:
										'/docs/bad.html',
									message:
										'Unsupported block'
								}
							]
						});

				vi.spyOn(
					console,
					'log'
				).mockImplementation(
					() => undefined
				);

				vi.spyOn(
					console,
					'error'
				).mockImplementation(
					() => undefined
				);

				const cli =
					createCli(
						createDependencies({
							parseDirectory: {
								run
							}
						})
					);

				await cli.parseAsync([
					'node',
					'kjvonly',
					'parse',
					'html',
					'./documents'
				]);

				expect(
					process.exitCode
				).toBe(
					1
				);
			}
		);

		it(
			'routes build to BuildManifest',
			async () => {
				const build =
					vi.fn();

				const cli =
					createCli(
						createDependencies({
							buildManifest: {
								build
							}
						})
					);

				await cli.parseAsync([
					'node',
					'kjvonly',
					'build',
					'./manifest.yaml'
				]);

				expect(
					build
				).toHaveBeenCalledOnce();

				expect(
					build
				).toHaveBeenCalledWith(
					'./manifest.yaml'
				);
			}
		);

		it(
			'routes publish to PublishManifest',
			async () => {
				const publish =
					vi.fn();

				const cli =
					createCli(
						createDependencies({
							publishManifest: {
								publish
							}
						})
					);

				await cli.parseAsync([
					'node',
					'kjvonly',
					'publish',
					'./manifest.yaml'
				]);

				expect(
					publish
				).toHaveBeenCalledOnce();

				expect(
					publish
				).toHaveBeenCalledWith(
					'./manifest.yaml'
				);
			}
		);

		it(
			'routes sync to SyncManifest',
			async () => {
				const sync =
					vi.fn();

				const cli =
					createCli(
						createDependencies({
							syncManifest: {
								sync
							}
						})
					);

				await cli.parseAsync([
					'node',
					'kjvonly',
					'sync',
					'./manifest.yaml'
				]);

				expect(
					sync
				).toHaveBeenCalledOnce();

				expect(
					sync
				).toHaveBeenCalledWith(
					'./manifest.yaml'
				);
			}
		);
	}
);
