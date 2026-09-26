<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import {
		BufferBody,
		BufferHeader
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
		useApplicationContext
	} from '$lib/application';
	import type { Word } from '../../models/bible.model';
	import {
		REFS_VIEWS
	} from '../../models/refs-navigation.model';
	import {
		newStrongsPopups,
		STRONGS_RESOURCE_TYPE,
		type StrongsPopups
	} from '$lib/domains/strongs';

	import {
		isCrossReference,
		isFootnoteReference,
		isStrongsReference,
		tokenizeReferences
	} from '../../services/reference-tokenizer.service';

	const {
		moduleResourceSelectionResolver
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

	// ================================== VARS =================================

	let headerHeight: number = $state(0);

	let footnotes: string[] = $state([]);
	let popups: StrongsPopups = $state(newStrongsPopups());
	let strongsRefs: string[] = $state([]);
	let text = $state('');
	let crossRefs: string[] = $state([]);

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
	 */
	function setCurrentVerseRef(): void {
		const currentVerseRef =
			navigationState.state
				.currentVerseRef;

		if (hasCrossRefs() && currentVerseRef) {
			crossRefs = [
				currentVerseRef,
				...crossRefs
			];
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
			state.currentVerseRef !== undefined &&
			typeof state.currentVerseRef !== 'string'
		) {
			throw new Error(
				"Invalid Strong's/Refs verse state"
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
					footnotes?: Record<string, string>;
					currentVerseRef?: string;
					refs?: string[];
					strongsWords?: string[];
				};
		};
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<RefsHeader bind:popups {clientHeight} {navigationState}></RefsHeader>
{/snippet}

<!-- ================================= BODY ================================ -->
{#snippet body()}
	{#if footnotes.length > 0}
		<div class=" pt-4"></div>
		<FootnoteContainer
			hasCrossRef={navigationState.state.refs !== undefined}
			{footnotes}
			chapterFootnotes={navigationState.state.footnotes ?? {}}
		></FootnoteContainer>
	{/if}

	{#if strongsRefs.length > 0}
		<div class=" pt-4"></div>
		<StrongsDefsContainer
			bind:popups
			{text}
			{strongsSource}
			{strongsRefs}
			hasCrossRef={crossRefs.length > 0}
			strongsWords={navigationState.state.strongsWords}
		></StrongsDefsContainer>
	{/if}

	{#if crossRefs.length > 0}
		<div class=" pt-4"></div>
		<CrossRefsContainer
			boundCrossRefs={crossRefs}
		></CrossRefsContainer>
	{/if}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferHeader
	bind:headerHeight
	classes="flex w-full justify-between outline outline-neutral-400 text-neutral-700"
>
	{@render header()}
</BufferHeader>
<BufferBody {clientHeight} {headerHeight}>
	{@render body()}
</BufferBody>
