<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import BufferBody from '$lib/application/runtime/buffer/components/bufferBody.svelte';
	import BufferContainer from '$lib/application/runtime/buffer/components/bufferContainer.svelte';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';
	import FootnoteContainer from './footnote/footnoteContainer.svelte';
	import StrongsDefsContainer from './strongsDefs/strongsDefsContainer.svelte';
	import RefsHeader from './refsHeader.svelte';
	import CrossRefsContainer from './crossRefs/crossRefsContainer.svelte';

	// MODELS
	import {
		newStrongsPopups,
		type StrongsPopups
	} from '$lib/domains/strongs/models/strongs.model';
	import type { Pane } from '$lib/application/runtime/pane/models/pane.model';



	// 
	import type {
		PublishedResourceReference
	} from '$lib/resource/models/resource.model';

	import {
		STRONGS_RESOURCE_TYPE
	} from '$lib/domains/strongs/resources/definitions/strongs-interpreter';

	import {
		KJVONLY_PUBKEY
	} from '$lib/infrastructure/nostr/nostr';

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
	let bibleVersion: string = $state('');

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		setBibleVersion();
		setRefs();
		setCurrentVerseRef();
		setWordText();
	});

	// ================================ FUNCS ==================================

	function setBibleVersion() {
		if (pane?.buffer?.bag?.bibleVersion) {
			bibleVersion = pane?.buffer?.bag?.bibleVersion;
		} else {
			bibleVersion = 'kjvs';
		}
	}

	function setRefs(): void {
		let refs: string[] = getRefs();
		refs.forEach((ref: string) => {
			matchStrongsRef(ref);
			matchFootnote(ref);
			matchCrossRef(ref);
		});
	}

	/**
	 * Refs are passed to component via buffer bag
	 */
	function getRefs(): string[] {
		let refs: string[] = [];
		// TODO ADD TYPE
		if (pane?.buffer?.bag?.refs) {
			// if verse number is clicked TODO make this implicit
			refs = pane?.buffer?.bag?.refs;
		} else if (pane?.buffer?.bag?.word?.href) {
			// if a non verse number is clicked TODO make this implicit
			refs = pane?.buffer?.bag?.word?.href;
		}
		return refs;
	}

	function matchStrongsRef(ref: string): void {
		let match = new RegExp('^[GH]', 'm').test(ref);
		if (match) {
			strongsRefs.push(ref);
		}
	}

	function matchFootnote(ref: string): void {
		let match = new RegExp('\\d+_\\d+_\\d+', 'gm').test(ref);
		if (match) {
			footnotes.push(ref);
		}
	}

	function matchCrossRef(ref: string): void {
		let match = new RegExp('\\d+\/\\d+\/\\d+', 'gm').test(ref);
		if (match) {
			crossRefs.push(ref);
		}
	}

	/**
	 * If a word is selected and that word has verse references, add the
	 * current verse to the {@link crossRefs} at index 0. This way the user
	 * has visual queue for the verse that was clicked.
	 */
	function setCurrentVerseRef(): void {
		if (hasCrossRefs()) {
			if (pane?.buffer?.bag?.currentVerseRef) {
				crossRefs = [pane?.buffer?.bag?.currentVerseRef, ...crossRefs];
			}
		}
	}

	function hasCrossRefs(): boolean {
		return crossRefs.length > 0;
	}

	function setWordText(): void {
		if (pane?.buffer?.bag?.word?.text) {
			text = pane.buffer.bag.word.text.replace(
				/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g,
				''
			);
		}
	}

	// ============================== TMP FUNCS ==============================
	function getStrongsSource():
		PublishedResourceReference {

		const parts =
			bibleVersion.split('/');

		const edition =
			parts.at(-1);

		if (!edition) {
			throw new Error(
				`Invalid Bible version: ${bibleVersion}`
			);
		}

		const publisher =
			parts.length === 2
				? parts[0]
				: KJVONLY_PUBKEY;

		return {
			publisher,

			resourceId:
				`${STRONGS_RESOURCE_TYPE}/${edition}`
		};
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
			bind:clientHeight
			bind:popups
			{text}
			strongsSource={getStrongsSource()}
			{strongsRefs}
			{paneID}
			hasCrossRef={crossRefs.length > 0}
			strongsWords={pane?.buffer?.bag?.strongsWords}
			{bibleVersion}
		></StrongsDefsContainer>
	{/if}

	{#if crossRefs.length > 0}
		<div class=" pt-4"></div>
		<CrossRefsContainer
			paneID={pane?.id}
			boundCrossRefs={crossRefs}
			{bibleVersion}
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
