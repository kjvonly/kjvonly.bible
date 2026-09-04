export function deriveSourceKey(
	filename:
		string
): string {

	const extensionIndex =
		filename.indexOf(
			'.'
		);


	if (
		extensionIndex <= 0
	) {
		return filename;
	}


	return filename.slice(
		0,
		extensionIndex
	);
}