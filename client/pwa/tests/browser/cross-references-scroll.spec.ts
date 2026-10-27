import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrollCrossReferencesToTop } from '../../src/lib/domains/bible/modules/refs/crossRefs/scroll-cross-references';

let fixture: HTMLElement | undefined;

afterEach(() => {
	fixture?.remove();
	fixture = undefined;
	vi.restoreAllMocks();
});

function createScrollFixture() {
	fixture = document.createElement('div');
	fixture.style.cssText = 'height: 160px; width: 300px; overflow-y: auto';

	const header = document.createElement('header');
	header.textContent = 'Strongs / Refs';
	header.style.height = '48px';

	const body = document.createElement('div');
	body.id = 'refs-test-scroll-container';
	body.style.cssText = 'height: 112px; overflow-y: auto';

	const precedingSections = document.createElement('div');
	precedingSections.style.height = '400px';
	const crossReferences = document.createElement('div');
	crossReferences.style.height = '1000px';
	crossReferences.textContent = 'Cross References';

	body.append(precedingSections, crossReferences);
	fixture.append(header, body);
	document.body.append(fixture);

	return { header, body, crossReferences };
}

describe('Cross References scroll ownership', () => {
	it('scrolls its own ViewBody to the beginning of Cross References, not an ancestor', () => {
		const { header, body, crossReferences } = createScrollFixture();
		body.scrollTop = 650; // already partway through the previous list
		const bodyScroll = vi.spyOn(body, 'scrollTo').mockImplementation(() => {});
		const outerScroll = vi.spyOn(fixture!, 'scrollTo');
		const windowScroll = vi.spyOn(window, 'scrollTo');
		const headerTop = header.getBoundingClientRect().top;

		const expectedTop = body.scrollTop +
			crossReferences.getBoundingClientRect().top -
			body.getBoundingClientRect().top -
			body.clientTop;

		scrollCrossReferencesToTop(crossReferences);

		expect(bodyScroll).toHaveBeenCalledOnce();
		expect(bodyScroll).toHaveBeenCalledWith({
			top: expect.any(Number),
			behavior: 'smooth'
		});
		const scrollOptions = bodyScroll.mock.calls[0]?.[0] as ScrollToOptions;
		expect(scrollOptions.top).toBeCloseTo(expectedTop, 1);
		expect(outerScroll).not.toHaveBeenCalled();
		expect(windowScroll).not.toHaveBeenCalled();
		expect(header.getBoundingClientRect().top).toBe(headerTop);
	});

	it('does nothing without an owning ViewBody', () => {
		const isolatedSection = document.createElement('div');
		document.body.append(isolatedSection);
		try {
			const scrollTo = vi.spyOn(isolatedSection, 'scrollTo');
			expect(() => scrollCrossReferencesToTop(isolatedSection)).not.toThrow();
			expect(scrollTo).not.toHaveBeenCalled();
		} finally {
			isolatedSection.remove();
		}
	});
});
