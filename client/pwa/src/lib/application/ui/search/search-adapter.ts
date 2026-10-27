/**
 * Domain-facing boundary used by shared search UI.
 *
 * Implementations bind domain-specific search infrastructure while exposing a
 * small, reusable contract to search views and module containers.
 */
export interface SearchAdapter<TResult> {
	/**
	 * Starts a search for the provided query.
	 */
	search(query: string): Promise<void>;

	/**
	 * Subscribes to completed domain search results.
	 *
	 * @returns A function that removes the subscription.
	 */
	subscribe(listener: (result: TResult) => void): () => void;
}
