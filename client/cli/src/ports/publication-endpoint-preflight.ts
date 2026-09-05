export interface PublicationEndpointPreflight {

	check(
		url:
			string
	): Promise<void>;
}