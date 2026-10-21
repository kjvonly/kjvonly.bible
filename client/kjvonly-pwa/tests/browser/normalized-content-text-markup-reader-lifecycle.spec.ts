import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	mount,
	tick,
	unmount
} from 'svelte';

import { createNormalizedBookmarkRelocationConfirmedResult } from '$lib/domains/bookmarks';

import {
	Modules,
	type NavigationStateValue,
	type ApplicationContext,
	type NavigationState,
	type PaneNavigation
} from '$lib/application';

import type {
	NormalizedContentTextMarkup,
	NormalizedDocument
} from '$lib/domains/normalized-content';

import {
	NORMALIZED_CONTENT_VIEWS
} from '$lib/domains/normalized-content';
import {
	NORMALIZED_CONTENT_NAVIGATION_RESULTS,
	NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES,
	type NormalizedContentTextMarkupLookupOutcome
} from '$lib/domains/normalized-content/models/normalized-content-navigation.model';

import NormalizedContentReaderTextMarkupHost from './fixtures/normalized-content-reader-text-markup-host.svelte';

const document: NormalizedDocument = {
	blocks: [
		{
			type: 'paragraph',
			id: 'paragraph-1',
			content: [
				{
					type: 'word',
					text: 'Grace'
				},
				{
					type: 'word',
					text: 'Mercy'
				}
			]
		}
	]
};

const navigationState: NavigationState = {
	module: Modules.NORMALIZED_CONTENT,
	view: NORMALIZED_CONTENT_VIEWS.READER,
	state: {
		descriptor: {
			metadata: {
				name: 'Lifecycle Test',
				publisher: 'document-publisher',
				resourceId: 'document-resource',
				modifiedAt: 42,
				dataType: 'kjvonly.normalized-document',
				dataVersion: 1
			}
		}
	}
};

let root: HTMLDivElement | undefined;
let component: ReturnType<typeof mount> | undefined;

afterEach(async () => {
	if (component) {
		await unmount(
			component
		);
	}

	root?.remove();
	root = undefined;
	component = undefined;
});

