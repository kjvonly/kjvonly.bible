// This test mounts the view outside +layout.svelte, which normally loads Tailwind.
import '../../src/app.css';

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
import {
	get
} from 'svelte/store';

import {
	ApplicationReferenceResolver,
	Modules,
	ResourceModuleResolver,
	type ApplicationContext
} from '$lib/application';
import {
	FILE_MANAGER_VIEWS
} from '$lib/application/modules/file-manager/models/file-manager-navigation.model';
import FileManagerNavigationEntry from '$lib/application/modules/file-manager/fileManagerNavigationEntry.svelte';
import {
	MockFilesystemRuntime
} from '$lib/application/runtime/dev/mock-filesystem-runtime';
import {
	NavigationViewRegistry
} from '$lib/application/runtime/rendering/navigation-view-registry';
import {
	NavigationViewResolver
} from '$lib/application/runtime/rendering/navigation-view-resolver';
import {
	NavigationStateBuilder
} from '$lib/application/services/navigation-state-builder';
import {
	NavigationService
} from '$lib/application/services/navigation.service';
import {
	PaneNavigationService
} from '$lib/application/services/pane-navigation.service';
import {
	SettingsService
} from '$lib/application/services/settings.service';

import {
	BIBLE_LOCATION_REFERENCE_TYPE,
	BIBLE_VIEWS,
	parseBibleLocationRef
} from '$lib/domains/bible';
import {
	NOTES_COLLECTION_CHANGED, NOTES_VIEWS,
	type Note, type NotesSearchResult
} from '$lib/domains/notes';
import {
	FilesystemService,
	type FilesystemEntry
} from '$lib/domains/filesystem';
import {
	createNormalizedDocumentIdForDescriptor,
	NormalizedContentService,
	NormalizedDocumentValidator,
	NORMALIZED_CONTENT_RESOURCE_TYPE,
	NORMALIZED_CONTENT_VIEWS,
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION,
	NORMALIZED_DOCUMENT_OBJECT_TYPE,
	normalizedContentResourceModuleRegistrations
} from '$lib/domains/normalized-content';
import {
	normalizedContentNavigationViewRegistrations
} from '$lib/domains/normalized-content/modules/runtime/normalized-content-navigation-view-registrations';
import {
	IndexedDBNormalizedContentStore
} from '$lib/domains/normalized-content/persistence/indexeddb-normalized-content-store';
import {
	POC_REGRESSION_FIXTURES
} from '$lib/domains/normalized-content/testing/poc-regression.fixtures';

import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';
import {
	ResourceDescriptorValidator,
	type ResourceDescriptor
} from '$lib/resource';

import FileManagerNormalizedReaderHost from './fixtures/file-manager-normalized-reader-host.svelte';
import BibleReferenceNavigationTarget from './fixtures/bible-reference-navigation-target.svelte';
import NotesNormalizedWordNavigationTarget from './fixtures/notes-normalized-word-navigation-target.svelte';
import BookmarkBrowseNavigationTarget from './fixtures/bookmarks-normalized-browse-navigation-target.svelte';
import { BOOKMARKS_VIEWS } from '$lib/domains/bookmarks';

// Filesystem path deliberately differs from the published Resource identity.
const FILE_PATH = 'library/commentary/matthew-henry/genesis/Genesis-1.nd.json';
const DIRECTORY_PATH = 'library/commentary/matthew-henry/genesis';
const NAME = 'Matthew Henry — Genesis 1';
const entry: FilesystemEntry = {
	path: FILE_PATH,
	descriptor: {
		resourceMetadata: { category: 'commentary', icon: 'article' },
		metadata: {
			publisher: 'f'.repeat(64),
			resourceId: 'normalized-content/matthew-henry/genesis/1',
			name: NAME,
			resourceType: NORMALIZED_CONTENT_RESOURCE_TYPE,
			dataType: NORMALIZED_DOCUMENT_DATA_TYPE,
			dataVersion: NORMALIZED_DOCUMENT_DATA_VERSION,
			modifiedAt: 100,
			representation: 'content',
			mediaType: 'application/json'
		},
		// No loader is registered for this test-only strategy: accepted local
		// state must satisfy the Reader, not a fake production Resource loader.
		strategy: { type: 'fixture-only', data: null }
	}
};

const SECOND_FILE_PATH = 'library/commentary/matthew-henry/genesis/Genesis-2.nd.json';
const secondEntry: FilesystemEntry = {
	path: SECOND_FILE_PATH,
	descriptor: {
		...entry.descriptor,
		metadata: {
			...entry.descriptor.metadata,
			resourceId: 'normalized-content/matthew-henry/genesis/2',
			name: 'Matthew Henry — Genesis 2'
		}
	}
};

let target: HTMLDivElement | undefined;
let component: ReturnType<typeof mount> | undefined;

afterEach(async () => {
	if (component) {
		await unmount(component);
	}
	target?.remove();
	component = undefined;
	target = undefined;

	const db = await getApplicationDB();
	for (const resource of [entry, secondEntry]) {
		await db.delete(
			DOMAIN_OBJECTS,
			createStoredDomainObjectId(
				NORMALIZED_DOCUMENT_OBJECT_TYPE,
				createNormalizedDocumentIdForDescriptor(resource.descriptor)
			)
		);
	}
});

