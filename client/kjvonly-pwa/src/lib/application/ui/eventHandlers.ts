import { sleep } from '$lib/shared';

const FIND_ELEMENT_RETRIES = 10;
const FIND_ELEMENT_RETRY_DELAY_MS = 1000;

export async function findElement(id: string): Promise<HTMLElement | null> {
	let el = document.getElementById(id);
	let retries = 0;

	while (!el && retries < FIND_ELEMENT_RETRIES) {
		await sleep(FIND_ELEMENT_RETRY_DELAY_MS);
		el = document.getElementById(id);
		retries++;
	}

	return el;
}

export function attachEvents(
	id: string,
	event: string,
	fn: EventListenerOrEventListenerObject
): void {
	setTimeout(async () => {
		const el = await findElement(id);
		el?.addEventListener(event, fn);
	}, 50);
}

export type ScrollToViewFunction = (el: HTMLElement) => void;

export function scrollTo(
	id: string,
	fn: ScrollToViewFunction
): void {
	setTimeout(async () => {
		const el = await findElement(id);
		if (!el) {
			return;
		}

		el.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
			inline: 'nearest'
		});

		fn(el);
	}, 50);
}

export function scrollToTop(
	id: string,
	fn: ScrollToViewFunction
): void {
	setTimeout(async () => {
		const el = await findElement(id);
		if (!el) {
			return;
		}

		el.scrollTo(0, 0);
		fn(el);
	}, 50);
}
