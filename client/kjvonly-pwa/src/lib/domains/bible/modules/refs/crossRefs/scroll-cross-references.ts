/**
 * Align Cross References with the top of its own ViewBody scroll area.
 * Unlike scrollIntoView(), this cannot move the workspace or any ancestor
 * scroll container (and thus cannot scroll the Refs view header off screen).
 */
export function scrollCrossReferencesToTop(
	section: HTMLElement | undefined
): void {
	const scrollBody = section?.closest<HTMLElement>(
		'[id$="-scroll-container"]'
	);

	if (!scrollBody || !section) {
		return;
	}

	const top =
		scrollBody.scrollTop +
		section.getBoundingClientRect().top -
		scrollBody.getBoundingClientRect().top -
		scrollBody.clientTop;

	scrollBody.scrollTo({
		top: Math.max(0, top),
		behavior: 'smooth'
	});
}