describe(
	'Normalized Content Reader Text Markup lifecycle',
	() => {
		it('does not follow an unresolved local fragment into another mounted document', async () => {
			const linkedDocument: NormalizedDocument = {
				blocks: [{
					type: 'paragraph',
					id: 'linked-paragraph',
					content: [{ type: 'word', text: 'Missing target', href: ['#other-pane-anchor'] }]
				}]
			};
			const { navigation } = mountReader(
				createAuthentication('user-a'),
				createTextMarkupService(),
				vi.fn(),
				linkedDocument
			);
			const otherPane = window.document.createElement('div');
			otherPane.id = 'other-pane-anchor';
			window.document.body.append(otherPane);
			try {
				await waitFor(() => !!root?.querySelector('a[href="#other-pane-anchor"]'),
					'linked word to render');
				const link = root!.querySelector<HTMLAnchorElement>('a[href="#other-pane-anchor"]')!;
				const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
				link.dispatchEvent(click);
				expect(click.defaultPrevented).toBe(true);
				expect(navigation.pushModule).not.toHaveBeenCalled();
			} finally {
				otherPane.remove();
			}
		});

		it(
			'releases Reader collection, Bookmark, authentication, and Text Markup listeners on unmount',
			async () => {
				const authentication = createAuthentication('user-a');
				const textMarkup = createTextMarkupService();
				const subscriptions = mountReader(authentication, textMarkup);

				await waitFor(
					() => textMarkup.subscribe.mock.calls.length === 1,
					'Text Markup subscription to be established'
				);
				expect(subscriptions.notes.subscribe).toHaveBeenCalledWith(
					expect.any(String),
					expect.any(String),
					expect.any(Function)
				);
				expect(subscriptions.bookmarks.subscribe).toHaveBeenCalledTimes(1);
				expect(authentication.service.subscribe).toHaveBeenCalledTimes(1);

				const notesCollectionId = subscriptions.notes.subscribe.mock.calls[0]?.[0];
				const markupSubscriberId = textMarkup.subscribe.mock.calls[0]?.[0];
				const documentLoadsBeforeUnmount = textMarkup.get.mock.calls.length;

				await unmount(component!);
				component = undefined;

				expect(subscriptions.notes.unsubscribe).toHaveBeenCalledWith(notesCollectionId);
				expect(subscriptions.bookmarks.unsubscribe).toHaveBeenCalledTimes(1);
				expect(textMarkup.unsubscribe).toHaveBeenCalledWith(markupSubscriberId);

				authentication.setUser('user-b');
				await flush();
				expect(textMarkup.get).toHaveBeenCalledTimes(documentLoadsBeforeUnmount);
			}
		);

		it('does not re-query document Notes or Bookmarks when the active account changes', async () => {
			const authentication = createAuthentication('user-a');
			const textMarkup = createTextMarkupService();
			const { notes, bookmarks } = mountReader(authentication, textMarkup);
			await waitFor(() => notes.getAllNotes.mock.calls.length > 0 &&
				bookmarks.listForNormalizedDocument.mock.calls.length > 0 &&
				textMarkup.get.mock.calls.length === 1, 'initial Reader lookups');

			const notesQueries = notes.getAllNotes.mock.calls.length;
			const bookmarkQueries = bookmarks.listForNormalizedDocument.mock.calls.length;
			authentication.setUser('user-b');
			await waitFor(() => textMarkup.get.mock.calls.length === 2,
				'new account Text Markup lookup');
			await flush();

			expect(notes.getAllNotes).toHaveBeenCalledTimes(notesQueries);
			expect(bookmarks.listForNormalizedDocument).toHaveBeenCalledTimes(bookmarkQueries);
		});

		it(
			'shows the failed lookup explanation only after Edit pushes its view',
			async () => {
				const authentication = createAuthentication('user-a');
				const textMarkup = createTextMarkupService(
					async () => { throw new Error('Relay unavailable'); }
				);
				const { navigation } = mountReader(authentication, textMarkup);
				await waitFor(() => textMarkup.get.mock.calls.length === 1 &&
					!requireButton('Edit').disabled, 'failed lookup to finish');
				expect(root?.textContent).not.toContain('Starting new markings could overwrite');
				expect(findButton('Retry lookup')).toBeUndefined();
				requireButton('Edit').click();
				expect(navigation.pushView).toHaveBeenCalledWith(
					NORMALIZED_CONTENT_VIEWS.TEXT_MARKUP_LOOKUP, {
						descriptor: navigationState.state.descriptor
					}
				);
				expect(textMarkup.put).not.toHaveBeenCalled();
			}
		);

		it('displays locally saved markings while the relay verification is pending and preserves them on failure', async () => {
			const remote = deferred<NormalizedContentTextMarkup>();
			const authentication = createAuthentication('user-a');
			const textMarkup = createTextMarkupService(async () => remote.promise);
			const local = createTextMarkup('user-a', 'markup-a', 'bg-highlighta');
			textMarkup.getLocal.mockResolvedValue(local);
			const { navigation } = mountReader(authentication, textMarkup);

			await waitFor(() => requireWord().classList.contains('bg-highlighta') &&
				textMarkup.get.mock.calls.length === 1, 'local highlights to appear before relay finishes');
			expect(textMarkup.getLocal).toHaveBeenCalledWith('user-a', navigationState.state.descriptor);
			expect(textMarkup.subscribe).toHaveBeenCalledWith(expect.any(String), local.id, expect.any(Function));
			expect(requireButton('Edit').disabled).toBe(true);
			expect(navigation.pushView).not.toHaveBeenCalled();

			remote.reject(new Error('Relay unavailable'));
			await waitFor(() => !requireButton('Edit').disabled, 'relay verification to finish');
			expect(requireWord().classList.contains('bg-highlighta')).toBe(true);
			requireButton('Edit').click();
			expect(navigation.pushView).toHaveBeenCalledWith(
				NORMALIZED_CONTENT_VIEWS.TEXT_MARKUP_LOOKUP,
				{ descriptor: navigationState.state.descriptor }
			);
			expect(textMarkup.put).not.toHaveBeenCalled();
		});

		it('clears the previous owner immediately while the next local lookup is pending', async () => {
			const authentication = createAuthentication('user-a');
			const textMarkup = createTextMarkupService(async (publisher) =>
				createTextMarkup(publisher, `markup-${publisher}`,
					publisher === 'user-a' ? 'bg-highlighta' : 'bg-highlightb')
			);
			const nextLocalRead = deferred<NormalizedContentTextMarkup | undefined>();
			textMarkup.getLocal.mockImplementation(async (publisher) =>
				publisher === 'user-b'
					? nextLocalRead.promise
					: createTextMarkup('user-a', 'markup-user-a', 'bg-highlighta')
			);
			mountReader(authentication, textMarkup);

			await waitFor(() => requireWord().classList.contains('bg-highlighta') &&
				!requireButton('Edit').disabled, 'original owner markings to load');
			const firstSubscriberId = textMarkup.subscribe.mock.calls[0]?.[0];

			authentication.setUser('user-b');
			await tick();

			expect(requireWord().classList.contains('bg-highlighta')).toBe(false);
			expect(requireButton('Edit').disabled).toBe(true);
			expect(textMarkup.unsubscribe).toHaveBeenCalledWith(firstSubscriberId);
			expect(textMarkup.get).toHaveBeenCalledTimes(1);

			nextLocalRead.resolve(createTextMarkup('user-b', 'markup-user-b', 'bg-highlightb'));
			await waitFor(() => requireWord().classList.contains('bg-highlightb') &&
				!requireButton('Edit').disabled, 'new owner markings to load');
			expect(textMarkup.get).toHaveBeenCalledTimes(2);
		});

		it('replaces displayed local markings after the relay installs a newer copy', async () => {
			const remote = deferred<NormalizedContentTextMarkup>();
			const textMarkup = createTextMarkupService(async () => remote.promise);
			textMarkup.getLocal.mockResolvedValue(createTextMarkup('user-a', 'markup-a', 'bg-highlighta'));
			const { navigation } = mountReader(createAuthentication('user-a'), textMarkup);

			await waitFor(() => requireWord().classList.contains('bg-highlighta'), 'local markings');
			remote.resolve(createTextMarkup('user-a', 'markup-a', 'bg-highlightb'));
			await waitFor(() => requireWord().classList.contains('bg-highlightb') &&
				!requireButton('Edit').disabled, 'updated accepted markings');
			expect(requireWord().classList.contains('bg-highlighta')).toBe(false);
			// The verified copy has the same Domain identity as the local copy.
			// Its new markings must not replace the existing Reader subscription.
			expect(textMarkup.subscribe).toHaveBeenCalledTimes(1);
			requireButton('Edit').click();
			await waitFor(() => findButton('Save Text Markup') !== undefined, 'verified editor to open');
			expect(textMarkup.get).toHaveBeenCalledTimes(1);
			requireButton('Save Text Markup').click();
			await waitFor(() => findButton('Edit') !== undefined, 'unchanged editor to close');
			requireButton('Edit').click();
			await waitFor(() => findButton('Save Text Markup') !== undefined, 'verified editor to reopen');
			expect(textMarkup.get).toHaveBeenCalledTimes(1);
			expect(navigation.pushView).not.toHaveBeenCalled();
		});

		it(
			'retries a failed lookup and returns to document actions with accepted markings',
			async () => {
				const authentication = createAuthentication('user-a');
				let attempts = 0;
				const textMarkup = createTextMarkupService(async () => {
					if (++attempts === 1) throw new Error('Relay unavailable');
					return createTextMarkup('user-a', 'markup-a', 'bg-highlighta');
				});
				const { navigation, retryLookup } = mountReader(authentication, textMarkup);
				await waitFor(() => textMarkup.get.mock.calls.length === 1 &&
					!requireButton('Edit').disabled, 'initial failure');
				requireButton('Edit').click();
				await retryLookup();
				await waitFor(() => requireWord().classList.contains('bg-highlighta') &&
					findButton('Save Text Markup') !== undefined, 'retry to enable actions');
				expect(textMarkup.get).toHaveBeenCalledTimes(2);
				expect(textMarkup.put).not.toHaveBeenCalled();
				requireButton('Save Text Markup').click();
				await waitFor(() => findButton('Edit') !== undefined, 'action toolbar to close');
				requireButton('Edit').click();
				await waitFor(() => findButton('Save Text Markup') !== undefined,
					'Edit to reopen normally after a successful Retry');
				expect(navigation.pushView).toHaveBeenCalledTimes(1);
			}
		);

		it(
			'does not navigate away from the warning view when a retry fails',
			async () => {
				const textMarkup = createTextMarkupService(
					async () => { throw new Error('Relay unavailable'); }
				);
				const { navigation, retryLookup } = mountReader(
					createAuthentication('user-a'), textMarkup
				);
				await waitFor(() => !requireButton('Edit').disabled &&
					textMarkup.get.mock.calls.length === 1, 'initial failure');
				requireButton('Edit').click();
				await expect(retryLookup()).rejects.toThrow();
				expect(navigation.pushView).toHaveBeenCalledTimes(1);
				expect(findButton('Save Text Markup')).toBeUndefined();
			}
		);

		it('uses an available local copy without resolving a failed relay lookup', async () => {
			const textMarkup = createTextMarkupService(
				async () => { throw new Error('Relay unavailable'); }
			);
			const local = createTextMarkup('user-a', 'markup-a', 'bg-highlighta');
			textMarkup.getLocal.mockResolvedValue(local);
			const { navigation, sendNavigationResult } = mountReader(
				createAuthentication('user-a'), textMarkup
			);

			await waitFor(() => requireWord().classList.contains('bg-highlighta') &&
				!requireButton('Edit').disabled, 'local markings and failed verification');
			requireButton('Edit').click();
			await sendNavigationResult({
				type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP,
				outcome: NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.USE_LOCAL,
				publisher: 'user-a',
				markup: local as unknown as NavigationStateValue
			});
			await waitFor(() => findButton('Save Text Markup') !== undefined,
				'document actions to open using local markings');
			expect(requireWord().classList.contains('bg-highlighta')).toBe(true);
			expect(textMarkup.create).not.toHaveBeenCalled();
			expect(textMarkup.put).not.toHaveBeenCalled();
			expect(textMarkup.subscribe).toHaveBeenCalledTimes(1);

			requireButton('Save Text Markup').click();
			await waitFor(() => findButton('Edit') !== undefined, 'actions to close');
			requireButton('Edit').click();
			expect(navigation.pushView).toHaveBeenCalledTimes(2);
		});

		it(
			'creates a fresh draft only after explicit selection from the warning view',
			async () => {
				const authentication = createAuthentication('user-a');
				const textMarkup = createTextMarkupService(
					async () => { throw new Error('Relay unavailable'); }
				);
				const { navigation, selectLookupOption } = mountReader(authentication, textMarkup);
				await waitFor(() => textMarkup.get.mock.calls.length === 1 &&
					!requireButton('Edit').disabled, 'initial failure');
				requireButton('Edit').click();
				await selectLookupOption(NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.START_NEW);
				await waitFor(() => findButton('Save Text Markup') !== undefined,
					'document actions with new markup');
				expect(textMarkup.create).toHaveBeenCalledTimes(1);
				expect(textMarkup.put).not.toHaveBeenCalled();

				requireButton('Save Text Markup').click();
				await waitFor(() => findButton('Edit') !== undefined, 'unchanged draft to close');
				expect(textMarkup.put).not.toHaveBeenCalled();
				requireButton('Edit').click();
				await waitFor(() => vi.mocked(navigation.pushView).mock.calls.length === 2,
					'choice view to reopen after a new-markup decision');
				await selectLookupOption(NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.START_NEW);
				await waitFor(() => findButton('Save Text Markup') !== undefined,
					'new markup mode to reopen');
				expect(textMarkup.create).toHaveBeenCalledTimes(1);
				requireWord().click();
				await tick();
				requireButton('Save Text Markup').click();
				await waitFor(() => textMarkup.put.mock.calls.length === 1,
					'changed new markup to save');
			}
		);

		it(
			'opens Notes and Bookmarks actions without selecting Text Markup',
			async () => {
				const textMarkup = createTextMarkupService(
					async () => { throw new Error('Relay unavailable'); }
				);
				const { bookmarks, navigation, selectLookupOption } = mountReader(
					createAuthentication('user-a'), textMarkup
				);
				await waitFor(() => textMarkup.get.mock.calls.length === 1 &&
					!requireButton('Edit').disabled, 'initial failure');
				requireButton('Edit').click();
				await selectLookupOption(NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.WITHOUT_MARKUP);
				await waitFor(() => findButton('Close actions') !== undefined,
					'document actions without markup');
				expect(findButton('Save Text Markup')).toBeUndefined();
				expect(root?.textContent).toContain('Choose an action');
				expect(root?.querySelector('[aria-label="markup color picker"]')).toBeNull();
				expect(root?.querySelector('[aria-label="text color"]')).toBeNull();
				expect(root?.querySelector('[aria-label="highlight color"]')).toBeNull();
				expect(root?.querySelector('[aria-label="underline color"]')).toBeNull();
				expect(root?.querySelector('[aria-label="document notes"]')).not.toBeNull();
				expect(root?.querySelector('[aria-label="add note"]')).not.toBeNull();
				expect(root?.querySelector('[aria-label="add bookmark"]')).not.toBeNull();

				requireWord().click();
				await tick();
				expect(requireWord().classList.contains('bg-highlighta')).toBe(false);
				root?.querySelector<HTMLButtonElement>('button[aria-label="add note"]')?.click();
				await tick();
				requireWord().click();
				await waitFor(() => vi.mocked(navigation.pushModule).mock.calls.length === 1,
					'Note to open without markup');
				expect(textMarkup.create).not.toHaveBeenCalled();
				expect(textMarkup.put).not.toHaveBeenCalled();

				requireButton('Edit').click();
				await waitFor(() => vi.mocked(navigation.pushView).mock.calls.length === 2,
					'choice view to reopen after Note');
				await selectLookupOption(NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.WITHOUT_MARKUP);
				await waitFor(() => findButton('Close actions') !== undefined,
					'actions reopened after choosing without markup');
				root?.querySelector<HTMLButtonElement>('button[aria-label="add bookmark"]')?.click();
				await tick();
				requireWord(1).click();
				await waitFor(() => bookmarks.create.mock.calls.length === 1,
					'Bookmark creation without markup');
				expect(textMarkup.create).not.toHaveBeenCalled();
				expect(textMarkup.put).not.toHaveBeenCalled();
			}
		);

		it(
			'asks again on Edit after skipping markup and lets the user change to new markup',
			async () => {
				const textMarkup = createTextMarkupService(
					async () => { throw new Error('Relay unavailable'); }
				);
				const { navigation, selectLookupOption } = mountReader(
					createAuthentication('user-a'), textMarkup
				);
				await waitFor(() => textMarkup.get.mock.calls.length === 1 &&
					!requireButton('Edit').disabled, 'initial failure');
				requireButton('Edit').click();
				await selectLookupOption(NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.WITHOUT_MARKUP);
				await waitFor(() => findButton('Close actions') !== undefined,
					'Notes and Bookmarks actions');
				requireButton('Close actions').click();
				await waitFor(() => findButton('Edit') !== undefined,
					'document actions to close');
				requireButton('Edit').click();
				expect(navigation.pushView).toHaveBeenCalledTimes(2);
				expect(findButton('Save Text Markup')).toBeUndefined();
				await selectLookupOption(NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.START_NEW);
				await waitFor(() => findButton('Save Text Markup') !== undefined,
					'markup tools to become available after changing choice');
				expect(textMarkup.create).toHaveBeenCalledTimes(1);
				expect(textMarkup.put).not.toHaveBeenCalled();
			}
		);

		it(
			'asks again after new markup and reuses the accepted draft when choices change',
			async () => {
				const textMarkup = createTextMarkupService(
					async () => { throw new Error('Relay unavailable'); }
				);
				const { navigation, selectLookupOption } = mountReader(
					createAuthentication('user-a'), textMarkup
				);
				await waitFor(() => textMarkup.get.mock.calls.length === 1 &&
					!requireButton('Edit').disabled, 'initial failure');
				requireButton('Edit').click();
				await selectLookupOption(NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.START_NEW);
				await waitFor(() => findButton('Save Text Markup') !== undefined,
					'first new-markup session');
				requireButton('Save Text Markup').click();
				await waitFor(() => findButton('Edit') !== undefined, 'action toolbar to close');
				requireButton('Edit').click();
				expect(navigation.pushView).toHaveBeenCalledTimes(2);
				await selectLookupOption(NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.WITHOUT_MARKUP);
				await waitFor(() => findButton('Close actions') !== undefined,
					'Notes-only action mode');
				requireButton('Close actions').click();
				await waitFor(() => findButton('Edit') !== undefined,
					'document actions to close');
				requireButton('Edit').click();
				expect(navigation.pushView).toHaveBeenCalledTimes(3);
				await selectLookupOption(NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.START_NEW);
				await waitFor(() => findButton('Save Text Markup') !== undefined,
					'new-markup choice to return');
				expect(textMarkup.create).toHaveBeenCalledTimes(1);
				expect(textMarkup.subscribe).toHaveBeenCalledTimes(1);
				expect(textMarkup.put).not.toHaveBeenCalled();
			}
		);

		it(
			're-enables markup after authentication changes following a skip',
			async () => {
				const authentication = createAuthentication('user-a');
				const textMarkup = createTextMarkupService(async (publisher) => {
					if (publisher === 'user-a') throw new Error('Relay unavailable');
					return createTextMarkup('user-b', 'markup-b');
				});
				const { selectLookupOption } = mountReader(authentication, textMarkup);
				await waitFor(() => textMarkup.get.mock.calls.length === 1 &&
					!requireButton('Edit').disabled, 'initial failure');
				requireButton('Edit').click();
				await selectLookupOption(NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.WITHOUT_MARKUP);
				await tick();
				requireButton('Close actions').click();
				authentication.setUser('user-b');
				await waitFor(() => !requireButton('Edit').disabled &&
					textMarkup.subscribe.mock.calls.length === 1, 'user B markup to load');
				requireButton('Edit').click();
				await waitFor(() => findButton('Save Text Markup') !== undefined,
					'normal markup editing to return');
				expect(root?.querySelector('[aria-label="markup color picker"]')).not.toBeNull();
			}
		);
		it(
			'keeps signed-out reading available and requires login before editing',
			async () => {
				const authentication =
					createAuthentication();
				const textMarkup =
					createTextMarkupService();
				const toast = vi.fn();

				mountReader(
					authentication,
					textMarkup,
					toast
				);

				await waitFor(
					() => !requireButton('Edit').disabled,
					'Edit action to become available after document load'
				);

				requireButton('Edit').click();
				await tick();

				expect(toast).toHaveBeenCalledWith(
					'Login first'
				);
				expect(textMarkup.get).not.toHaveBeenCalled();
				expect(findButton('Cancel edits')).toBeUndefined();
			}
		);

		it(
			'disables native selection only while editing document markup',
			async () => {
				const authentication = createAuthentication('user-a');
				const textMarkup = createTextMarkupService(
					async () => createTextMarkup('user-a', 'markup-a')
				);

				mountReader(authentication, textMarkup);
				await waitFor(
					() => !requireButton('Edit').disabled,
					'document to become editable'
				);

				const documentRoot = requireWord().closest('div.py-4');
				expect(documentRoot).not.toBeNull();
				expect(documentRoot?.classList.contains('kjvonly-noselect')).toBe(false);

				requireButton('Edit').click();
				await tick();
				expect(documentRoot?.classList.contains('kjvonly-noselect')).toBe(true);

				requireButton('Cancel edits').click();
				await tick();
				expect(documentRoot?.classList.contains('kjvonly-noselect')).toBe(false);

				requireButton('Edit').click();
				await tick();
				expect(documentRoot?.classList.contains('kjvonly-noselect')).toBe(true);

				requireButton('Save Text Markup').click();
				await waitFor(
					() => findButton('Edit') !== undefined,
					'save to return to reading mode'
				);
				expect(documentRoot?.classList.contains('kjvonly-noselect')).toBe(false);
			}
		);

		it(
			'applies accepted Text Markup events immediately, including while editing',
			async () => {
				const accepted = createTextMarkup(
					'user-a',
					'markup-a',
					'bg-highlighta'
				);
				const authentication =
					createAuthentication('user-a');
				const textMarkup =
					createTextMarkupService(
						async () => accepted
					);

				mountReader(
					authentication,
					textMarkup
				);

				await waitFor(
					() => requireWord().classList.contains('bg-highlighta'),
					'accepted markup to render'
				);

				requireButton('Edit').click();
				await tick();
				requireWord().click();
				await tick();

				expect(
					requireWord().classList.contains('bg-highlighta')
				).toBe(false);

				textMarkup.emit(
					createTextMarkup(
						'user-a',
						'markup-a',
						'bg-highlightb'
					)
				);
				await tick();

				expect(
					requireWord().classList.contains('bg-highlightb')
				).toBe(true);
				// A same-object notification updates the draft without re-subscribing.
				expect(textMarkup.subscribe).toHaveBeenCalledTimes(1);

				requireButton('Cancel edits').click();
				await tick();

				expect(
					requireWord().classList.contains('bg-highlightb')
				).toBe(true);
				expect(findButton('Edit')).toBeDefined();
			}
		);

		it(
			'preserves an unsaved draft when authentication re-emits the same user',
			async () => {
				const authentication =
					createAuthentication('user-a');
				const textMarkup =
					createTextMarkupService(
						async () => createTextMarkup(
							'user-a',
							'markup-a',
							'bg-highlighta'
						)
					);

				mountReader(
					authentication,
					textMarkup
				);

				await waitFor(
					() => requireWord().classList.contains('bg-highlighta'),
					'initial markup to render'
				);

				requireButton('Edit').click();
				await tick();
				requireWord().click();
				await tick();
				expect(requireWord().classList.contains('bg-highlighta')).toBe(false);

				authentication.setUser('user-a');
				await flush();

				expect(findButton('Cancel edits')).toBeDefined();
				expect(requireWord().classList.contains('bg-highlighta')).toBe(false);
				expect(textMarkup.get).toHaveBeenCalledTimes(1);
			}
		);

		it(
			'keeps actions closed while a chosen retry is awaiting a response',
			async () => {
				const retry = deferred<NormalizedContentTextMarkup>();
				let reads = 0;
				const textMarkup = createTextMarkupService(async () => {
					if (++reads === 1) throw new Error('initial lookup failed');
					return retry.promise;
				});
				const { retryLookup } = mountReader(createAuthentication('user-a'), textMarkup);
				await waitFor(() => !requireButton('Edit').disabled &&
					textMarkup.get.mock.calls.length === 1, 'initial failed lookup');
				requireButton('Edit').click();
				const retryResult = retryLookup();
				await waitFor(() => textMarkup.get.mock.calls.length === 2,
					'retry to start');
				expect(findButton('Save Text Markup')).toBeUndefined();
				retry.resolve(createTextMarkup('user-a', 'markup-a'));
				await retryResult;
				await waitFor(() => findButton('Cancel edits') !== undefined,
					'retry to open actions');
			}
		);

		it(
			'ignores a retry result completed after an account change',
			async () => {
				const retry = deferred<NormalizedContentTextMarkup>();
				let userAReads = 0;
				const authentication = createAuthentication('user-a');
				const textMarkup = createTextMarkupService(async (publisher) => {
					if (publisher === 'user-b') {
						return createTextMarkup('user-b', 'markup-b');
					}
					if (++userAReads === 1) throw new Error('initial lookup failed');
					return retry.promise;
				});
				const { retryLookup } = mountReader(authentication, textMarkup);
				await waitFor(() => textMarkup.get.mock.calls.length === 1 &&
					!requireButton('Edit').disabled, 'initial failure');
				requireButton('Edit').click();
				const retryResult = retryLookup();
				await waitFor(() => textMarkup.get.mock.calls.length === 2,
					'retry to start');
				authentication.setUser('user-b');
				await waitFor(() => textMarkup.subscribe.mock.calls.some(([, id]) => id === 'markup-b'),
					'user B markup to load');
				retry.resolve(createTextMarkup('user-a', 'markup-a'));
				await retryResult;
				await flush();
				expect(findButton('Cancel edits')).toBeUndefined();
				expect(requireButton('Edit').disabled).toBe(false);
				requireButton('Edit').click();
				await waitFor(() => findButton('Cancel edits') !== undefined,
					'user B actions to open');
			}
		);
		it(
			'closes document actions without saving unchanged or reverted Text Markup',
			async () => {
				const authentication = createAuthentication('user-a');
				const textMarkup = createTextMarkupService();
				mountReader(authentication, textMarkup);
				await waitFor(() => textMarkup.subscribe.mock.calls.length === 1 &&
					!requireButton('Edit').disabled, 'document and accepted markings to load');

				requireButton('Edit').click();
				await tick();
				requireButton('Save Text Markup').click();
				await waitFor(() => findButton('Edit') !== undefined, 'unchanged action mode to close');
				expect(textMarkup.put).not.toHaveBeenCalled();

				requireButton('Edit').click();
				await tick();
				requireWord().click();
				requireWord().click();
				await tick();
				requireButton('Save Text Markup').click();
				await waitFor(() => findButton('Edit') !== undefined, 'reverted action mode to close');
				expect(textMarkup.put).not.toHaveBeenCalled();
				expect(requireWord().classList.contains('bg-highlighta')).toBe(false);
			}
		);

		it(
			'opens document Notes without persisting unchanged Text Markup',
			async () => {
				const authentication = createAuthentication('user-a');
				const textMarkup = createTextMarkupService();
				const { navigation } = mountReader(authentication, textMarkup);
				await waitFor(() => textMarkup.subscribe.mock.calls.length === 1 &&
					!requireButton('Edit').disabled, 'document and accepted markings to load');
				requireButton('Edit').click();
				await tick();
				const notes = root?.querySelector<HTMLButtonElement>('button[aria-label="document notes"]');
				expect(notes).not.toBeNull();
				notes!.click();
				await waitFor(() => vi.mocked(navigation.pushModule).mock.calls.length === 1,
					'document Notes to open');
				expect(textMarkup.put).not.toHaveBeenCalled();
			}
		);

		it(
			'auto-saves a changed highlight before creating a word Bookmark',
			async () => {
				const authentication = createAuthentication('user-a');
				const textMarkup = createTextMarkupService();
				const { bookmarks } = mountReader(authentication, textMarkup);
				await waitFor(() => textMarkup.subscribe.mock.calls.length === 1 &&
					!requireButton('Edit').disabled, 'document and accepted markings to load');
				requireButton('Edit').click();
				await tick();
				requireWord().click();
				root?.querySelector<HTMLButtonElement>('button[aria-label="add bookmark"]')?.click();
				await tick();
				requireWord(1).click();
				await waitFor(() => bookmarks.create.mock.calls.length === 1,
					'Bookmark to be created');
				expect(textMarkup.put).toHaveBeenCalledTimes(1);
				expect(bookmarks.create).toHaveBeenCalledWith(
					expect.objectContaining({
						address: expect.objectContaining({ blockId: 'paragraph-1', contentIndex: 1 })
					}),
					expect.any(String)
				);
			}
		);

		it(
			'keeps one word action selected at a time and restores actions after cancellation',
			async () => {
				const authentication = createAuthentication('user-a');
				const textMarkup = createTextMarkupService();
				const { bookmarks, navigation } = mountReader(authentication, textMarkup);
				await waitFor(() => !requireButton('Edit').disabled, 'document actions to be ready');
				requireButton('Edit').click();
				await tick();

				root?.querySelector<HTMLButtonElement>('button[aria-label="add note"]')?.click();
				await tick();
				expect(root?.textContent).toContain('Select a word for the note');
				expect(root?.querySelector('button[aria-label="add bookmark"]')).toBeNull();
				root?.querySelector<HTMLButtonElement>('button[aria-label="cancel note location selection"]')?.click();
				await tick();
				expect(root?.querySelector('button[aria-label="add bookmark"]')).not.toBeNull();

				root?.querySelector<HTMLButtonElement>('button[aria-label="update bookmark"]')?.click();
				await tick();
				expect(root?.textContent).toContain('Select the new word for the bookmark');
				expect(root?.querySelector('button[aria-label="add note"]')).toBeNull();
				root?.querySelector<HTMLButtonElement>('button[aria-label="cancel bookmark location selection"]')?.click();
				await tick();
				expect(root?.querySelector('button[aria-label="add note"]')).not.toBeNull();
				expect(bookmarks.relocate).not.toHaveBeenCalled();
				expect(navigation.pushModule).not.toHaveBeenCalled();
			}
		);

		it(
			'preserves Note word selection on authentication re-emission and cancels on account change',
			async () => {
				const authentication = createAuthentication('user-a');
				const textMarkup = createTextMarkupService();
				const { navigation } = mountReader(authentication, textMarkup);
				await waitFor(() => !requireButton('Edit').disabled, 'Reader ready for Note selection');

				requireButton('Edit').click();
				await tick();
				root?.querySelector<HTMLButtonElement>('button[aria-label="add note"]')?.click();
				await tick();
				expect(root?.textContent).toContain('Select a word for the note');

				authentication.setUser('user-a');
				await tick();
				expect(root?.textContent).toContain('Select a word for the note');

				authentication.setUser('user-b');
				await tick();
				expect(root?.textContent).not.toContain('Select a word for the note');
				expect(navigation.pushModule).not.toHaveBeenCalled();
			}
		);

		it(
			'opens a canonical word Note after a same-user authentication notification',
			async () => {
				const authentication = createAuthentication('user-a');
				const textMarkup = createTextMarkupService();
				const { navigation } = mountReader(authentication, textMarkup);
				await waitFor(() => !requireButton('Edit').disabled, 'Reader ready for Note selection');

				requireButton('Edit').click();
				await tick();
				root?.querySelector<HTMLButtonElement>('button[aria-label="add note"]')?.click();
				await tick();
				authentication.setUser('user-a');
				await tick();
				requireWord(1).click();
				await waitFor(() => vi.mocked(navigation.pushModule).mock.calls.length === 1,
					'word Note navigation to complete');
				expect(navigation.pushModule).toHaveBeenCalledWith(
					Modules.NOTES,
					expect.any(String),
					expect.objectContaining({
						normalizedDocument: expect.objectContaining({
							createTarget: expect.objectContaining({
								target: {
									kind: 'word',
									address: { blockId: 'paragraph-1', contentIndex: 1 }
								}
							})
						})
					})
				);
				expect(textMarkup.put).not.toHaveBeenCalled();
			}
		);

		it(
			'keeps Bookmark selection on authentication re-emission and cancels on account change',
			async () => {
				const authentication = createAuthentication('user-a');
				const textMarkup = createTextMarkupService();
				const { bookmarks } = mountReader(authentication, textMarkup);
				await waitFor(() => textMarkup.subscribe.mock.calls.length === 1 &&
					!requireButton('Edit').disabled, 'Reader ready for Bookmark selection');

				requireButton('Edit').click();
				await tick();
				root?.querySelector<HTMLButtonElement>('button[aria-label="add bookmark"]')?.click();
				await tick();
				expect(root?.textContent).toContain('Select a word for the bookmark');

				// Re-emitting the same account must not dismiss the selected action.
				authentication.setUser('user-a');
				await tick();
				expect(root?.textContent).toContain('Select a word for the bookmark');

				// A different authenticated owner cancels the in-progress selection.
				authentication.setUser('user-b');
				await tick();
				expect(root?.textContent).not.toContain('Select a word for the bookmark');
				expect(bookmarks.create).not.toHaveBeenCalled();
			}
		);

		it(
			'passes a selected canonical Bookmark destination to the relocation picker',
			async () => {
				const authentication = createAuthentication('user-a');
				const textMarkup = createTextMarkupService();
				const { bookmarks, navigation } = mountReader(authentication, textMarkup);
				await waitFor(() => textMarkup.subscribe.mock.calls.length === 1 &&
					!requireButton('Edit').disabled, 'Reader ready for relocation');

				requireButton('Edit').click();
				await tick();
				root?.querySelector<HTMLButtonElement>('button[aria-label="update bookmark"]')?.click();
				await tick();
				expect(root?.textContent).toContain('Select the new word for the bookmark');
				requireWord(1).click();
				await waitFor(() => vi.mocked(navigation.pushModule).mock.calls.length === 1,
					'Bookmark relocation picker to open');
				expect(navigation.pushModule).toHaveBeenCalledWith(
					Modules.BOOKMARKS,
					expect.any(String),
					expect.objectContaining({
						mode: 'relocate',
						normalizedDestination: expect.objectContaining({
							address: { kind: 'word', blockId: 'paragraph-1', contentIndex: 1 }
						})
					})
				);
				expect(bookmarks.create).not.toHaveBeenCalled();
			}
		);

		it('relocates a Bookmark only after the picker confirms the canonical destination', async () => {
			const authentication = createAuthentication('user-a');
			const textMarkup = createTextMarkupService();
			const { bookmarks, navigation, sendNavigationResult } = mountReader(authentication, textMarkup);
			await waitFor(() => !requireButton('Edit').disabled, 'Reader ready for relocation');

			requireButton('Edit').click();
			await tick();
			root?.querySelector<HTMLButtonElement>('button[aria-label="update bookmark"]')?.click();
			await tick();
			requireWord(1).click();
			await waitFor(() => vi.mocked(navigation.pushModule).mock.calls.length === 1,
				'Bookmark picker to open');
			expect(bookmarks.relocate).not.toHaveBeenCalled();

			const target = {
				kind: 'normalized-document' as const,
				document: { publisher: 'document-publisher', resourceId: 'document-resource' },
				address: { kind: 'word' as const, blockId: 'paragraph-1', contentIndex: 1 }
			};
			const bookmarkId = 'user-a/default/123e4567-e89b-42d3-a456-426614174000';
			await sendNavigationResult(createNormalizedBookmarkRelocationConfirmedResult(
				bookmarkId, target, 'Mercy'
			));
			await waitFor(() => bookmarks.relocate.mock.calls.length === 1,
				'confirmed relocation to be persisted');
			expect(bookmarks.relocate).toHaveBeenCalledWith(bookmarkId, target, 'Mercy');
		});

		it('does not relocate a Bookmark returned for a different document', async () => {
			const authentication = createAuthentication('user-a');
			const textMarkup = createTextMarkupService();
			const { bookmarks, sendNavigationResult } = mountReader(authentication, textMarkup);
			await waitFor(() => !requireButton('Edit').disabled, 'Reader to load');

			await sendNavigationResult(createNormalizedBookmarkRelocationConfirmedResult(
				'user-a/default/123e4567-e89b-42d3-a456-426614174000',
				{
					kind: 'normalized-document',
					document: { publisher: 'document-publisher', resourceId: 'other-document' },
					address: { kind: 'word', blockId: 'paragraph-1', contentIndex: 1 }
				},
				'Mercy'
			));
			expect(bookmarks.relocate).not.toHaveBeenCalled();
		});

		it(
			'saves the mutable draft once and returns to reading mode',
			async () => {
				const authentication =
					createAuthentication('user-a');
				const textMarkup =
					createTextMarkupService(
						async () => createTextMarkup(
							'user-a',
							'markup-a'
						)
					);

				mountReader(
					authentication,
					textMarkup
				);

				await waitFor(
					() => !requireButton('Edit').disabled,
					'markup load to finish'
				);

				requireButton('Edit').click();
				await tick();
				requireWord().click();
				await tick();

				expect(
					requireWord().classList.contains('bg-highlighta')
				).toBe(true);

				requireButton('Save Text Markup').click();

				await waitFor(
					() => findButton('Edit') !== undefined,
					'Save to return the Reader to reading mode'
				);

				expect(textMarkup.put).toHaveBeenCalledTimes(1);
				// Save notifications update accepted Reader state without resubscribing.
				expect(textMarkup.subscribe).toHaveBeenCalledTimes(1);
				expect(textMarkup.put).toHaveBeenCalledWith({
					id: 'markup-a',
					document: {
						publisher: 'document-publisher',
						resourceId: 'document-resource',
						modifiedAt: 42
					},
					markings: {
						'paragraph-1': {
							'0': {
								class: [
									'bg-highlighta'
								]
							}
						}
					}
				});
				expect(
					requireWord().classList.contains('bg-highlighta')
				).toBe(true);
				// A second unchanged editing session must see the accepted saved markings.
				requireButton('Edit').click();
				await tick();
				requireButton('Save Text Markup').click();
				await waitFor(() => findButton('Edit') !== undefined,
					'unchanged second editing session to close');
				expect(textMarkup.put).toHaveBeenCalledTimes(1);
			}
		);

		it(
			'freezes the captured draft and prevents duplicate saves until persistence completes',
			async () => {
				const pendingSave = deferred<void>();
				const authentication =
					createAuthentication('user-a');
				const textMarkup =
					createTextMarkupService(
						async () => createTextMarkup('user-a', 'markup-a')
					);
				textMarkup.put.mockImplementation(
					async () => pendingSave.promise
				);

				mountReader(authentication, textMarkup);
				await waitFor(
					() => !requireButton('Edit').disabled,
					'initial markup load'
				);

				requireButton('Edit').click();
				await tick();
				requireWord().click();
				await tick();
				expect(requireWord().classList.contains('bg-highlighta')).toBe(true);

				requireButton('Save Text Markup').click();
				await waitFor(
					() => textMarkup.put.mock.calls.length === 1,
					'save to begin'
				);
				await tick();

				expect(requireButton('Save Text Markup').disabled).toBe(true);
				expect(requireButton('Cancel edits').disabled).toBe(true);
				requireWord().click();
				requireWord(1).click();
				await tick();
				expect(requireWord().classList.contains('bg-highlighta')).toBe(true);
				expect(requireWord(1).classList.contains('bg-highlighta')).toBe(false);
				expect(textMarkup.put).toHaveBeenCalledTimes(1);

				pendingSave.resolve();
				await waitFor(
					() => findButton('Edit') !== undefined,
					'save to complete'
				);
				expect(requireWord().classList.contains('bg-highlighta')).toBe(true);
				expect(requireWord(1).classList.contains('bg-highlighta')).toBe(false);
			}
		);


		it(
			'shows accepted Text Markup updates even if a local save later fails',
			async () => {
				const pendingSave = deferred<void>();
				const toast = vi.fn();
				const authentication =
					createAuthentication('user-a');
				const textMarkup =
					createTextMarkupService(
						async () => createTextMarkup('user-a', 'markup-a')
					);
				textMarkup.put.mockImplementationOnce(
					async () => pendingSave.promise
				);

				mountReader(authentication, textMarkup, toast);
				await waitFor(
					() => !requireButton('Edit').disabled,
					'initial markup load'
				);
				requireButton('Edit').click();
				await tick();
				requireWord().click();
				await tick();
				requireButton('Save Text Markup').click();
				await waitFor(
					() => textMarkup.put.mock.calls.length === 1,
					'pending save'
				);

				textMarkup.emit(
					createTextMarkup('user-a', 'markup-a', 'bg-highlightb')
				);
				await tick();
				expect(requireWord().classList.contains('bg-highlighta')).toBe(false);
				expect(requireWord().classList.contains('bg-highlightb')).toBe(true);

				pendingSave.reject(new Error('write failed'));
				await waitFor(
					() => !requireButton('Save Text Markup').disabled,
					'failed save to unlock editing'
				);
				expect(toast).toHaveBeenCalledWith('Unable to save Text Markup');
				expect(requireWord().classList.contains('bg-highlightb')).toBe(true);

				requireButton('Cancel edits').click();
				await tick();
				expect(requireWord().classList.contains('bg-highlightb')).toBe(true);
				expect(findButton('Edit')).toBeDefined();
			}
		);

		it(
			'reactively renders a new word marking inside an existing block',
			async () => {
				const authentication =
					createAuthentication('user-a');
				const textMarkup =
					createTextMarkupService(
						async () => createTextMarkup(
							'user-a',
							'markup-a',
							'bg-highlightb'
						)
					);

				mountReader(
					authentication,
					textMarkup
				);

				await waitFor(
					() => requireWord().classList.contains('bg-highlightb'),
					'existing word markup to render'
				);

				requireButton('Edit').click();
				await tick();

				const secondWord = requireWord(1);
				expect(secondWord.classList.contains('bg-highlighta')).toBe(false);
				secondWord.click();
				await tick();

				expect(secondWord.classList.contains('bg-highlighta')).toBe(true);
				expect(requireWord().classList.contains('bg-highlightb')).toBe(true);
			}
		);

		it(
			'ignores a callback for a different accepted Text Markup object',
			async () => {
				const authentication =
					createAuthentication('user-a');
				const textMarkup =
					createTextMarkupService(
						async (publisher) => createTextMarkup(
							publisher,
							`markup-${publisher}`,
							publisher === 'user-a'
								? 'bg-highlighta'
								: 'bg-highlightb'
						)
					);

				mountReader(authentication, textMarkup);
				await waitFor(
					() => requireWord().classList.contains('bg-highlighta'),
					'user A markup to render'
				);

				const previousOnChange =
					textMarkup.subscribe.mock.calls[0]?.[2];
				expect(previousOnChange).toBeDefined();

				authentication.setUser('user-b');
				await waitFor(
					() => requireWord().classList.contains('bg-highlightb'),
					'user B markup to render'
				);

				previousOnChange?.(
					createTextMarkup('user-a', 'markup-user-a', 'bg-highlighta')
				);
				await tick();

				expect(requireWord().classList.contains('bg-highlightb')).toBe(true);
				expect(requireWord().classList.contains('bg-highlighta')).toBe(false);

			}
		);

		it(
			'ignores a stale markup load after authentication switches users',
			async () => {
				let resolveUserA:
					(value: NormalizedContentTextMarkup) => void =
					() => {};

				const userA =
					new Promise<NormalizedContentTextMarkup>(
						(resolve) => {
							resolveUserA = resolve;
						}
					);

				const authentication =
					createAuthentication('user-a');
				const textMarkup =
					createTextMarkupService(
						async (publisher) =>
							publisher === 'user-a'
								? userA
								: createTextMarkup(
									'user-b',
									'markup-b',
									'bg-highlightb'
								)
					);

				mountReader(
					authentication,
					textMarkup
				);

				await waitFor(
					() => textMarkup.get.mock.calls.length === 1,
					'user A markup load to begin'
				);

				authentication.setUser('user-b');

				await waitFor(
					() => requireWord().classList.contains('bg-highlightb'),
					'user B markup to render'
				);

				resolveUserA(
					createTextMarkup(
						'user-a',
						'markup-a',
						'bg-highlighta'
					)
				);
				await flush();

				expect(
					requireWord().classList.contains('bg-highlightb')
				).toBe(true);
				expect(
					requireWord().classList.contains('bg-highlighta')
				).toBe(false);
				expect(
					textMarkup.subscribe.mock.calls.some(
						([, textMarkupId]) =>
							textMarkupId === 'markup-a'
					)
				).toBe(false);
			}
		);
	}
);

