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
		buildFilesystemDirectory: { build: vi.fn() },
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

		it('routes generic filesystem import to its directory workflow with zero inline limit', async () => {
			const build = vi.fn();
			const cli = createCli(createDependencies({ buildFilesystemDirectory: { build } }));
			await cli.parseAsync([
				'node', 'kjvonly', 'import', 'filesystem', './app-files',
				'--manifest', './publication.yaml', '--root', 'app-filesystem',
				'--output-manifest', './generated.json', '--inline-limit-bytes', '0'
			]);
			expect(build).toHaveBeenCalledOnce();
			expect(build).toHaveBeenCalledWith({
				directory: './app-files', manifestPath: './publication.yaml',
				outputManifestPath: './generated.json', filesystemRoot: 'app-filesystem', inlineLimitBytes: 0
			});
		});


		it('exposes only the filesystem import command', () => {
			const cli = createCli(createDependencies());
			const command = cli.commands.find(child => child.name() === 'import')!;
			expect(command.commands.map(child => child.name())).toEqual(['filesystem']);
		});

		it('passes zero and positive inline thresholds to the directory importer', async () => {
			const build = vi.fn();
			const cli = createCli(createDependencies({ buildFilesystemDirectory: { build } }));
			const args = [
				'node', 'kjvonly', 'import', 'filesystem', './content',
				'--manifest', './publication.yaml', '--root', 'library',
				'--output-manifest', './compiled.json', '--inline-limit-bytes'
			];
			await cli.parseAsync([...args, '0']);
			expect(build).toHaveBeenLastCalledWith(expect.objectContaining({ inlineLimitBytes: 0 }));
			await cli.parseAsync([...args, '2048']);
			expect(build).toHaveBeenLastCalledWith(expect.objectContaining({ inlineLimitBytes: 2048 }));
			expect(build).toHaveBeenCalledTimes(2);
		});

		it.each(['-1', '1.5', 'abc', '9007199254740992'])('rejects invalid inline limit %s before import', async value => {
			const build = vi.fn();
			const cli = createCli(createDependencies({ buildFilesystemDirectory: { build } }));
			// Commander reports option-parser failures on the owning subcommand.
			const importCommand = cli.commands.find(command => command.name() === 'import')!;
			const command = importCommand.commands.find(child => child.name() === 'filesystem')!;
			command.exitOverride();
			command.configureOutput({ writeErr: () => {} });
			await expect(cli.parseAsync([
				'node', 'kjvonly', 'import', 'filesystem', './content',
				'--manifest', './publication.yaml', '--root', 'library',
				'--output-manifest', './compiled.json', '--inline-limit-bytes', value
			])).rejects.toMatchObject({ code: 'commander.invalidArgument' });
			expect(build).not.toHaveBeenCalled();
		});

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
					'--output-dir',
					'./normalized',
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
					outputDirectory: './normalized',
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
												count: 2,
												sourceLocations: [
													{
														line: 3,
														column: 5
													},
													{
														line: 7,
														column: 5
													}
												]
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
					'[WARN] /docs/a.html: Ignored source HTML class "legacy". (2) [source: 3:5, 7:5]'
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

describe('migrate normalized-document CLI', () => {
    it('shows the required destination option in migrate help', () => {
        const cli = createCli(createDependencies());
        const migrate = cli.commands.find(command => command.name() === 'migrate');
        if (!migrate) throw new Error('Missing migrate command.');

        const output: string[] = [];
        migrate.configureOutput({ writeOut: text => { output.push(text); } });
        migrate.outputHelp();

        expect(output.join('')).toContain('--output-dir <directory>');
        expect(output.join('')).toContain(
            'kjvonly migrate normalized-document ./legacy-json --output-dir ./canonical-documents'
        );
        const normalizedDocument = migrate.commands.find(
            command => command.name() === 'normalized-document'
        );
        expect(normalizedDocument?.helpInformation()).toContain('--output-dir <directory>');
    });

    it('routes the recursive legacy JSON migration with a required destination', async () => {
        const run = vi.fn().mockResolvedValue({
            total: 1, converted: 1, failed: 0, outputs: [], failures: []
        });
        vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const cli = createCli(createDependencies({ parseDirectory: { run } }));
        await cli.parseAsync([
            'node', 'kjvonly', 'migrate', 'normalized-document',
            './legacy-sermons', '--output-dir', './canonical-sermons', '--overwrite'
        ]);
        expect(run).toHaveBeenCalledWith({
            format: 'legacy-normalized-document',
            directory: './legacy-sermons',
            outputDirectory: './canonical-sermons',
            overwrite: true
        });
    });
});
