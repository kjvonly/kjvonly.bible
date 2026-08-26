import type {
	ResourceInstallation
} from './resource-installation';

export interface ResourceInstallationStore {
	get(
		objectType: string,
		objectId: string
	): Promise<
		ResourceInstallation |
		undefined
	>;

	put(
		installation:
			ResourceInstallation
	): Promise<void>;
}