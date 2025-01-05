export function isScrolledIntoView(el: HTMLElement, box: HTMLElement): boolean {
	var rect = el.getBoundingClientRect();
	var boxRect = box.getBoundingClientRect();
	var elemTop = rect.top;
	var elemBottom = rect.bottom;
	// Only completely visible elements return true:
	var isVisible = elemTop >= boxRect.top && elemBottom <= boxRect.bottom;
	// Partially visible elements return true:
	//isVisible = elemTop < window.innerHeight && elemBottom >= 0;
	return isVisible;
}

export function scrolledIntoView(idSuffix: string, index: string, boxId: string) {
	let el = document.getElementById(idSuffix + index);
	let boxEl = document.getElementById(boxId);
	if (el === null || boxEl === null) {
		return 0;
	}

	if (!isScrolledIntoView(el, boxEl)) {
		el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
}

export function nextLine(
	idSuffix: string,
	currentIndex: number,
	maxIndex: number,
	boxId: string
): number {
	let sv = currentIndex + 1;
	let nextIndex = sv % maxIndex;
	let el = document.getElementById(idSuffix + nextIndex);
	let boxEl = document.getElementById(boxId);
	if (el === null || boxEl === null) {
		return 0;
	}

	if (!isScrolledIntoView(el, boxEl)) {
		el?.scrollIntoView({ behavior: 'smooth' });
	}
	return nextIndex;
}

export function previousLine(
	idSuffix: string,
	currentIndex: number,
	maxIndex: number,
	boxId: string
): number {
	let nextIndex: number;
	let previousIndex = currentIndex - 1;

	if (previousIndex < 0) {
		nextIndex = maxIndex;
	} else {
		nextIndex = previousIndex;
	}
	let el = document.getElementById(idSuffix + nextIndex);
	let boxEl = document.getElementById(boxId);

	if (el === null || boxEl === null) {
		return 0;
	}

	if (!isScrolledIntoView(el, boxEl)) {
		el?.scrollIntoView({ behavior: 'smooth' });
	}
	return nextIndex;
}

export function pageDown(idSuffix: string, index: number, maxIndex: number, boxId: string): number {
	let first = document.getElementById(idSuffix + (index - 1));
	let second = document.getElementById(idSuffix + index);
	let boxEl = document.getElementById(boxId);

	if (first === null || second === null || boxEl === null) {
		return 0;
	}

	let fv = isScrolledIntoView(first, boxEl);
	let sv = isScrolledIntoView(second, boxEl);
	if (fv && index === maxIndex) {
		return index;
	}

	if (fv && !sv) {
		first.scrollIntoView({ behavior: 'smooth' });
		return index - 1;
	}

	return pageDown(idSuffix, index - 1, maxIndex, boxId);
}

export function pageUp(idSuffix: string, index: number, boxId: string): number {
	let first = document.getElementById(idSuffix + index);
	let second = document.getElementById(idSuffix + (index + 1));
	let boxEl = document.getElementById(boxId);

	if (first === null || second === null || boxEl === null) {
		return 0;
	}

	let fv = isScrolledIntoView(first, boxEl);
	let sv = isScrolledIntoView(second, boxEl);

	if (index === 0 && fv) {
		return 0;
	}

	if (!fv && sv) {
		let st = first.offsetTop - boxEl.getBoundingClientRect().height + first.scrollHeight;
		boxEl.scrollTo(0, st);
		return index;
	}

	return pageUp(idSuffix, index + 1, boxId);
}