describe('File Manager → Normalized Content Reader', () => {
	for (const viewMode of ['list', 'grid'] as const) {
		it(`opens and reopens an accepted Matthew Henry chapter from ${viewMode} mode`, async () => {
			const runtime = new MockFilesystemRuntime();
			const filesystemService = new FilesystemService(
				{
					listRoots: () => runtime.listRoots(),
					get: async (publisher, rootPath, path) =>
						publisher === 'Demo Library' &&
						rootPath === 'library' &&
						(path === FILE_PATH || path === SECOND_FILE_PATH)
							? (path === FILE_PATH ? entry : secondEntry)
							: runtime.get(publisher, rootPath, path),
					listByRootPath: async (publisher, rootPath) => [
						...await runtime.listByRootPath(publisher, rootPath),
						...(publisher === 'Demo Library' && rootPath === 'library'
							? [entry, secondEntry]
							: [])
					]
				},
				runtime
			);

			const fixture = POC_REGRESSION_FIXTURES[2];
			if (!fixture) throw new Error('Matthew Henry fixture missing');
			const normalizedDocument = new NormalizedDocumentValidator().validate(fixture);
			const store = new IndexedDBNormalizedContentStore(getApplicationDB);
			await store.put(
				createNormalizedDocumentIdForDescriptor(secondEntry.descriptor),
				normalizedDocument
			);
			if (viewMode === 'list') {
				await store.put(
					createNormalizedDocumentIdForDescriptor(entry.descriptor),
					normalizedDocument
				);
			}

			// The grid case exercises a cache miss: the loader must receive a
			// structured-cloneable descriptor, just as a real Resource Worker does.
			const loadDescriptor = vi.fn(async (descriptor: ResourceDescriptor) => {
				structuredClone({ type: 'install-descriptor', descriptor });
				await store.put(
					createNormalizedDocumentIdForDescriptor(descriptor),
					normalizedDocument
				);
			});
			const normalizedContentService = new NormalizedContentService(
				store,
				{ loadDescriptor },
				new ResourceDescriptorValidator()
			);
			let authenticatedPublisher: string | undefined;
			// Multiple mounted Readers must each receive account changes.
			const authenticationSubscribers = new Set<() => void>();
			const registry = new NavigationViewRegistry();
			registry.registerAll([
				{ view: FILE_MANAGER_VIEWS.BROWSER, component: FileManagerNavigationEntry },
				{ view: BIBLE_VIEWS.READER, component: BibleReferenceNavigationTarget },
				{ view: NOTES_VIEWS.ROOT, component: NotesNormalizedWordNavigationTarget },
				{ view: BOOKMARKS_VIEWS.ROOT, component: BookmarkBrowseNavigationTarget },
				...normalizedContentNavigationViewRegistrations
			]);
			const builder = new NavigationStateBuilder({
				independent: () => ({}),
				related: (_module, selections) => ({ ...selections })
			});
			const navigation = new PaneNavigationService(
				'file-manager-reader-test-pane',
				new NavigationService(),
				builder,
				new NavigationViewResolver(registry),
				{
					independent: () => ({}),
					update: (_module, selections) => ({ ...selections })
				}
			);
			navigation.pushModule(Modules.FILE_MANAGER, FILE_MANAGER_VIEWS.BROWSER, {
				publisher: 'Demo Library',
				rootPath: 'library',
				path: DIRECTORY_PATH,
				viewMode
			});

			const showToast = vi.fn();
			const createBookmark = vi.fn(async (..._args: unknown[]) => ({ id: 'test-bookmark' }));
			const relocateBookmark = vi.fn(async (..._args: unknown[]) => ({ id: 'test-bookmark' }));
			let acceptedNotes: Record<string, Note> = {};
			let notesSubscribers: Array<{
				subID: string;
				id: string;
				fn: (result: NotesSearchResult) => void;
			}> = [];
			const dispatchNotes = (id: string) => {
				for (const subscriber of [...notesSubscribers]) {
					if (subscriber.id === id) {
						subscriber.fn({ id, notes: acceptedNotes });
					}
				}
			};
			const notesService = {
				subscribe: (subID: string, id: string, fn: (result: NotesSearchResult) => void) => {
					notesSubscribers.push({ subID, id, fn });
				},
				unsubscribe: (subID: string) => {
					notesSubscribers = notesSubscribers.filter((subscriber) => subscriber.subID !== subID);
				},
				getAllNotes: (id: string) => queueMicrotask(() => dispatchNotes(id))
			};
			const settingsService = new SettingsService();
			const applicationContext = {
				settingsService,
				filesystemService,
				petNameService: { resolve: (publisher: string) => publisher },
				resourceModuleResolver: new ResourceModuleResolver(
					normalizedContentResourceModuleRegistrations
				),
				normalizedContentService,
				notesService,
				bookmarksService: {
					create: createBookmark,
					relocate: relocateBookmark,
					// The Reader subscribes once per mount, even when this fixture has no Bookmarks.
					subscribe: () => () => {},
					listForNormalizedDocument: async () => []
				},
				authenticationService: {
					subscribe: (callback: () => void) => {
						authenticationSubscribers.add(callback);
						callback();
						return () => { authenticationSubscribers.delete(callback); };
					},
					tryGetUserId: () => authenticatedPublisher
				},
				normalizedContentTextMarkupService: {
					// This fixture has no locally accepted markup; get() supplies the result.
					getLocal: vi.fn(async () => undefined),
					get: vi.fn(async (publisher: string, resource: ResourceDescriptor) => ({
						id: `markup-${publisher}-${resource.metadata.resourceId}`,
						document: {
							publisher: resource.metadata.publisher,
							resourceId: resource.metadata.resourceId,
							modifiedAt: resource.metadata.modifiedAt
						},
						markings: {}
					})),
					put: vi.fn(async () => {}),
					subscribe: vi.fn(),
					unsubscribe: vi.fn()
				},
				applicationReferenceResolver: new ApplicationReferenceResolver([
					{
						referenceType: BIBLE_LOCATION_REFERENCE_TYPE,
						module: Modules.BIBLE,
						view: BIBLE_VIEWS.READER,
						createState: (value) => {
							const bibleLocationRef = parseBibleLocationRef(value);
							return bibleLocationRef === undefined
								? undefined
								: { bibleLocationRef };
						}
					}
				]),
				toastService: { showToast }
			} as unknown as ApplicationContext;

			target = document.createElement('div');
			target.style.width = '280px';
			window.document.body.append(target);
			component = mount(FileManagerNormalizedReaderHost, {
				target,
				props: { applicationContext, navigation, paneWidth: 280 }
			});

			await vi.waitFor(() => {
				expect(target?.textContent).toContain(NAME);
			});
			const breadcrumb = target.querySelector<HTMLElement>(
				'nav[aria-label="Current folder"]'
			);
			expect(breadcrumb).not.toBeNull();
			expect(breadcrumb?.textContent).toContain('Demo Library');
			expect(breadcrumb?.querySelector('[aria-current="page"]')?.textContent)
				.toContain('genesis');
			expect(getComputedStyle(breadcrumb!).display).toBe('flex');
			expect(getComputedStyle(breadcrumb!).flexWrap).toBe('wrap');
			expect(getComputedStyle(breadcrumb!).overflowX).not.toBe('auto');
			expect(breadcrumb!.scrollWidth).toBeLessThanOrEqual(breadcrumb!.clientWidth + 1);
			expect(
				breadcrumb!.querySelector('[aria-current="page"]')!.getBoundingClientRect().top
			).toBeGreaterThan(breadcrumb!.firstElementChild!.getBoundingClientRect().top);

			// The ViewBody owns scrolling. Keep the wrapped breadcrumb at its natural
			// height and pinned to the top while only that existing body scrolls.
			const scrollBody = breadcrumb!.parentElement!;
			expect(getComputedStyle(scrollBody).overflowY).toBe('scroll');
			expect(getComputedStyle(breadcrumb!).position).toBe('sticky');
			expect(getComputedStyle(breadcrumb!).flexShrink).toBe('0');
			expect(getComputedStyle(breadcrumb!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
			expect(breadcrumb!.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(
				breadcrumb!.lastElementChild!.getBoundingClientRect().bottom
			);
			expect(breadcrumb!.nextElementSibling!.getBoundingClientRect().top).toBeGreaterThanOrEqual(
				breadcrumb!.getBoundingClientRect().bottom - 1
			);

			const spacer = document.createElement('div');
			spacer.style.height = '1600px';
			spacer.style.flexShrink = '0';
			scrollBody.append(spacer);
			scrollBody.scrollTop = 180;
			await tick();
			expect(scrollBody.scrollTop).toBeGreaterThan(0);
			expect(Math.abs(
				breadcrumb!.getBoundingClientRect().top - scrollBody.getBoundingClientRect().top
			)).toBeLessThanOrEqual(1);
			scrollBody.scrollTop = 0;
			spacer.remove();

			const fileButton = () => {
				const buttons = [...(target?.querySelectorAll('button') ?? [])];
				const match = buttons.find(button => button.textContent?.includes(NAME));
				if (!match) throw new Error('Matthew Henry File Manager entry not found');
				return match;
			};
			const originalFolder = fileButton().closest('[role="button"]');

			for (let attempt = 0; attempt < 2; attempt++) {
				fileButton().click();
				await vi.waitFor(() => {
					expect(get(navigation.views).at(-1)?.navigationState).toMatchObject({
						module: Modules.NORMALIZED_CONTENT,
						view: NORMALIZED_CONTENT_VIEWS.READER,
						state: { descriptor: entry.descriptor }
					});
					expect([...target!.querySelectorAll('.whitespace-nowrap')]
						.some((element) => element.textContent?.trim() === 'Genesis-1'))
						.toBe(true);
					expect(get(navigation.views).at(-1)?.navigationState.state)
						.toMatchObject({
							sequenceIndex: 0,
							sequence: [
								{ fileName: 'Genesis-1.nd.json' },
								{ fileName: 'Genesis-2.nd.json' }
							]
						});
					expect(target?.querySelector('#poc-heading-3')?.textContent)
						.toContain('Genesis');
					expect(target?.querySelector('#poc-paragraph-3')?.textContent)
						.toContain('Maker');
				});
				expect(loadDescriptor).toHaveBeenCalledTimes(
					viewMode === 'grid' ? 1 : 0
				);
				expect(showToast).not.toHaveBeenCalled();

				if (attempt === 0) {
					// Progress is separate from the native scrollbar and the Pane's ViewBody.
					const scrollBody = target!.querySelector('#poc-heading-3')!
						.closest<HTMLElement>('[id$="-scroll-container"]')!;
					const progress = () => target!.querySelector<HTMLInputElement>(
						'input[type="range"][aria-label="Document progress"]'
					);
					const initialProgress = settingsService.getSettings().showNormalizedDocumentProgress;
					const initialBibleScrollbar = settingsService.getSettings().showBibleScrollbar;
					expect(progress() !== null).toBe(initialProgress);
					settingsService.updateSetting('showNormalizedDocumentProgress', true);
					await vi.waitFor(() => expect(progress()).not.toBeNull());
					expect(progress()!.min).toBe('0');
					expect(progress()!.max).toBe('1000');
					expect(progress()!.getAttribute('aria-valuetext')).toMatch(/^\d+%$/);
					expect(scrollBody.classList.contains('kjv-scrollbar-visible')).toBe(false);
					// The scrubber overlays the pane; toggling it must not resize document content.
					expect(scrollBody.classList.contains('px-4')).toBe(true);
					expect(scrollBody.classList.contains('pr-14')).toBe(false);
					expect(getComputedStyle(scrollBody).paddingRight).toBe('16px');
					expect(settingsService.getSettings().showBibleScrollbar).toBe(initialBibleScrollbar);
					settingsService.updateSetting('showNormalizedDocumentProgress', false);
					await vi.waitFor(() => expect(progress()).toBeNull());
					expect(scrollBody.classList.contains('px-4')).toBe(true);
					expect(getComputedStyle(scrollBody).paddingRight).toBe('16px');
					settingsService.updateSetting('showNormalizedDocumentProgress', initialProgress);
				}

				if (attempt === 0) {
					// Follow the real Matthew Henry fixture's Bible reference through
					// the renderer, Reader, typed resolver, and Pane navigation stack.
					const documentRoot = target!.querySelector('#poc-paragraph-3');
					const bibleLink = documentRoot?.querySelector<HTMLAnchorElement>(
						'a[href="bibleLocationReference:22_35_10"]'
					);
					expect(bibleLink).not.toBeNull();
					const documentNode = target!.querySelector('#poc-heading-3');
					bibleLink!.click();
					await vi.waitFor(() => {
						expect(get(navigation.views).at(-1)?.navigationState).toMatchObject({
							module: Modules.BIBLE,
							view: BIBLE_VIEWS.READER,
							state: { bibleLocationRef: '22_35_10' }
						});
						expect(target?.querySelector('[data-testid="bible-reference-destination"]')?.textContent)
							.toContain('22_35_10');
					});
					const bibleBack = target!.querySelector<HTMLButtonElement>(
						'[data-testid="bible-reference-destination"] button'
					);
					bibleBack!.click();
					await vi.waitFor(() => {
						expect(get(navigation.views).at(-1)?.navigationState.view)
							.toBe(NORMALIZED_CONTENT_VIEWS.READER);
						expect(target!.querySelector('#poc-heading-3')).toBe(documentNode);
						expect(get(navigation.views).at(-1)?.navigationState.state.sequenceIndex)
							.toBe(0);
					});
				}

				if (attempt === 0) {
					const more = [...target!.querySelectorAll<HTMLButtonElement>(
						'button[aria-label="More actions. Press and hold to open modules."]'
					)].at(-1);
					expect(more).not.toBeNull();
					more!.click();
					await vi.waitFor(() => {
						expect(get(navigation.views).at(-1)?.navigationState.view)
							.toBe(NORMALIZED_CONTENT_VIEWS.OVERFLOW_ACTIONS);
						const menu = target!.querySelectorAll('header');
						expect(menu.length).toBeGreaterThan(1);
					});
					// Shared HeaderActionButton labels are rendered as sr-only text,
					// not as aria-label attributes on the underlying buttons.
					const menuHeader = [...target!.querySelectorAll('header')].at(-1);
					const findMenuAction = (label: string) =>
						[...(menuHeader?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
							.find((button) => button.textContent?.trim() === label);
					expect(findMenuAction('Split pane horizontally')).toBeDefined();
					expect(findMenuAction('Split pane vertically')).toBeDefined();
					// Document actions use distinct icons before their labels.
					const findDocumentAction = (label: string) =>
						[...target!.querySelectorAll<HTMLButtonElement>('button')]
							.find((button) => button.textContent?.trim() === label);
					const notesIcon = findDocumentAction('Open document notes')?.querySelector('svg');
					const bookmarksIcon = findDocumentAction('Browse document bookmarks')?.querySelector('svg');
					expect(notesIcon).toBeTruthy();
					expect(bookmarksIcon).toBeTruthy();
					expect(notesIcon?.querySelector('path')?.getAttribute('d'))
						.not.toBe(bookmarksIcon?.querySelector('path')?.getAttribute('d'));
					// Theme changes in place; split controls and the menu stay available.
					const initiallyDark = settingsService.getSettings().isDarkTheme;
					const initialLabel = initiallyDark ? 'Light mode' : 'Night mode';
					const toggledLabel = initiallyDark ? 'Night mode' : 'Light mode';
					expect(findMenuAction(initialLabel)).toBeDefined();
					findMenuAction(initialLabel)!.click();
					await vi.waitFor(() => {
						expect(settingsService.getSettings().isDarkTheme).toBe(!initiallyDark);
						expect(findMenuAction(toggledLabel)).toBeDefined();
						expect(get(navigation.views).at(-1)?.navigationState.view)
							.toBe(NORMALIZED_CONTENT_VIEWS.OVERFLOW_ACTIONS);
					});
					expect(findMenuAction('Split pane horizontally')).toBeDefined();
					expect(findMenuAction('Split pane vertically')).toBeDefined();
					findMenuAction(toggledLabel)!.click();
					await vi.waitFor(() => {
						expect(settingsService.getSettings().isDarkTheme).toBe(initiallyDark);
						expect(findMenuAction(initialLabel)).toBeDefined();
					});
					const menuBack = [...target!.querySelectorAll<HTMLButtonElement>(
						'button[aria-label="Back. Press and hold to exit pane."]'
					)].at(-1);
					menuBack?.click();
					await vi.waitFor(() => {
						expect(get(navigation.views).at(-1)?.navigationState.view)
							.toBe(NORMALIZED_CONTENT_VIEWS.READER);
						expect(get(navigation.views).at(-1)?.navigationState.state.sequenceIndex)
							.toBe(0);
					});

					// Document-scoped Browse returns the chosen canonical word to this same Reader.
					// A rendered separator shares contentIndex 6 with its word.
					// Spy on the semantic word, not the preceding whitespace span.
					const selectedWord = target!.querySelector<HTMLAnchorElement>(
						'#poc-paragraph-3 [data-normalized-content-kind="word"][data-normalized-content-index="6"]'
					)!;
					expect(selectedWord.textContent).toBe('Job');
					expect(target!.querySelector(
						'#poc-paragraph-3 [data-normalized-content-kind="separator"][data-normalized-content-index="6"]'
					)).not.toBeNull();
					const scrollToWord = vi.fn();
					selectedWord.scrollIntoView = scrollToWord;
					const browseMore = [...target!.querySelectorAll<HTMLButtonElement>(
						'button[aria-label="More actions. Press and hold to open modules."]'
					)].at(-1)!;
					browseMore.click();
					await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view)
						.toBe(NORMALIZED_CONTENT_VIEWS.OVERFLOW_ACTIONS));
					const browseAction = [...target!.querySelectorAll<HTMLButtonElement>('button')]
						.find((button) => button.textContent?.trim() === 'Browse document bookmarks');
					expect(browseAction).toBeDefined();
					browseAction!.click();
					await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState)
						.toMatchObject({ module: Modules.BOOKMARKS, view: BOOKMARKS_VIEWS.ROOT,
							state: { normalizedDocument: {
								publisher: entry.descriptor.metadata.publisher,
								resourceId: entry.descriptor.metadata.resourceId
							} } }));
					target!.querySelector<HTMLButtonElement>(
						'[data-testid="normalized-bookmark-browse-destination"] button'
					)!.click();
					await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view)
						.toBe(NORMALIZED_CONTENT_VIEWS.READER));
					await vi.waitFor(() => expect(scrollToWord)
						.toHaveBeenCalledWith({ block: 'center' }));
					expect(target!.querySelector(
						'#poc-paragraph-3 [data-normalized-content-kind="word"][data-normalized-content-index="6"]'
					)).toBe(selectedWord);
				}

				if (attempt === 0) {
					// A Bookmark launched from the main module opens a fresh Reader and
					// positions its canonical word after the document has rendered.
					const originalScroll = Object.getOwnPropertyDescriptor(
						HTMLElement.prototype, 'scrollIntoView'
					);
					const launchScroll = vi.fn(function (this: HTMLElement, _options: ScrollIntoViewOptions) {
						return this;
					});
					Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
						configurable: true, writable: true, value: launchScroll
					});
					try {
						navigation.pushModule(Modules.NORMALIZED_CONTENT, NORMALIZED_CONTENT_VIEWS.READER, {
							descriptor: entry.descriptor,
							bookmarkTarget: {
								kind: 'normalized-document',
								document: {
									publisher: entry.descriptor.metadata.publisher,
									resourceId: entry.descriptor.metadata.resourceId
								},
								address: { kind: 'word', blockId: 'poc-paragraph-3', contentIndex: 6 }
							}
						});
						await vi.waitFor(() => {
							expect(launchScroll).toHaveBeenCalledWith({ block: 'center' });
							expect(launchScroll.mock.instances.some((word) =>
								word instanceof HTMLElement &&
								word.dataset.normalizedContentKind === 'word' &&
								word.dataset.normalizedContentIndex === '6' &&
								word.closest('[data-normalized-block]')?.id === 'poc-paragraph-3'
							)).toBe(true);
						});
						navigation.back();
						await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view)
							.toBe(NORMALIZED_CONTENT_VIEWS.READER));
						// The temporary Reader unmounts; the original Reader must still
						// receive authentication changes used by its Notes edit flow.
						await vi.waitFor(() => expect(authenticationSubscribers.size).toBe(1));
					} finally {
						if (originalScroll) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll);
						else delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
					}
				}

				if (attempt === 0) {
					// As in the Bible Reader, Notes actions live in Edit options.
					authenticatedPublisher = 'notes-test-publisher';
					for (const notify of authenticationSubscribers) notify();
					const originalDocumentNode = target!.querySelector('#poc-heading-3');
					const findEditButton = () => [...target!.querySelectorAll<HTMLButtonElement>('button')]
						.find((button) => button.textContent?.trim() === 'Edit');
					const openEdit = async () => {
						// Navigation preserves the active action state. Returning from
						// Notes/Bookmarks may already have the Text Markup toolbar open.
						await tick();
						if (!target!.querySelector('button[aria-label="add note"]')) {
							await vi.waitFor(() => expect(findEditButton()?.disabled).toBe(false));
							findEditButton()!.click();
						}
						await vi.waitFor(() => expect(target!.querySelector('button[aria-label="add note"]'))
							.not.toBeNull());
					};
					await openEdit();
					expect(target!.querySelector('[aria-label="note actions"]')).not.toBeNull();
					// Document Notes is an overflow action. Opening it must leave the
					// mounted Reader's Text Markup action and palette intact.
					expect(target!.querySelector('button[aria-label="document notes"]')).toBeNull();
					const notesMore = [...target!.querySelectorAll<HTMLButtonElement>(
						'button[aria-label="More actions. Press and hold to open modules."]'
					)].at(-1);
					expect(notesMore).toBeDefined();
					notesMore!.click();
					await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view)
						.toBe(NORMALIZED_CONTENT_VIEWS.OVERFLOW_ACTIONS));
					const documentNotesAction = [...target!.querySelectorAll<HTMLButtonElement>('button')]
						.find((button) => button.textContent?.trim() === 'Open document notes');
					expect(documentNotesAction).toBeDefined();
					documentNotesAction!.click();
					await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState)
						.toMatchObject({ module: Modules.NOTES, view: NOTES_VIEWS.ROOT, state: {
							normalizedDocument: { scope: { kind: 'document', document: {
								publisher: entry.descriptor.metadata.publisher,
								resourceId: entry.descriptor.metadata.resourceId
							} } }
						} }));
					target!.querySelector<HTMLButtonElement>(
						'[data-testid="normalized-word-notes-destination"] button'
					)!.click();
					await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view)
						.toBe(NORMALIZED_CONTENT_VIEWS.READER));
					// Opening document Notes does not close or recreate the action session.
					await vi.waitFor(() => expect(target!.querySelector('button[aria-label="text color"]'))
						.not.toBeNull());

					const openWordSelection = async () => {
						await openEdit();
						target!.querySelector<HTMLButtonElement>('button[aria-label="add note"]')!.click();
						await vi.waitFor(() => expect(target!.textContent)
							.toContain('Select a word for the note'));
						expect(target!.querySelector('button[aria-label="text color"]')).toBeNull();
					};

					await openWordSelection();
					expect(target!.querySelector('[aria-label="Next document"]')).toBeNull();
					target!.querySelector<HTMLButtonElement>(
						'button[aria-label="cancel note location selection"]'
					)!.click();
					await vi.waitFor(() => expect(target?.textContent)
						.not.toContain('Select a word for the note'));
					// Cancel returns to the markup toolbar, not reading mode.
					expect(target!.querySelector('button[aria-label="text color"]')).not.toBeNull();
					target!.querySelector<HTMLButtonElement>('button[aria-label="add note"]')!.click();
					await vi.waitFor(() => expect(target!.textContent)
						.toContain('Select a word for the note'));
					const bibleLink = target!.querySelector<HTMLAnchorElement>(
						'a[href="bibleLocationReference:22_35_10"]'
					);
					const blockId = bibleLink!.closest('[data-normalized-block]')!.id;
					const contentIndex = Number(bibleLink!.dataset.normalizedContentIndex);
					const modified = new MouseEvent('click', {
						bubbles: true, cancelable: true, ctrlKey: true
					});
					bibleLink!.dispatchEvent(modified);
					expect(modified.defaultPrevented).toBe(true);
					expect(get(navigation.views).at(-1)?.navigationState.view)
						.toBe(NORMALIZED_CONTENT_VIEWS.READER);
					const clicked = new MouseEvent('click', { bubbles: true, cancelable: true });
					bibleLink!.dispatchEvent(clicked);
					await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState)
						.toMatchObject({ module: Modules.NOTES, view: NOTES_VIEWS.ROOT, state: {
								normalizedDocument: {
									scope: { kind: 'document', document: {
										publisher: entry.descriptor.metadata.publisher,
										resourceId: entry.descriptor.metadata.resourceId
									} },
									createTarget: { kind: 'normalized-document',
										target: { kind: 'word', address: { blockId, contentIndex } } }
								}
						} }));
					expect(clicked.defaultPrevented).toBe(true);
					expect(target!.querySelector('[data-testid="bible-reference-destination"]'))
						.toBeNull();
					target!.querySelector<HTMLButtonElement>(
						'[data-testid="normalized-word-notes-destination"] button'
					)!.click();
					await vi.waitFor(() => {
						expect(get(navigation.views).at(-1)?.navigationState.view)
							.toBe(NORMALIZED_CONTENT_VIEWS.READER);
						expect(target!.querySelector('#poc-heading-3')).toBe(originalDocumentNode);
						expect(target?.textContent).not.toContain('Select a word for the note');
						// Returning from a word Note must restore the originating Text Markup state.
						expect(target!.querySelector('button[aria-label="text color"]')).not.toBeNull();
					});
					// Simulate the accepted Note arriving from the Notes Module / another pane.
					acceptedNotes = {
						'word-note': {
							id: 'word-note',
							bibleLocationRef: undefined,
							bibleReferenceText: undefined,
							association: {
								kind: 'normalized-document',
								document: {
									publisher: entry.descriptor.metadata.publisher,
									resourceId: entry.descriptor.metadata.resourceId
								},
								target: { kind: 'word', address: { blockId, contentIndex } }
							},
							text: 'Test', html: '<p>Test</p>', title: 'Word Note',
							dateCreated: 1, dateUpdated: 1, tags: []
						}
					};
					dispatchNotes(NOTES_COLLECTION_CHANGED);
					const marker = () => target!.querySelector<HTMLButtonElement>(
						`button[data-normalized-word-note][data-normalized-note-block="${blockId}"][data-normalized-note-index="${contentIndex}"]`
					);
					await vi.waitFor(() => expect(marker()).not.toBeNull());
					expect(marker()!.closest('a')).toBeNull();
					// Marker indicators remain visible during Text Markup, but word
					// markers are only interactive in ReadingState.
					expect(marker()!.disabled).toBe(true);
					marker()!.click();
					expect(get(navigation.views).at(-1)?.navigationState.view)
						.toBe(NORMALIZED_CONTENT_VIEWS.READER);
					expect(target!.querySelector('button[aria-label="text color"]')).not.toBeNull();
					const saveMarkup = [...target!.querySelectorAll<HTMLButtonElement>('button')]
						.find((button) => button.textContent?.trim() === 'Save Text Markup');
					expect(saveMarkup).toBeDefined();
					saveMarkup!.click();
					await vi.waitFor(() => expect(marker()?.disabled).toBe(false));
					marker()!.click();
					await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState)
						.toMatchObject({ module: Modules.NOTES, view: NOTES_VIEWS.ROOT, state: {
							normalizedDocument: { scope: { kind: 'word', address: { blockId, contentIndex } } }
						} }));
					expect(target!.querySelector('[data-testid="bible-reference-destination"]')).toBeNull();
					target!.querySelector<HTMLButtonElement>(
						'[data-testid="normalized-word-notes-destination"] button'
					)!.click();
					await vi.waitFor(() => expect(marker()).not.toBeNull());
					// Add Bookmark follows the Bible edit-toolbar pattern: choose a
					// canonical word, save markup, persist, and remain in this Reader.
					await openEdit();
					const addBookmark = () => target!.querySelector<HTMLButtonElement>(
						'button[aria-label="add bookmark"]'
					);
					expect(addBookmark()).not.toBeNull();
					addBookmark()!.click();
					await vi.waitFor(() => expect(target!.textContent)
						.toContain('Select a word for the bookmark'));
					expect(target!.querySelector('[aria-label="text color"]')).toBeNull();
					target!.querySelector<HTMLButtonElement>(
						'button[aria-label="cancel bookmark location selection"]'
					)!.click();
					await vi.waitFor(() => expect(addBookmark()).not.toBeNull());
					expect(createBookmark).not.toHaveBeenCalled();
					addBookmark()!.click();
					await vi.waitFor(() => expect(target!.textContent)
						.toContain('Select a word for the bookmark'));
					const bookmarkedLink = target!.querySelector<HTMLAnchorElement>(
						'a[href="bibleLocationReference:22_35_10"]'
					)!;
					const bookmarkedBlockId = bookmarkedLink.closest('[data-normalized-block]')!.id;
					const bookmarkedIndex = Number(bookmarkedLink.dataset.normalizedContentIndex);
					const bookmarkClick = new MouseEvent('click', { bubbles: true, cancelable: true });
					bookmarkedLink.dispatchEvent(bookmarkClick);
					await vi.waitFor(() => expect(createBookmark).toHaveBeenCalledOnce());
					expect(createBookmark).toHaveBeenCalledWith({
						kind: 'normalized-document',
						document: {
							publisher: entry.descriptor.metadata.publisher,
							resourceId: entry.descriptor.metadata.resourceId
						},
						address: { kind: 'word', blockId: bookmarkedBlockId, contentIndex: bookmarkedIndex }
					}, expect.any(String));
					expect(createBookmark.mock.calls[0]?.[1]).not.toBe('');
					expect(bookmarkClick.defaultPrevented).toBe(true);
					await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view)
						.toBe(NORMALIZED_CONTENT_VIEWS.READER));
					// A successful temporary Bookmark action returns to Text Markup;
					// merely finding the Add Bookmark button absent could pass while
					// selection is still running and would miss a failed return.
					await vi.waitFor(() => {
						expect(target!.querySelector('button[aria-label="text color"]')).not.toBeNull();
						expect(addBookmark()).not.toBeNull();
					});
					// The Bookmark did not follow the linked word into Bible.
					expect(target!.querySelector('[data-testid="bible-reference-destination"]')).toBeNull();

                    // Relocate: select the new word before selecting the existing ID.
                    await openEdit();
                    target!.querySelector<HTMLButtonElement>('button[aria-label="update bookmark"]')!.click();
                    await vi.waitFor(() => expect(target!.textContent)
                        .toContain('Select the new word for the bookmark'));
                    target!.querySelector<HTMLButtonElement>(
                        'button[aria-label="cancel bookmark location selection"]'
                    )!.click();
                    await vi.waitFor(() => expect(target!.querySelector('button[aria-label="update bookmark"]'))
                        .not.toBeNull());
                    expect(relocateBookmark).not.toHaveBeenCalled();
                    target!.querySelector<HTMLButtonElement>('button[aria-label="update bookmark"]')!.click();
                    const destinationWord = target!.querySelector<HTMLAnchorElement>(
                        'a[href="bibleLocationReference:22_35_10"]'
                    )!;
                    destinationWord.click();
                    await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState)
                        .toMatchObject({ module: Modules.BOOKMARKS, view: BOOKMARKS_VIEWS.ROOT,
                            state: { mode: 'relocate', normalizedDestination: {
                                kind: 'normalized-document',
                                document: { publisher: entry.descriptor.metadata.publisher,
                                    resourceId: entry.descriptor.metadata.resourceId },
                                address: { kind: 'word', blockId: bookmarkedBlockId,
                                    contentIndex: bookmarkedIndex }
                            } } }));
                    expect(createBookmark).toHaveBeenCalledOnce();
                    target!.querySelector<HTMLButtonElement>(
                        '[data-testid="normalized-bookmark-relocation-destination"] button'
                    )!.click();
                    await vi.waitFor(() => expect(relocateBookmark).toHaveBeenCalledOnce());
                    expect(relocateBookmark).toHaveBeenCalledWith(
                        'notes-test-publisher/default/123e4567-e89b-42d3-a456-426614174000',
                        { kind: 'normalized-document', document: {
                            publisher: entry.descriptor.metadata.publisher,
                            resourceId: entry.descriptor.metadata.resourceId
                        }, address: { kind: 'word', blockId: bookmarkedBlockId,
                            contentIndex: bookmarkedIndex } },
                        expect.any(String)
                    );
                    await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view)
                        .toBe(NORMALIZED_CONTENT_VIEWS.READER));
                    expect(target!.querySelector('[data-testid="bible-reference-destination"]')).toBeNull();

					authenticatedPublisher = undefined;
					for (const notify of authenticationSubscribers) notify();
				}

				const navigationButton = (label: string) =>
					target!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
				const previous = () => navigationButton('Previous document');
				const next = () => navigationButton('Next document');
				// Returning from Notes/Bookmarks preserves the active action state.
				// Signing out resets it to ReadingState; wait for Svelte to render
				// the floating navigation controls before testing their behavior.
				await vi.waitFor(() => {
					expect(previous()).not.toBeNull();
					expect(next()).not.toBeNull();
				});
				// Navigation is floating, not counted among the header's action slots.
				expect(target!.querySelector('header button[aria-label="Next document"]'))
					.toBeNull();
				const contentRoot = target!.querySelector('#poc-heading-3')!
					.closest<HTMLElement>('.pb-20');
				expect(contentRoot).not.toBeNull();
				expect(parseFloat(getComputedStyle(contentRoot!).paddingBottom)).toBeGreaterThan(48);
				if (attempt === 0) {
					const readerScrollBody = contentRoot!.closest<HTMLElement>('[id$="-scroll-container"]')!;
					expect(getComputedStyle(readerScrollBody).overflowY).toBe('scroll');
					// Make the document long, not the scroll container short.
					contentRoot!.style.minHeight = '2400px';
					const middle = Math.floor(
						(readerScrollBody.scrollHeight - readerScrollBody.clientHeight) / 2
					);
					readerScrollBody.scrollTop = middle;
					readerScrollBody.dispatchEvent(new Event('scroll'));
					await vi.waitFor(() => expect(previous()).toBeNull());
					// Upward movement reveals controls without reaching the top or bottom.
					readerScrollBody.scrollTop = middle - 40;
					readerScrollBody.dispatchEvent(new Event('scroll'));
					await vi.waitFor(() => expect(previous()).not.toBeNull());
					// Tiny reverse movements do not immediately hide the controls.
					readerScrollBody.scrollTop = middle - 38;
					readerScrollBody.dispatchEvent(new Event('scroll'));
					expect(previous()).not.toBeNull();
					// Downward movement hides them again in the middle.
					readerScrollBody.scrollTop = middle + 40;
					readerScrollBody.dispatchEvent(new Event('scroll'));
					await vi.waitFor(() => expect(previous()).toBeNull());
					readerScrollBody.scrollTop = readerScrollBody.scrollHeight - readerScrollBody.clientHeight;
					readerScrollBody.dispatchEvent(new Event('scroll'));
					await vi.waitFor(() => expect(previous()).not.toBeNull());
					readerScrollBody.scrollTop = 0;
					readerScrollBody.dispatchEvent(new Event('scroll'));
					contentRoot!.style.minHeight = '';
				}
				expect(previous()?.disabled).toBe(true);
				expect(next()?.disabled).toBe(false);
				next()?.click();
				await vi.waitFor(() => {
					expect(get(navigation.views).at(-1)?.navigationState.state.sequenceIndex)
						.toBe(1);
					expect([...target!.querySelectorAll('.whitespace-nowrap')]
						.some((element) => element.textContent?.trim() === 'Genesis-2'))
						.toBe(true);
					expect(target?.querySelector('#poc-heading-3')?.textContent)
						.toContain('Genesis');
				});
				expect(target!.querySelector('[data-normalized-word-note]')).toBeNull();
				expect(next()?.disabled).toBe(true);
				expect(previous()?.disabled).toBe(false);
				previous()?.click();
				await vi.waitFor(() => {
					expect(get(navigation.views).at(-1)?.navigationState.state.sequenceIndex)
						.toBe(0);
					expect([...target!.querySelectorAll('.whitespace-nowrap')]
						.some((element) => element.textContent?.trim() === 'Genesis-1'))
						.toBe(true);
				});

				if (attempt === 0) {
					await vi.waitFor(() => expect(target!.querySelector('[data-normalized-word-note]'))
						.not.toBeNull());
					acceptedNotes = {};
					dispatchNotes(NOTES_COLLECTION_CHANGED);
					await vi.waitFor(() => expect(target!.querySelector('[data-normalized-word-note]'))
						.toBeNull());
				}

				const back = [...(target?.querySelectorAll<HTMLButtonElement>(
					'button[aria-label="Back. Press and hold to exit pane."]'
				) ?? [])].at(-1);
				expect(back).toBeDefined();
				back?.click();
				await tick();
				expect(get(navigation.views).at(-1)?.navigationState.view)
					.toBe(FILE_MANAGER_VIEWS.BROWSER);
				expect(fileButton().closest('[role="button"]')).toBe(originalFolder);
			}
		});
	}
});
