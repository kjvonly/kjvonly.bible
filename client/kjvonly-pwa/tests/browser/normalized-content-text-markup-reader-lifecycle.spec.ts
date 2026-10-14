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
	Modules,
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
				name: 'Lifecycle Test'
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
			'preserves the edit draft across subscription updates and cancels to the latest accepted markup',
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
				).toBe(false);

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
			'opens edit mode only once when retries are clicked twice before loading finishes',
			async () => {
				const retry = deferred<NormalizedContentTextMarkup>();
				let reads = 0;
				const authentication = createAuthentication('user-a');
				const textMarkup = createTextMarkupService(async () => {
					reads++;
					if (reads === 1) {
						throw new Error('initial markup load failed');
					}
					return retry.promise;
				});

				mountReader(authentication, textMarkup);
				await waitFor(
					() => textMarkup.get.mock.calls.length === 1 &&
						!requireButton('Edit').disabled,
					'Edit action to become available for retry'
				);

				const edit = requireButton('Edit');
				edit.click();
				edit.click();
				await tick();
				expect(textMarkup.get).toHaveBeenCalledTimes(2);
				expect(requireButton('Edit').disabled).toBe(true);

				retry.resolve(createTextMarkup('user-a', 'markup-a'));
				await waitFor(
					() => findButton('Cancel edits') !== undefined,
					'edit mode after the retry resolves'
				);
				expect(findButton('Edit')).toBeUndefined();
			}
		);

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
			'ignores an old account save without unlocking a newer account save',
			async () => {
				const oldSave = deferred<void>();
				const newSave = deferred<void>();
				const authentication =
					createAuthentication('user-a');
				const textMarkup =
					createTextMarkupService(
						async (publisher) => createTextMarkup(
							publisher,
							`markup-${publisher}`
						)
					);
				textMarkup.put
					.mockImplementationOnce(async () => oldSave.promise)
					.mockImplementationOnce(async () => newSave.promise);

				mountReader(authentication, textMarkup);
				await waitFor(
					() => !requireButton('Edit').disabled,
					'user A markup load'
				);
				requireButton('Edit').click();
				await tick();
				requireWord().click();
				requireButton('Save Text Markup').click();
				await waitFor(
					() => textMarkup.put.mock.calls.length === 1,
					'user A save'
				);

				authentication.setUser('user-b');
				await waitFor(
					() => !requireButton('Edit').disabled,
					'user B markup load'
				);
				requireButton('Edit').click();
				await tick();
				requireWord(1).click();
				await tick();
				requireButton('Save Text Markup').click();
				await waitFor(
					() => textMarkup.put.mock.calls.length === 2,
					'user B save'
				);

				oldSave.resolve();
				await flush();
				expect(requireButton('Save Text Markup').disabled).toBe(true);
				expect(requireWord().classList.contains('bg-highlighta')).toBe(false);
				expect(requireWord(1).classList.contains('bg-highlighta')).toBe(true);

				newSave.resolve();
				await waitFor(
					() => findButton('Edit') !== undefined,
					'user B save completion'
				);
				expect(requireWord(1).classList.contains('bg-highlighta')).toBe(true);

				authentication.setUser('user-a');
				await waitFor(
					() => !requireButton('Edit').disabled,
					'user A reload'
				);
				expect(requireWord().classList.contains('bg-highlighta')).toBe(false);
			}
		);

		it(
			'does not repaint an A → B → A session from an earlier A save',
			async () => {
				const pendingSave = deferred<void>();
				const authentication =
					createAuthentication('user-a');
				const textMarkup =
					createTextMarkupService(
						async (publisher) => createTextMarkup(
							publisher,
							`markup-${publisher}`
						)
					);
				textMarkup.put.mockImplementation(
					async () => pendingSave.promise
				);

				mountReader(authentication, textMarkup);
				await waitFor(
					() => !requireButton('Edit').disabled,
					'initial user A load'
				);
				requireButton('Edit').click();
				await tick();
				requireWord().click();
				requireButton('Save Text Markup').click();
				await waitFor(
					() => textMarkup.put.mock.calls.length === 1,
					'original user A save'
				);

				authentication.setUser('user-b');
				await waitFor(
					() => !requireButton('Edit').disabled,
					'user B load'
				);
				authentication.setUser('user-a');
				await waitFor(
					() => !requireButton('Edit').disabled,
					'new user A load'
				);
				expect(requireWord().classList.contains('bg-highlighta')).toBe(false);

				pendingSave.resolve();
				await flush();
				expect(findButton('Edit')).toBeDefined();
				expect(requireWord().classList.contains('bg-highlighta')).toBe(false);
			}
		);

		it(
			'preserves the draft on failed save and cancels to a concurrent accepted update',
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
				expect(requireWord().classList.contains('bg-highlighta')).toBe(true);
				expect(requireWord().classList.contains('bg-highlightb')).toBe(false);

				pendingSave.reject(new Error('write failed'));
				await waitFor(
					() => !requireButton('Save Text Markup').disabled,
					'failed save to unlock editing'
				);
				expect(toast).toHaveBeenCalledWith('Unable to save Text Markup');
				expect(requireWord().classList.contains('bg-highlighta')).toBe(true);

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
			'ignores callbacks retained across authentication identity switches',
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

				// The old A subscription must remain stale after returning to A.
				authentication.setUser('user-a');
				await waitFor(
					() => requireWord().classList.contains('bg-highlighta'),
					'reloaded user A markup to render'
				);
				previousOnChange?.(
					createTextMarkup('user-a', 'markup-user-a', 'bg-highlightc')
				);
				await tick();

				expect(requireWord().classList.contains('bg-highlighta')).toBe(true);
				expect(requireWord().classList.contains('bg-highlightc')).toBe(false);
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
	toast: ReturnType<typeof vi.fn> = vi.fn()
): void {
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
				vi.fn(async () => document)
		},
		normalizedContentTextMarkupService:
			textMarkup.service,
		toastService: {
			showToast: toast
		}
	} as unknown as ApplicationContext;

	const navigation = {
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
				navigationState
			}
		}
	);
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
	const put = vi.fn(
		async (_textMarkup: NormalizedContentTextMarkup) => {}
	);
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
		put,
		subscribe,
		unsubscribe,

		service: {
			get,
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
