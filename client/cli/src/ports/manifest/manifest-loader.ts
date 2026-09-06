import type {
	Manifest
} from '../domain/manifest.js';


export interface LoadedManifest {
	readonly path:
		string;

	readonly directory:
		string;

	readonly manifest:
		Manifest;
}


export interface ManifestLoader {
	load(
		manifestPath:
			string
	): Promise<
		LoadedManifest
	>;
}