<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onDestroy, onMount } from 'svelte';

	// COMPONENTS
	import { BufferBody } from '$lib/application/ui';
	import Chapter from './chapter/chapter.svelte';
	import BibleHeader from './bibleHeader.svelte';
	import ChapterNavButtons from './components/chapterNavButtons.svelte';
	import EditOptions from './chapter/editOptions.svelte';

	// MODELS
	import {
		BIBLE_MODES,
		newBibleMode,
		type BibleMode,
		type BibleReadingNavigation
	} from '../../models/bible.model';
	import type {
		BibleTextMarkup
	} from '../../models/bible-text-markup.model';

	// SERVICES
	import {
		Modules,
		type NavigationState,
		type NavigationStateValue,
		type NavigationViewState,
		useApplicationContext,
		useNavigationRuntimeContext
	} from '$lib/application';

	// OTHER
	import uuid4 from 'uuid4';

	import { attachEvents } from '$lib/application/ui';
	import { BufferHeader } from '$lib/application/ui';

	import type {
		PublishedResourceReference
	} from '$lib/resource';

	import {
		BIBLE_CHAPTER_RESOURCE_TYPE
	} from '../../resources/chapters/bible-chapter-interpreter';

	import type {
		BibleVersion
	} from '../../models/bible-version.model';

	import {
		parseResourceIdentifier
	} from '$lib/resource';

	import {
		createBibleVersionId
	} from '../../utils/bible-identity';

	import {
		BIBLE_VIEWS
	} from '../../models/bible-navigation.model';
	const {
		moduleResourceSelectionResolver,
		bibleLocationReferenceService,
		bibleTextMarkupService
	} = useApplicationContext();
	// =============================== BINDINGS ================================

	let {
		clientHeight,
		obj = $bindable()
	}: {
		clientHeight: number;
		obj: Record<string, unknown>;
	} = $props();

	const navigationState =
		obj.navigationState;

	validateNavState(
		navigationState
	);

	const {
		navigation
	} = useNavigationRuntimeContext();

	const unsubscribeNavigationResult =
		navigation.onResult(
			navigationState,
			onNavigationResult
		);

	// ================================= VARS ==================================

	let textMarkup: BibleTextMarkup = $state({
		id: '',
		chapterRef: '',
		markings: {}
	});
	let bibleLocationRef: string = $state('');

	let bibleVersion:
		string =
		$state(
			getBibleVersionId(
				moduleResourceSelectionResolver.require(
					navigationState,
					BIBLE_CHAPTER_RESOURCE_TYPE
				)
			)
		);

	let headerHeight = $state(0);
	/** since the {@link header} snippet is part of the body we don't
	 * want to reduce the body height by the header height. This zero
	 * value state will ensure the body is at 100%  {@link BufferContainer}
	 */
	let zeroHeaderHeight = $state(0);
	let id = $state(uuid4());
	const LAST_BIBLE_LOCATION_REF = 'lastBibleLocationReference';
	const DEFAULT_BIBLE_LOCATION_REF = '52_10_9';
	let mode: BibleMode = $state(newBibleMode());

	// DOM related vars
	let lastKnownScrollPosition = $state(0);
	let showNavButtons = $state(true);

	// =============================== LIFECYCLE ===============================

	onMount(async () => {
		setNavReadings();
		setBibleLocationRef();
		attachScrolls();
		overrideContextMenu();
	});

	onDestroy(() => {
		unsubscribeNavigationResult();
	});

	$effect(() => {
		bibleLocationRef;
		onBibleLocationRefChanged();
	});

	// ================================ FUNCS ==================================

	async function onNavigationResult(
		result: NavigationStateValue
	): Promise<void> {
		if (!isRecord(result)) {
			return;
		}

		if (
			result.type === 'bible-location' &&
			typeof result.bibleLocationRef === 'string'
		) {
			bibleLocationRef = result.bibleLocationRef;
			return;
		}

		if (
			result.type === 'bible-version' &&
			typeof result.id === 'string' &&
			typeof result.publisher === 'string' &&
			typeof result.version === 'string'
		) {
			const version: BibleVersion = {
				id: result.id,
				publisher: result.publisher,
				version: result.version
			};

			onBibleVersionResult(
				version
			);
			return;
		}

		if (
			result.type === 'bible-nav-reading' &&
			typeof result.index === 'number' &&
			typeof result.bibleLocationRef === 'string' &&
			mode.navReadings
		) {
			mode.navReadings.currentNavReadingsIndex =
				result.index;
			navigation.updateViewState(
				navigationState,
				'navReadings',
				mode.navReadings as unknown as NavigationStateValue
			);
			bibleLocationRef = result.bibleLocationRef;
		}
	}

	/**
	 * Applies a returned Bible version once this reader entry is active again.
	 *
	 * backWithResult() intentionally delivers the result before popping the
	 * child view. Waiting for this entry to become active keeps the Resource
	 * update owned by bible.reader while leaving Pane navigation generic.
	 */
	function onBibleVersionResult(
		version: BibleVersion
	): void {
		let unsubscribe:
			(() => void) | undefined;

		unsubscribe =
			navigation.views.subscribe(
				() => {
					if (
						!navigation.isActive(
							navigationState
						)
					) {
						return;
					}

					unsubscribe?.();

					onBibleVersionSelected(
						version
					);
				}
			);
	}

	function setNavReadings(): void {
		mode.navReadings =
			navigationState.state
				.navReadings;
	}

	
	function getBibleVersionId(
		source: PublishedResourceReference
	): string {
		const identifier =
			parseResourceIdentifier(
				source.resourceId
			);

		const version =
			identifier.path[0];

		if (!version) {
			throw new Error(
				`Invalid Bible Chapter Resource selection: ${source.resourceId}`
			);
		}

		return createBibleVersionId(
			source.publisher,
			version
		);
	}

	function setBibleLocationRef(): void {
		const ref =
			navigationState.state
				.bibleLocationRef;

		if (typeof ref === 'string' && ref) {
			bibleLocationRef = ref;
			return;
		}

		setToLastBibleLocationRef();
	}

	function setToLastBibleLocationRef() {
		let ref = localStorage.getItem(LAST_BIBLE_LOCATION_REF);
		if (!ref) {
			setDefaultBibleLocationRef();
			return;
		}
		bibleLocationRef = bibleLocationReferenceService.extractBookIDChapter(ref);
	}

	function setDefaultBibleLocationRef() {
		bibleLocationRef = DEFAULT_BIBLE_LOCATION_REF;
	}

	function overrideContextMenu() {
		attachEvents(`chapter-container-${id}`, 'contextmenu', (e) =>
			e.preventDefault()
		);
	}

	function attachScrolls() {
		attachEvents(`${id}-scroll-container`, 'scroll', trackScrollPosition);
	}

	function trackScrollPosition() {
		let el = document.getElementById(`${id}-scroll-container`);
		if (!el) {
			return;
		}
		lastKnownScrollPosition = el.scrollTop;
	}

	function onBibleLocationRefChanged(): void {
		if (
			!bibleLocationRef ||
			!bibleVersion
		) {
			return;
		}

		navigation.updateViewState(
			navigationState,
			'bibleLocationRef',
			bibleLocationRef
		);

		localStorage.setItem(
			LAST_BIBLE_LOCATION_REF,
			bibleLocationRef
		);
	}

	async function onExitEdit(): Promise<void> {
		await bibleTextMarkupService.put(
			JSON.parse(JSON.stringify(textMarkup))
		);

		mode.value = BIBLE_MODES.READING;
	}

	function onBibleVersionSelected(
		version: BibleVersion
	): void {
		const source:
			PublishedResourceReference = {
			publisher:
				version.publisher,

			resourceId:
				`${BIBLE_CHAPTER_RESOURCE_TYPE}/${version.version}`
		};

		navigation.updateResourceSelection(
			BIBLE_CHAPTER_RESOURCE_TYPE,
			source
		);

		bibleVersion =
			version.id;
	}

	/**
	 * Validates the state contract required by the Bible reader view.
	 */
	function validateNavState(
		value: unknown
	): asserts value is BibleReaderNavigationState {
		if (
			!isRecord(value) ||
			value.module !== Modules.BIBLE ||
			value.view !== BIBLE_VIEWS.READER ||
			!isRecord(value.state)
		) {
			throw new Error(
				'Invalid Bible reader navigation state'
			);
		}

		if (
			value.state.bibleLocationRef !== undefined &&
			typeof value.state.bibleLocationRef !== 'string'
		) {
			throw new Error(
				'Invalid Bible reader location state'
			);
		}

		if (
			value.state.navReadings !== undefined &&
			!isBibleReadingNavigation(
				value.state.navReadings
			)
		) {
			throw new Error(
				'Invalid Bible reader readings state'
			);
		}
	}

	function isBibleReadingNavigation(
		value: unknown
	): value is BibleReadingNavigation {
		return (
			isRecord(value) &&
			typeof value.currentNavReadingsIndex === 'number' &&
			isRecord(value.readings) &&
			Array.isArray(value.readings.bcvs)
		);
	}

	function isRecord(
		value: unknown
	): value is Record<string, unknown> {
		return (
			typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value)
		);
	}

	type BibleReaderNavigationState =
		NavigationState<typeof BIBLE_VIEWS.READER> & {
			readonly state:
				NavigationViewState & {
					bibleLocationRef?: string;
					navReadings?: BibleReadingNavigation;
				};
		};

