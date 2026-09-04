import {
	readFile
} from 'node:fs/promises';

import {
	dirname,
	resolve
} from 'node:path';

import {
	parse as parseDotEnv
} from 'dotenv';

import nunjucks from 'nunjucks';

import {
	parse as parseYaml
} from 'yaml';

import {
	validateManifest
} from '../../domain/manifest.js';

import type {
	LoadedManifest,
	ManifestLoader
} from '../../ports/manifest-loader.js';


const NOSTR_SECRET_KEY =
	'NOSTR_SECRET_KEY';


export interface NodeManifestLoaderOptions {
	readonly workingDirectory:
		string;

	readonly envFilePath?:
		string;

	readonly runtimeEnvironment:
		Readonly<
			Record<
				string,
				string |
					undefined
			>
		>;
}


export class NodeManifestLoader
	implements ManifestLoader {

	constructor(
		private readonly options:
			NodeManifestLoaderOptions
	) {}


	async load(
		manifestPath:
			string
	): Promise<
		LoadedManifest
	> {

		const absolutePath =
			resolve(
				this.options
					.workingDirectory,
				manifestPath
			);


		const source =
			await readFile(
				absolutePath,
				'utf8'
			);


		const dotEnv =
			await this.loadDotEnv();


		const templateEnvironment =
			this.createTemplateEnvironment(
				dotEnv
			);


		const rendered =
			this.render(
				source,
				templateEnvironment
			);


		const parsed:
			unknown =
				parseYaml(
					rendered
				);


		const manifest =
			validateManifest(
				parsed
			);


		return {
			path:
				absolutePath,

			directory:
				dirname(
					absolutePath
				),

			manifest
		};
	}


	private async loadDotEnv():
		Promise<
			Record<
				string,
				string
			>
		> {

		const envFilePath =
			this.options
				.envFilePath;


		if (
			envFilePath ===
				undefined
		) {
			return {};
		}


		let source:
			string;


		try {
			source =
				await readFile(
					envFilePath,
					'utf8'
				);
		}
		catch (
			error:
				unknown
		) {
			if (
				this.isFileNotFound(
					error
				)
			) {
				return {};
			}


			throw error;
		}


		const environment =
			parseDotEnv(
				source
			);


		if (
			Object.prototype
				.hasOwnProperty.call(
					environment,
					NOSTR_SECRET_KEY
				)
		) {
			throw new Error(
				'NOSTR_SECRET_KEY must not be defined in .env.'
			);
		}


		return environment;
	}


	private createTemplateEnvironment(
		dotEnv:
			Readonly<
				Record<
					string,
					string
				>
			>
	): Record<
		string,
		string
	> {

		const environment:
			Record<
				string,
				string
			> = {
				...dotEnv
			};


		for (
			const [
				key,
				value
			]
			of Object.entries(
				this.options
					.runtimeEnvironment
			)
		) {
			if (
				key ===
					NOSTR_SECRET_KEY ||
				value ===
					undefined
			) {
				continue;
			}


			environment[
				key
			] = value;
		}


		delete environment[
			NOSTR_SECRET_KEY
		];


		return environment;
	}


	private render(
		source:
			string,

		environment:
			Readonly<
				Record<
					string,
					string
				>
			>
	): string {

		const renderer =
			new nunjucks.Environment(
				undefined,
				{
					autoescape:
						false,

					throwOnUndefined:
						true
				}
			);


		return renderer.renderString(
			source,
			{
				env:
					environment
			}
		);
	}


	private isFileNotFound(
		error:
			unknown
	): boolean {

		return (
			error instanceof Error &&
			'code' in error &&
			error.code ===
				'ENOENT'
		);
	}
}