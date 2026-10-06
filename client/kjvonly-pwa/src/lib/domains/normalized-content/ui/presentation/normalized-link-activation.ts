export interface NormalizedLinkActivationGesture {
	readonly button: number;
	readonly altKey: boolean;
	readonly ctrlKey: boolean;
	readonly metaKey: boolean;
	readonly shiftKey: boolean;
}

/**
 * Returns true only for an ordinary primary-button activation.
 *
 * Modified link gestures remain native browser behavior so users retain
 * open-in-new-tab/window and other standard anchor interactions.
 */
export function shouldDelegateNormalizedLinkActivation(
	gesture: NormalizedLinkActivationGesture
): boolean {
	return (
		gesture.button === 0 &&
		!gesture.altKey &&
		!gesture.ctrlKey &&
		!gesture.metaKey &&
		!gesture.shiftKey
	);
}
