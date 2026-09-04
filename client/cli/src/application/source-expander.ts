import {
	basename,
	resolve
} from 'node:path';

import type {
	ConcreteSource
} from '../domain/concrete-source.js';

import {
	interpolateEventKey
} from '../domain/interpolate-key.js';

import type {
	ResourceDefinition
} from '../domain/manifest.js';

import {
	deriveSourceKey
} from '../domain/source-key.js';

import type {
	SourceDirectoryEntry,
	SourceRepository
} from '../ports/source-repository.js';


export interface ExpandSourceRequest {
	readonly manifestDirectory:
		string;

	readonly resourceName:
		string;

	readonly resource:
		ResourceDefinition;
}


export class SourceExpander {

	constructor(
		private readonly sourceRepository:
			SourceRepository
	) {}


	async expand(
		request:
			ExpandSourceRequest
	): Promise<
		readonly ConcreteSource[]
	> {

		const sourcePath =
			resolve(
				request.manifestDirectory,
				request.resource.path
			);


		const pathType =
			await this.sourceRepository
				.getPathType(
					sourcePath
				);


		switch (
			pathType
		) {
			case 'file':
				return this.expandFile(
					request,
					sourcePath
				);


			case 'directory':
				return this.expandDirectory(
					request,
					sourcePath
				);


			case 'missing':
				throw new Error(
					`Resource "${request.resourceName}" source path does not exist: ${sourcePath}`
				);


			case 'other':
				throw new Error(
					`Resource "${request.resourceName}" source path is not a file or directory: ${sourcePath}`
				);
		}
	}


	private expandFile(
		request:
			ExpandSourceRequest,

		sourcePath:
			string
	): readonly ConcreteSource[] {

		const filename =
			basename(
				sourcePath
			);


		if (
			this.isHidden(
				filename
			)
		) {
			return [];
		}


		return [
			this.createConcreteSource(
				request,
				filename,
				sourcePath
			)
		];
	}


	private async expandDirectory(
		request:
			ExpandSourceRequest,

		sourcePath:
			string
	): Promise<
		readonly ConcreteSource[]
	> {

		const entries =
			await this.sourceRepository
				.readDirectory(
					sourcePath
				);


		const files =
			entries
				.filter(
					entry =>
						entry.type ===
							'file' &&
						!this.isHidden(
							entry.name
						)
				)
				.sort(
					(
						left,
						right
					) =>
						this.compareNames(
							left,
							right
						)
				);


		const sources =
			files.map(
				entry =>
					this.createConcreteSource(
						request,
						entry.name,
						entry.path
					)
			);


		this.assertUniqueKeys(
			request.resourceName,
			sources
		);


		return sources;
	}


	private createConcreteSource(
		request:
			ExpandSourceRequest,

		filename:
			string,

		sourcePath:
			string
	): ConcreteSource {

		const key =
			deriveSourceKey(
				filename
			);


		return {
			resourceName:
				request.resourceName,

			key,

			path:
				sourcePath,

			event:
				interpolateEventKey(
					request.resource.event,
					key
				),

			objectUpload:
				request.resource[
					'object-upload'
				]
		};
	}


	private assertUniqueKeys(
		resourceName:
			string,

		sources:
			readonly ConcreteSource[]
	): void {

		const keys =
			new Set<string>();


		for (
			const source
			of sources
		) {
			if (
				keys.has(
					source.key
				)
			) {
				throw new Error(
					`Resource "${resourceName}" contains duplicate source key: ${source.key}`
				);
			}


			keys.add(
				source.key
			);
		}
	}


	private isHidden(
		filename:
			string
	): boolean {

		return filename.startsWith(
			'.'
		);
	}


	private compareNames(
		left:
			SourceDirectoryEntry,

		right:
			SourceDirectoryEntry
	): number {

		if (
			left.name <
				right.name
		) {
			return -1;
		}


		if (
			left.name >
				right.name
		) {
			return 1;
		}


		return 0;
	}
}