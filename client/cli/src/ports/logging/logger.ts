export interface Logger {
	verbose(
		event:
			string,

		context?:
			Readonly<
				Record<
					string,
					unknown
				>
			>
	): void;
}