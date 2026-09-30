<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import {
		ViewBody,
		ViewHeader
	} from '$lib/application/ui';
	import FootnoteContainer from './footnote/footnoteContainer.svelte';
	import StrongsDefsContainer from './strongsDefs/strongsDefsContainer.svelte';
	import RefsHeader from './refsHeader.svelte';
	import CrossRefsContainer from './crossRefs/crossRefsContainer.svelte';

	// MODELS
	import {
		Modules,
		type NavigationState,
		type NavigationViewState,
		useApplicationContext,
		useNavigationEntryContext,
		usePaneLayoutContext
	} from '$lib/application';
	import type { Word } from '../../models/bible.model';
	import {
		REFS_VIEWS
	} from '../../models/refs-navigation.model';
	import {
		STRONGS_RESOURCE_TYPE
	} from '$lib/domains/strongs';

	import {
		isCrossReference,
		isFootnoteReference,
		isStrongsReference,
		tokenizeReferences
	} from '../../services/reference-tokenizer.service';
	import {
		BIBLE_BOOKNAMES_RESOURCE_TYPE
	} from '../../resources/booknames/bible-booknames-interpreter';

	const {
		bibleBooknamesService,
		bibleLocationReferenceService,
		moduleResourceSelectionResolver
	} = useApplicationContext();

	// =============================== BINDINGS ================================

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	const {
		navigationState
	} = useNavigationEntryContext();

	validateNavState(
		navigationState
	);

	// ================================== VARS =================================

	let headerHeight: number = $state(0);
	let title = $state('Strongs / Refs');

	let footnotes: string[] = $state([]);
	let strongsRefs: string[] = $state([]);
	let text = $state('');
	let crossRefs: string[] = $state([]);

	let sectionCount = $derived(
		Number(footnotes.length > 0) +
		Number(strongsRefs.length > 0) +
		Number(crossRefs.length > 0)
	);
	let collapseSections = $derived(
		sectionCount > 1
	);

	let strongsSource = $derived(
		moduleResourceSelectionResolver.require(
			navigationState,
			STRONGS_RESOURCE_TYPE
		)
	);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		setRefs();
		setCurrentVerseRef();
		setWordText();
		void setTitle();
	});

	// ================================ FUNCS ==================================

	function setRefs(): void {
		const refs = tokenizeReferences(
			getRefs()
		);

		refs.forEach((ref) => {
			matchStrongsRef(ref);
			matchFootnote(ref);
			matchCrossRef(ref);
		});
	}

	/**
	 * Returns references captured by the navigation entry that opened this view.
	 */
	function getRefs(): string[] {
		const refs =
			navigationState.state.refs;

		if (refs) {
			return refs;
		}

		return navigationState.state
			.word?.href ?? [];
	}

	function matchStrongsRef(ref: string): void {
		if (isStrongsReference(ref)) {
			strongsRefs.push(ref);
		}
	}

	function matchFootnote(ref: string): void {
		if (isFootnoteReference(ref)) {
			footnotes.push(ref);
		}
	}

	function matchCrossRef(ref: string): void {
		if (isCrossReference(ref)) {
			crossRefs.push(ref);
		}
	}

	/**
	 * Prepends the originating verse when the selected word has cross references.
	 * The canonical Bible location is navigation state; the Refs-specific cross
	 * reference representation is derived locally.
	 */
	function setCurrentVerseRef(): void {
		const bibleLocationRef =
			navigationState.state
				.bibleLocationRef;

		if (
			hasCrossRefs() &&
			bibleLocationRef &&
			bibleLocationReferenceService
				.hasVerse(
					bibleLocationRef
				)
		) {
			crossRefs = [
				bibleLocationReferenceService
					.convertBibleLocationRefToCrossRef(
						bibleLocationRef
					),
				...crossRefs
			];
		}
	}

	/**
	 * Resolves the display title from the canonical Bible location captured by
	 * this navigation entry. The Strong's Module owns a Booknames Resource
	 * selection, so callers do not need to serialize presentation text.
	 */
	async function setTitle(): Promise<void> {
		const bibleLocationRef =
			navigationState.state
				.bibleLocationRef;

		if (!bibleLocationRef) {
			return;
		}

		const source =
			moduleResourceSelectionResolver.require(
				navigationState,
				BIBLE_BOOKNAMES_RESOURCE_TYPE
			);
		const booknames =
			await bibleBooknamesService.get(
				source
			);
		const bookID =
			bibleLocationReferenceService
				.extractBookID(
					bibleLocationRef
				);
		const chapter =
			bibleLocationReferenceService
				.extractChapter(
					bibleLocationRef
				);
		const bookName =
			booknames.booknamesById[bookID] ??
			booknames.shortNames[bookID] ??
			bookID;

		title = `${bookName} ${chapter}`;

		if (
			bibleLocationReferenceService
				.hasVerse(
					bibleLocationRef
				)
		) {
			title +=
				`:${bibleLocationReferenceService
					.extractVerse(
						bibleLocationRef
					)}`;
		}
	}

	function hasCrossRefs(): boolean {
		return crossRefs.length > 0;
	}

	function setWordText(): void {
		const wordText =
			navigationState.state
				.word?.text;

		if (!wordText) {
			return;
		}

		text = wordText.replace(
			/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g,
			''
		);
	}

	/**
	 * Validates the semantic state required by the Strong's/Refs root view.
	 */
	function validateNavState(
		value: unknown
	): asserts value is RefsNavigationState {
		if (
			!isRecord(value) ||
			value.module !== Modules.STRONGS ||
			value.view !== REFS_VIEWS.ROOT ||
			!isRecord(value.state)
		) {
			throw new Error(
				"Invalid Strong's/Refs navigation state"
			);
		}

		const state = value.state;

		if (
			state.bibleLocationRef !== undefined &&
			typeof state.bibleLocationRef !== 'string'
		) {
			throw new Error(
				"Invalid Strong's/Refs Bible location state"
			);
		}

		if (
			state.refs !== undefined &&
			!isStringArray(state.refs)
		) {
			throw new Error(
				"Invalid Strong's/Refs references state"
			);
		}

		if (
			state.strongsWords !== undefined &&
			!isStringArray(state.strongsWords)
		) {
			throw new Error(
				"Invalid Strong's/Refs words state"
			);
		}

		if (
			state.footnotes !== undefined &&
			!isStringRecord(state.footnotes)
		) {
			throw new Error(
				"Invalid Strong's/Refs footnotes state"
			);
		}

		if (
			state.word !== undefined &&
			!isWord(state.word)
		) {
			throw new Error(
				"Invalid Strong's/Refs word state"
			);
		}
	}

	function isWord(
		value: unknown
	): value is Word {
		return (
			isRecord(value) &&
			typeof value.text === 'string' &&
			typeof value.emphasis === 'boolean' &&
			(value.class === null ||
				isStringArray(value.class)) &&
			(value.href === null ||
				isStringArray(value.href))
		);
	}

	function isStringArray(
		value: unknown
	): value is string[] {
		return (
			Array.isArray(value) &&
			value.every(
				(item) =>
					typeof item === 'string'
			)
		);
	}

	function isStringRecord(
		value: unknown
	): value is Record<string, string> {
		return (
			isRecord(value) &&
			Object.values(value).every(
				(item) =>
					typeof item === 'string'
			)
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

	type RefsNavigationState =
		NavigationState<typeof REFS_VIEWS.ROOT> & {
			readonly state:
				NavigationViewState & {
					word?: Word;
					bibleLocationRef?: string;
					footnotes?: Record<string, string>;
					refs?: string[];
					strongsWords?: string[];
				};
		};
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<RefsHeader
		{title}
	></RefsHeader>
{/snippet}

<!-- ================================= BODY ================================ -->
{#snippet body()}
	{#if footnotes.length > 0}
		<div class=" pt-4"></div>
		<FootnoteContainer
			collapsible={collapseSections}
			{footnotes}
			chapterFootnotes={navigationState.state.footnotes ?? {}}
		></FootnoteContainer>
	{/if}

	{#if strongsRefs.length > 0}
		<div class=" pt-4"></div>
		<StrongsDefsContainer
			{text}
			{strongsSource}
			{strongsRefs}
			strongsWords={navigationState.state.strongsWords}
			collapseDefinitions={collapseSections}
		></StrongsDefsContainer>
	{/if}

	{#if crossRefs.length > 0}
		<div class=" pt-4"></div>
		<CrossRefsContainer
			boundCrossRefs={crossRefs}
			collapsible={collapseSections}
		></CrossRefsContainer>
	{/if}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<ViewHeader
	bind:headerHeight
	classes="flex w-full justify-between outline outline-neutral-400 text-neutral-700"
>
	{@render header()}
</ViewHeader>
<ViewBody {clientHeight} {headerHeight}>
	{@render body()}
</ViewBody>
