/**
 * Converts a positive one-based number to a bijective alphabetic sequence.
 *
 * Examples: `1 -> a`, `26 -> z`, `27 -> aa`.
 */
export function numberToAlphabeticSequence(number: number): string {
	let result = '';

	while (number > 0) {
		number -= 1;
		const remainder = number % 26;
		result =
			String.fromCharCode(97 + remainder) + result;
		number =
			(number - remainder) / 26;
	}

	return result;
}

/**
 * Converts a bijective alphabetic sequence back to its positive one-based number.
 *
 * Examples: `a -> 1`, `z -> 26`, `aa -> 27`.
 */
export function alphabeticSequenceToNumber(sequence: string): number {
	let number = 0;

	for (let i = 0; i < sequence.length; i++) {
		const digitValue =
			sequence.charCodeAt(i) - 96;
		number +=
			digitValue *
			Math.pow(
				26,
				sequence.length - i - 1
			);
	}

	return number;
}
