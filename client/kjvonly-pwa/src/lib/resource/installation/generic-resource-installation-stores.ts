import type {
	StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

import type {
	ResourceInstallationStore
} from './resource-installation-store';

export interface GenericResourceDomainObjectStore {
	put(
		object:
			StoredDomainObject
	): Promise<void>;
}

export interface GenericResourceInstallationStores {
	readonly domainObjects:
		GenericResourceDomainObjectStore;

	readonly resourceInstallations:
		ResourceInstallationStore;
}

export interface GenericResourceInstallationTransaction {
	run<TResult>(
		operation:
			(
				stores:
					GenericResourceInstallationStores
			) => Promise<TResult>
	): Promise<TResult>;
}