function mountReader(
	authentication: ReturnType<typeof createAuthentication>,
	textMarkup: ReturnType<typeof createTextMarkupService>,
	toast: ReturnType<typeof vi.fn> = vi.fn(),
	readerDocument: NormalizedDocument = document
) {
	const notes = {
		subscribe: vi.fn(),
		unsubscribe: vi.fn(),
		getAllNotes: vi.fn()
	};
	const unsubscribeBookmarks = vi.fn();
	const bookmarks = {
		subscribe: vi.fn(() => unsubscribeBookmarks),
		unsubscribe: unsubscribeBookmarks,
		listForNormalizedDocument: vi.fn(async () => []),
		create: vi.fn(),
		relocate: vi.fn(async () => {})
	};

	root = window.document.createElement('div');
	window.document.body.append(root);

	const applicationContext = {
		authenticationService:
			authentication.service,
		applicationReferenceResolver: {
			resolve: vi.fn(() => undefined)
		},
		normalizedContentService: {
			getByDescriptor:
				vi.fn(async () => readerDocument)
		},
		normalizedContentTextMarkupService:
			textMarkup.service,
		notesService: notes,
		// The Reader's Bookmark projection needs the same service surface in
		// lifecycle tests even when no Bookmarks are installed.
		bookmarksService: bookmarks,
		toastService: {
			showToast: toast
		}
	} as unknown as ApplicationContext;

	let navigationResultHandler: ((result: NavigationStateValue) => void | Promise<void>) | undefined;
	const navigation = {
		pushView: vi.fn(),
		back: vi.fn(),
		escapePane: vi.fn(),
		pushModule: vi.fn()
	} as unknown as PaneNavigation;

	component = mount(
		NormalizedContentReaderTextMarkupHost,
		{
			target: root,
			props: {
				applicationContext,
				navigation,
				navigationState,
				registerNavigationResult: (handler: (result: NavigationStateValue) => void | Promise<void>) => {
					navigationResultHandler = handler;
				}
			}
		}
	);
	return {
		notes, bookmarks, navigation,
		async sendNavigationResult(result: NavigationStateValue): Promise<void> {
			if (!navigationResultHandler) throw new Error('Missing Reader result handler');
			await navigationResultHandler(result);
			await tick();
		},
		async selectLookupOption(outcome: Exclude<NormalizedContentTextMarkupLookupOutcome, typeof NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.LOADED>): Promise<void> {
			if (!navigationResultHandler) throw new Error('Missing Reader result handler');
			await navigationResultHandler({
				type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP,
				outcome
			});
			await tick();
		},
		async retryLookup(): Promise<void> {
			if (!navigationResultHandler) throw new Error('Missing Reader result handler');
			// The lookup view retrieves markup before returning a successful outcome.
			const publisher = authentication.service.tryGetUserId()!;
			const markup = await textMarkup.get(publisher, navigationState.state.descriptor);
			await navigationResultHandler({
				type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP,
				outcome: NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.LOADED,
				publisher,
				markup
			});
			await tick();
		}
	};
}

