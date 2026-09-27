import {
	mount,
	tick,
	unmount
} from 'svelte';
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	Modules
} from '$lib/application/models/modules.model';
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
	PaneNavigationService
} from '$lib/application/services/pane-navigation.service';
import {
	NavigationService,
	type NavigationComponent
} from '$lib/application/services/navigation.service';

import {
	applyPlanReadingNavigationResult
} from '$lib/domains/reading-plans/modules/plans/runtime/plan-reading-navigation-result';

import PaneNavigationTestHost from './fixtures/pane-navigation-test-host.svelte';
import PaneNavigationTestView from './fixtures/pane-navigation-test-view.svelte';

///////////////////////////////////////////////////////////////////////////////

const PLANS_DETAILS_VIEW =
	'plans.subscription-details';

const SEARCH_RESULTS_VIEW =
	'search.results';

const BIBLE_READER_VIEW =
	'bible.reader';

///////////////////////////////////////////////////////////////////////////////

function requireElement<T extends Element>(
	root: ParentNode,
	selector: string
): T {
	const element =
		root.querySelector<T>(
			selector
		);

	if (!element) {
		throw new Error(
			`Expected element matching ${selector}.`
		);
	}

	return element;
}

function createPaneNavigation():
	PaneNavigationService {
	const component =
		PaneNavigationTestView as unknown as
			NavigationComponent;

	const registry =
		new NavigationViewRegistry();

	registry.registerAll([
		{
			view:
				PLANS_DETAILS_VIEW,
			component
		},
		{
			view:
				SEARCH_RESULTS_VIEW,
			component
		},
		{
			view:
				BIBLE_READER_VIEW,
			component
		}
	]);

	const resolver =
		new NavigationViewResolver(
			registry
		);

	const states =
		new NavigationStateBuilder({
			independent: () => ({}),
			related: (
				_module,
				originatingSelections
			) => ({
				...originatingSelections
			})
		});

	return new PaneNavigationService(
		'navigation-browser-test-pane',
		new NavigationService(),
		states,
		resolver,
		{
			independent: () => ({}),
			update: (
				_module,
				selections
			) => ({
				...selections
			})
		}
	);
}

///////////////////////////////////////////////////////////////////////////////

