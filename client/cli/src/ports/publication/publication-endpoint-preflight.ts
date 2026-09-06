export interface PublicationEndpointPreflight {

	check(
		data:
			unknown
	): Promise<void>;
}