function createAuthentication(
	initialUserId?: string
) {
	let userId = initialUserId;
	const subscribers =
		new Set<(state: unknown) => void>();

	const subscribe = vi.fn(
		(subscriber: (state: unknown) => void) => {
			subscribers.add(subscriber);
			subscriber(
				userId
					? {
						status: 'authenticated',
						userId
					}
					: {
						status: 'signed-out'
					}
			);

			return () => {
				subscribers.delete(subscriber);
			};
		}
	);

	const tryGetUserId = vi.fn(
		() => userId
	);

	return {
		service: {
			subscribe,
			tryGetUserId
		},

		setUser(nextUserId?: string): void {
			userId = nextUserId;

			for (const subscriber of subscribers) {
				subscriber(
					userId
						? {
							status: 'authenticated',
							userId
						}
						: {
							status: 'signed-out'
						}
				);
			}
		}
	};
}

function createTextMarkupService(
	getImplementation: (
		publisher: string,
		descriptor: unknown
	) => Promise<NormalizedContentTextMarkup> =
		async (publisher) =>
			createTextMarkup(
				publisher,
				`markup-${publisher}`
			)
) {
	const subscriptions =
		new Map<
			string,
			{
				textMarkupId: string;
				onChange:
					(textMarkup: NormalizedContentTextMarkup) => void;
			}
		>();

	const get = vi.fn(getImplementation);
	const getLocal = vi.fn(async (_publisher: string, _descriptor: unknown): Promise<NormalizedContentTextMarkup | undefined> => undefined);
	const create = vi.fn((publisher: string) =>
		createTextMarkup(publisher, `markup-${publisher}`)
	);
	// Match the Domain service: a committed local write notifies subscribers.
	const put = vi.fn(async (markup: NormalizedContentTextMarkup) => {
		for (const subscription of subscriptions.values()) {
			if (subscription.textMarkupId === markup.id) {
				subscription.onChange(markup);
			}
		}
	});
	const subscribe = vi.fn(
		(
			subscriberId: string,
			textMarkupId: string,
			onChange:
				(textMarkup: NormalizedContentTextMarkup) => void
		) => {
			subscriptions.set(
				subscriberId,
				{
					textMarkupId,
					onChange
				}
			);
		}
	);
	const unsubscribe = vi.fn(
		(subscriberId: string) => {
			subscriptions.delete(
				subscriberId
			);
		}
	);

	return {
		get,
		getLocal,
		create,
		put,
		subscribe,
		unsubscribe,

		service: {
			get,
			getLocal,
			create,
			put,
			subscribe,
			unsubscribe
		},

		emit(textMarkup: NormalizedContentTextMarkup): void {
			for (const subscription of subscriptions.values()) {
				if (
					subscription.textMarkupId ===
					textMarkup.id
				) {
					subscription.onChange(
						textMarkup
					);
				}
			}
		}
	};
}

