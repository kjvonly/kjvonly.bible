export function deriveSourceExtension(
	filename:
		string
): string {

	const extensionIndex =
		filename.indexOf(
			'.'
		);


	if (
		extensionIndex < 0
	) {
		return '';
	}


	return filename.slice(
		extensionIndex
	);
}