describe(
	'PaneNavigationContainer',
	() => {
		it(
			'preserves the Plans view DOM instance while Bible is pushed and after Back',
			async () => {
				const target =
					document.createElement(
						'div'
					);
				document.body.appendChild(
					target
				);

				const navigation =
					createPaneNavigation();

				navigation.pushModule(
					Modules.PLANS,
					PLANS_DETAILS_VIEW,
					{
						subID:
							'subscription-1'
					}
				);

				const host = mount(
					PaneNavigationTestHost,
					{
						target,
						props: {
							navigation
						}
					}
				);

				try {
					await tick();

					const originalPlansView =
						requireElement<HTMLElement>(
							target,
							`[data-pane-navigation-view="${PLANS_DETAILS_VIEW}"]`
						);

					const originalPlansInput =
						requireElement<HTMLInputElement>(
							target,
							`[data-pane-navigation-input="${PLANS_DETAILS_VIEW}"]`
						);

					originalPlansInput.value =
						'preserved plans state';
					originalPlansInput.dispatchEvent(
						new Event(
							'input',
							{
								bubbles: true
							}
						)
					);
					await tick();

					navigation.pushModule(
						Modules.BIBLE,
						BIBLE_READER_VIEW,
						{
							bibleLocationRef:
								'1_1_1'
						}
					);
					await tick();

					const coveredPlansView =
						requireElement<HTMLElement>(
							target,
							`[data-pane-navigation-view="${PLANS_DETAILS_VIEW}"]`
						);

					const bibleView =
						requireElement<HTMLElement>(
							target,
							`[data-pane-navigation-view="${BIBLE_READER_VIEW}"]`
						);

					expect(
						coveredPlansView
					).toBe(
						originalPlansView
					);
					expect(
						coveredPlansView
							.parentElement
							?.classList
							.contains(
								'hidden'
							)
					).toBe(true);
					expect(
						bibleView
							.parentElement
							?.classList
							.contains(
								'hidden'
							)
					).toBe(false);

					navigation.back();
					await tick();

					const restoredPlansView =
						requireElement<HTMLElement>(
							target,
							`[data-pane-navigation-view="${PLANS_DETAILS_VIEW}"]`
						);

					const restoredPlansInput =
						requireElement<HTMLInputElement>(
							target,
							`[data-pane-navigation-input="${PLANS_DETAILS_VIEW}"]`
						);

					expect(
						restoredPlansView
					).toBe(
						originalPlansView
					);
					expect(
						restoredPlansInput
					).toBe(
						originalPlansInput
					);
					expect(
						restoredPlansInput.value
					).toBe(
						'preserved plans state'
					);
					expect(
						restoredPlansView
							.parentElement
							?.classList
							.contains(
								'hidden'
							)
					).toBe(false);
					expect(
						target.querySelector(
							`[data-pane-navigation-view="${BIBLE_READER_VIEW}"]`
						)
					).toBeNull();
				} finally {
					await unmount(host);
					target.remove();
				}
			}
		);

		it(
			'completes returned Plan progress before Bible is popped',
			async () => {
				const target =
					document.createElement(
						'div'
					);
				document.body.appendChild(
					target
				);

				const navigation =
					createPaneNavigation();

				const plansState =
					navigation.pushModule(
						Modules.PLANS,
						PLANS_DETAILS_VIEW,
						{
							subID:
								'subscription-1'
						}
					);

				let resolveProgress:
					((value: {
						id: string;
						completedReadingIndexes: readonly number[];
					}) => void) |
					undefined;

				const completeReading =
					vi.fn(
						() =>
							new Promise<{
								id: string;
								completedReadingIndexes: readonly number[];
							}>(
								(resolve) => {
									resolveProgress =
										resolve;
								}
							)
					);

				const putProgress =
					vi.fn();

				navigation.onResult(
					plansState,
					(result) =>
						applyPlanReadingNavigationResult(
							result,
							'subscription-1',
							{
								planProgressService: {
									completeReading
								},
								plansPubSubService: {
									putProgress
								}
							}
						)
				);

				navigation.pushModule(
					Modules.BIBLE,
					BIBLE_READER_VIEW,
					{
						bibleLocationRef:
							'1_1_1'
					}
				);

				const host = mount(
					PaneNavigationTestHost,
					{
						target,
						props: {
							navigation
						}
					}
				);

				try {
					await tick();

					const completion =
						navigation.backWithResult({
							type:
								'plans.reading-completed',
							subID:
								'subscription-1',
							subNestedReadingsIndex:
								2
						});

					await tick();

					expect(
						completeReading
					).toHaveBeenCalledWith(
						'subscription-1',
						2
					);
					expect(
						putProgress
					).not.toHaveBeenCalled();
					expect(
						target.querySelector(
							`[data-pane-navigation-view="${BIBLE_READER_VIEW}"]`
						)
					).not.toBeNull();

					const progress = {
						id:
							'subscription-1',
						completedReadingIndexes: [
							2
						]
					};

					if (!resolveProgress) {
						throw new Error(
							'Plan progress resolver was not captured.'
						);
					}

					resolveProgress(
						progress
					);
					await completion;
					await tick();

					expect(
						putProgress
					).toHaveBeenCalledWith(
						progress
					);
					expect(
						target.querySelector(
							`[data-pane-navigation-view="${BIBLE_READER_VIEW}"]`
						)
					).toBeNull();
					expect(
						requireElement<HTMLElement>(
							target,
							`[data-pane-navigation-view="${PLANS_DETAILS_VIEW}"]`
						)
							.parentElement
							?.classList
							.contains(
								'hidden'
							)
					).toBe(false);
				} finally {
					await unmount(host);
					target.remove();
				}
			}
		);

		it(
			'does not complete Plan progress on normal Bible Back',
			async () => {
				const target =
					document.createElement(
						'div'
					);
				document.body.appendChild(
					target
				);

				const navigation =
					createPaneNavigation();

				const plansState =
					navigation.pushModule(
						Modules.PLANS,
						PLANS_DETAILS_VIEW,
						{
							subID:
								'subscription-1'
						}
					);

				const completeReading =
					vi.fn(
						async () => ({
							id:
								'subscription-1',
							completedReadingIndexes: []
						})
					);
				const putProgress =
					vi.fn();

				navigation.onResult(
					plansState,
					(result) =>
						applyPlanReadingNavigationResult(
							result,
							'subscription-1',
							{
								planProgressService: {
									completeReading
								},
								plansPubSubService: {
									putProgress
								}
							}
						)
				);

				navigation.pushModule(
					Modules.BIBLE,
					BIBLE_READER_VIEW,
					{
						bibleLocationRef:
							'1_1_1'
					}
				);

				const host = mount(
					PaneNavigationTestHost,
					{
						target,
						props: {
							navigation
						}
					}
				);

				try {
					await tick();

					navigation.back();
					await tick();

					expect(
						completeReading
					).not.toHaveBeenCalled();
					expect(
						putProgress
					).not.toHaveBeenCalled();
					expect(
						target.querySelector(
							`[data-pane-navigation-view="${BIBLE_READER_VIEW}"]`
						)
					).toBeNull();
					expect(
						requireElement<HTMLElement>(
							target,
							`[data-pane-navigation-view="${PLANS_DETAILS_VIEW}"]`
						)
							.parentElement
							?.classList
							.contains(
								'hidden'
							)
					).toBe(false);
				} finally {
					await unmount(host);
					target.remove();
				}
			}
		);

		it(
			'preserves the Search view DOM instance while Bible is pushed and after Back',
			async () => {
				const target =
					document.createElement(
						'div'
					);
				document.body.appendChild(
					target
				);

				const navigation =
					createPaneNavigation();

				navigation.pushModule(
					Modules.SEARCH,
					SEARCH_RESULTS_VIEW,
					{
						query:
							'faith'
					}
				);

				const host = mount(
					PaneNavigationTestHost,
					{
						target,
						props: {
							navigation
						}
					}
				);

				try {
					await tick();

					const originalSearchView =
						requireElement<HTMLElement>(
							target,
							`[data-pane-navigation-view="${SEARCH_RESULTS_VIEW}"]`
						);

					const originalSearchInput =
						requireElement<HTMLInputElement>(
							target,
							`[data-pane-navigation-input="${SEARCH_RESULTS_VIEW}"]`
						);

					originalSearchInput.value =
						'preserved search state';
					originalSearchInput.dispatchEvent(
						new Event(
							'input',
							{
								bubbles: true
							}
						)
					);
					await tick();

					navigation.pushModule(
						Modules.BIBLE,
						BIBLE_READER_VIEW,
						{
							bibleLocationRef:
								'1_1_1'
						}
					);
					await tick();

					const coveredSearchView =
						requireElement<HTMLElement>(
							target,
							`[data-pane-navigation-view="${SEARCH_RESULTS_VIEW}"]`
						);

					const bibleView =
						requireElement<HTMLElement>(
							target,
							`[data-pane-navigation-view="${BIBLE_READER_VIEW}"]`
						);

					expect(
						coveredSearchView
					).toBe(
						originalSearchView
					);
					expect(
						coveredSearchView
							.parentElement
							?.classList
							.contains(
								'hidden'
							)
					).toBe(true);
					expect(
						bibleView
							.parentElement
							?.classList
							.contains(
								'hidden'
							)
					).toBe(false);

					navigation.back();
					await tick();

					const restoredSearchView =
						requireElement<HTMLElement>(
							target,
							`[data-pane-navigation-view="${SEARCH_RESULTS_VIEW}"]`
						);

					const restoredSearchInput =
						requireElement<HTMLInputElement>(
							target,
							`[data-pane-navigation-input="${SEARCH_RESULTS_VIEW}"]`
						);

					expect(
						restoredSearchView
					).toBe(
						originalSearchView
					);
					expect(
						restoredSearchInput
					).toBe(
						originalSearchInput
					);
					expect(
						restoredSearchInput.value
					).toBe(
						'preserved search state'
					);
					expect(
						restoredSearchView
							.parentElement
							?.classList
							.contains(
								'hidden'
							)
					).toBe(false);
					expect(
						target.querySelector(
							`[data-pane-navigation-view="${BIBLE_READER_VIEW}"]`
						)
					).toBeNull();
				} finally {
					await unmount(host);
					target.remove();
				}
			}
		);

	}
);