function createTextMarkup(
	_publisher: string,
	id: string,
	markupClass?: string
): NormalizedContentTextMarkup {
	return {
		id,
		document: {
			publisher: 'document-publisher',
			resourceId: 'document-resource',
			modifiedAt: 42
		},
		markings:
			markupClass
				? {
					'paragraph-1': {
						'0': {
							class: [
								markupClass
							]
						}
					}
				}
				: {}
	};
}

function findButton(
	label: string
): HTMLButtonElement | undefined {
	const buttons =
		root?.querySelectorAll('button') ?? [];

	for (const button of buttons) {
		if (button.textContent?.trim() === label) {
			return button;
		}
	}

	return undefined;
}

function requireButton(
	label: string
): HTMLButtonElement {
	const button = findButton(label);

	if (!button) {
		throw new Error(
			`Expected button named ${label}.`
		);
	}

	return button;
}

function requireWord(contentIndex = 0): HTMLElement {
	const word =
		root?.querySelector(
			`[data-normalized-content-kind="word"][data-normalized-content-index="${contentIndex}"]`
		);

	if (!(word instanceof HTMLElement)) {
		throw new Error(
			'Expected rendered normalized word.'
		);
	}

	return word;
}

async function flush(): Promise<void> {
	await tick();
	await Promise.resolve();
	await tick();
}

async function waitFor(
	condition: () => boolean,
	description: string
): Promise<void> {
	for (let attempt = 0; attempt < 20; attempt += 1) {
		await flush();

		if (condition()) {
			return;
		}
	}

	throw new Error(
		`Timed out waiting for ${description}.`
	);
}

/** Manually settles one asynchronous write after the Reader has changed state. */
function deferred<T>() {
	let resolve: (value: T) => void = () => {};
	let reject: (reason?: unknown) => void = () => {};
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}
