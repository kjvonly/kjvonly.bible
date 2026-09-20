<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import { BufferBody } from '$lib/application/ui';
	import { BufferContainer } from '$lib/application/ui';
	import { BufferHeader } from '$lib/application/ui';
	import FootnoteContainer from './footnote/footnoteContainer.svelte';
	import StrongsDefsContainer from './strongsDefs/strongsDefsContainer.svelte';
	import RefsHeader from './refsHeader.svelte';
	import CrossRefsContainer from './crossRefs/crossRefsContainer.svelte';

	// MODELS
	import type { Pane } from '$lib/application';
	import { useApplicationContext } from '$lib/application';
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
		paneID,
		pane = $bindable<Pane>()
	}: {
		paneID: string;
		pane: Pane;
	} = $props();

	// ================================== VARS =================================

	let clientHeight: number = $state(0);
	let headerHeight: number = $state(0);

	let footnotes: string[] = $state([]);
	let popups: StrongsPopups = $state(newStrongsPopups());
	let strongsRefs: string[] = $state([]);
	let text = $state('');
	let crossRefs: string[] = $state([]);

	let strongsSource = $derived(
		moduleResourceSelectionResolver.require(
			paneID,
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
	 * Refs are passed to component via buffer bag
	 */
	function getRefs(): string[] {
		const bag = pane.buffer?.bag;

		if (bag?.refs) {
			return bag.refs;
		}

		return bag?.word?.href ?? [];
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
	 * If a word is selected and that word has verse references, add the
	 * current verse to the {@link crossRefs} at index 0. This way the user
	 * has visual queue for the verse that was clicked.
	 */
	function setCurrentVerseRef(): void {
		const currentVerseRef = pane.buffer?.bag.currentVerseRef;

		if (hasCrossRefs() && currentVerseRef) {
			crossRefs = [currentVerseRef, ...crossRefs];
		}
	}

	function hasCrossRefs(): boolean {
		return crossRefs.length > 0;
	}

	function setWordText(): void {
		const wordText = pane.buffer?.bag.word?.text;

		if (!wordText) {
			return;
		}

		text = wordText.replace(
			/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g,
			''
		);
	}

	// ============================== CLICK FUNCS ==============================
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<RefsHeader bind:popups bind:clientHeight {paneID}></RefsHeader>
{/snippet}

<!-- ================================= BODY ================================ -->
{#snippet body()}
	{#if footnotes.length > 0}
		<div class=" pt-4"></div>
		<FootnoteContainer
			hasCrossRef={pane?.buffer?.bag?.refs !== undefined}
			{footnotes}
			chapterFootnotes={pane?.buffer?.bag?.footnotes}
		></FootnoteContainer>
	{/if}

	{#if strongsRefs.length > 0}
		<div class=" pt-4"></div>
		<StrongsDefsContainer
			bind:popups
			{text}
			{strongsSource}
			{strongsRefs}
			{paneID}
			hasCrossRef={crossRefs.length > 0}
			strongsWords={pane?.buffer?.bag?.strongsWords}
		></StrongsDefsContainer>
	{/if}

	{#if crossRefs.length > 0}
		<div class=" pt-4"></div>
		<CrossRefsContainer
			paneID={pane?.id}
			boundCrossRefs={crossRefs}
		></CrossRefsContainer>
	{/if}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	<BufferHeader
		bind:headerHeight
		classes="flex w-full justify-between outline outline-neutral-400 text-neutral-700"
	>
		{@render header()}
	</BufferHeader>
	<BufferBody bind:clientHeight bind:headerHeight>
		{@render body()}
	</BufferBody>
</BufferContainer>