</script>

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<BibleHeader
		bind:mode
		bind:bibleLocationRef
		bind:bibleVersion
		{onExitEdit}
	></BibleHeader>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	<div class="kjvonly-noselect flex justify-center">
		<div>
			<div id="chapter-container-{id}" class="w-full">
				<Chapter
					bind:bibleLocationRef
					bind:bibleVersion
					bind:id
					bind:mode
					bind:textMarkup
					{lastKnownScrollPosition}
				></Chapter>
			</div>
		</div>
	</div>
{/snippet}

<!-- ================================ FOOTER =============================== -->

{#snippet footer()}
	<div class="flex w-full justify-center">
		<div class="w-full">
			{#if mode.value === BIBLE_MODES.READING}
				<ChapterNavButtons
					bind:mode
					bind:bibleLocationRef
					bind:bibleVersion
					bind:showNavButtons
					ID={id}
				></ChapterNavButtons>
			{:else}
				<div
					style="transform: translate3d(0px, 0px, 0px); "
					class="sticky z-10"
				>
					<div class="absolute bottom-0 w-full">
						<EditOptions
							bind:mode
							{onExitEdit}
						></EditOptions>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferHeader
	bind:headerHeight
	classes="flex w-full justify-between outline outline-neutral-400 text-neutral-700"
>
	{#if bibleLocationRef}
		{@render header()}
	{/if}
</BufferHeader>
<BufferBody
	ID={id}
	{clientHeight}
	{headerHeight}
	classes="clear-default-classes"
>
	{#if bibleLocationRef}
		{@render body()}
	{/if}
</BufferBody>
{#if bibleLocationRef}
	{@render footer()}
{/if}
