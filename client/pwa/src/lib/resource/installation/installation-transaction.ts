export interface InstallationTransaction<
	TStores
> {
	run<TResult>(
		operation:
			(
				stores: TStores
			) => Promise<TResult>
	): Promise<TResult>;
}