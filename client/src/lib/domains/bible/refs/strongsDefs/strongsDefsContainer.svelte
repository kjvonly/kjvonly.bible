<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import ChevronDown from '$lib/components/chevronDown.svelte';

	// MODELS
	// SERVICES
	import { strongsService } from '$lib/services/bible/strongs.service';

	// API
	import { bookIDByBookNameService } from '$lib/services/bibleMetadata/bookIDByBookName.service';
	import { shortBookNamesByIDService } from '$lib/services/bibleMetadata/shortBookNamesByID.service';
	import type { Strongs, UsageBy } from '$lib/models/strongs.model';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import KeyboardArrowRight from '$lib/components/svgs/keyboardArrowRight.svelte';
	import KeyboardArrowDown from '$lib/components/svgs/keyboardArrowDown.svelte';
	import Dictionary from '$lib/components/svgs/dictionary.svelte';
	import ShortText from '$lib/components/svgs/shortText.svelte';

	// =============================== BINDINGS ================================
	let {
		clientHeight = $bindable<number>(),
		popups = $bindable<any>(),
		bibleVersion,
		hasCrossRef,
		strongsRefs,
		strongsWords,
		text,
		paneID
	} = $props();

	// ================================== VARS =================================

	let toggleStrongs = $state(false);
	let searchTerms = $state('');
	let startsWithBookId = '';
	let strongsWithToggle: StrongsWithToggle[] = $state([]);

	interface StrongsWithToggle extends Strongs {
		toggle: boolean;
	}

	// =============================== LIFECYCLE ===============================
	onMount(async () => {
		await setStrongsRef();
	});

	// ================================ FUNCS ==================================
	async function setStrongsRef(): Promise<any> {
		if (strongsRefs) {
			strongsRefs.forEach(async (ref: string) => {
				let data = await strongsService.get(ref.toLowerCase());
				if (data) {
					strongsWithToggle.push({ ...data, toggle: false });
				}
			});
		}
	}

	function sanitize(w: string): string {
		return w?.replace(/[^a-zA-Z0-9 ]/g, '');
	}

	// ============================== CLICK FUNCS ==============================

	function onFilterBibleLocationRefByBookID(refs: string[]): string[] {
		return refs.filter((ref) => {
			if (ref.startsWith(startsWithBookId)) {
				return ref;
			}
		});
	}

	function onByBook(s: Strongs, b: any, idx: number): void {
		let bookID = bookIDByBookNameService.get(b.text);
		let shortName = shortBookNamesByIDService.get(bookID);
		let byWord = s.usageByWord;

		let searchText = '';
		byWord?.forEach((ub: UsageBy) => {
			searchText += `${shortName} ${ub.text} OR `;
		});

		let lastIndexOfOr = searchText.lastIndexOf('OR');
		searchTerms = sanitize(searchText.substring(0, lastIndexOfOr));

		popups.searchPopup = {
			paneID: paneID,
			searchTerms: searchTerms,
			onFilterBibleLocationRefByBookID: onFilterBibleLocationRefByBookID,
			bibleVersion: bibleVersion
		};
	}

	function onByWord(b: any, idx: number): void {
		searchTerms = sanitize(b.text);

		popups.searchPopup = {
			paneID: paneID,
			searchTerms: searchTerms,
			bibleVersion: bibleVersion
		};
	}

	function onStrongsWordClicked(e: Event, s: StrongsWithToggle): void {
		s.toggle = !s.toggle;
	}

	function onToggleStrongs(): void {
		toggleStrongs = !toggleStrongs;
	}
</script>

<!-- ================================= BODY ================================ -->
{#snippet strongsHtml(s: any, idx: number)}
	<div class="ps-8">
		{#if s['strongsDef']}
			<div class="">
				<p class="text-neutral-600">Strongs Definition:</p>
				<p class="ps-4">
					{@html s['strongsDef']}
				</p>
			</div>
		{/if}

		<div class="">
			<h1 class="pt-4 text-neutral-600">Linguistic Elements:</h1>
			<div class="flex flex-shrink">
				<div class="flex flex-col p-2">
					{#if s['originalWord']}
						<p class="text-neutral-500">Original Word</p>
						<p class="ps-4">{@html s['originalWord']}</p>
					{/if}

					{#if s['partsOfSpeech']}
						<p class="text-neutral-500">Parts of Speech</p>
						<p class="ps-4">{@html s['partsOfSpeech']}</p>
					{/if}

					{#if s['phoneticSpelling']}
						<p class="text-neutral-500">Phonetic Spelling</p>
						<p class="ps-4">{@html s['phoneticSpelling']}</p>
					{/if}

					{#if s['transliteratedWord']}
						<p class="text-neutral-500">Transliterated Word</p>
						<p class="ps-4">{@html s['transliteratedWord']}</p>
					{/if}
				</div>
			</div>
		</div>

		{@render thayersContainer(s)}
		{@render brownContainer(s)}
		{@render byBook(s, idx)}
		{@render byWord(s, idx)}
	</div>
{/snippet}

{#snippet thayersContainer(s: any)}
	{#if s.thayersDef}
		<div class="max-w-lg pt-4">
			<p class="text-neutral-600">Thayers Definition:</p>
			<p class="max-w-lg ps-2">
				{@render recursiveDef(s.thayersDef)}
			</p>
		</div>
	{/if}
{/snippet}

{#snippet brownContainer(s: any)}
	{#if s.brownDef}
		<div class="max-w-lg pt-4">
			<p class="text-neutral-600">Brown Definition:</p>
			<p class="max-w-lg ps-2">
				{@render recursiveDef(s.brownDef)}
			</p>
		</div>
	{/if}
{/snippet}

{#snippet recursiveDef(def: any)}
	{#if def.text}
		<li>
			{def.text}
		</li>
	{/if}

	{#if def.children}
		<ol>
			{#each def.children as d2}
				{@render recursiveDef(d2)}
			{/each}
		</ol>
	{/if}
{/snippet}

{#snippet byBook(s: any, idx: number)}
	{#if s['usageByBook']}
		<div class="flex flex-row items-center pt-4">
			<p class="pe-4 text-neutral-600 capitalize">By Book:</p>
		</div>

		<div class="space-y-2 ps-4 pt-2">
			{#each s['usageByBook'] as b, bookIndex}
				{#if bookIndex !== 0}&shy;,&nbsp;{/if}<span
					role="button"
					tabindex="-1"
					onkeydown={() => {}}
					onclick={() => {
						onByBook(s, b, idx);
					}}
					class="inline-block hover:cursor-pointer hover:text-neutral-400"
					>{b.text}</span
				>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet byWord(s: any, idx: number)}
	{#if s['usageByWord']}
		<h1 class="pt-4 text-neutral-600">By Word:</h1>

		<div class="space-y-2 ps-4 pb-4">
			{#each s['usageByWord'] as w, idx}
				{#if idx !== 0}&shy;,&nbsp;{/if}<span
					role="button"
					tabindex="-1"
					onkeydown={() => {}}
					onclick={() => {
						onByWord(w, idx);
					}}
					class="inline-block hover:cursor-pointer hover:text-neutral-400"
					>{w.text}</span
				>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet strongsToggle()}
	<div class="flex flex-row items-center">
		<KJVButton classes="" onClick={onToggleStrongs}>
			{#if !toggleStrongs}
				<KeyboardArrowRight></KeyboardArrowRight>
			{:else}
				<KeyboardArrowDown></KeyboardArrowDown>
			{/if}
		</KJVButton>
		<Dictionary></Dictionary>
		<p class="ps-1 pe-4 capitalize">definitions</p>
	</div>
{/snippet}

{#snippet strongsList()}
	{#if toggleStrongs}
		{#each strongsWithToggle as s, idx}
			{@render strongsWordToggle(s, idx)}
			{#if s.toggle}
				{@render strongsHtml(s, idx)}
			{/if}
		{/each}
	{/if}
{/snippet}

{#snippet strongsWordToggle(s: StrongsWithToggle, idx: number)}
	<div class="flex flex-row items-center ps-2 pt-2">
		{#if strongsWords && strongsWords.length > 0}
			<KJVButton
				classes=""
				onClick={(e: Event) => {
					onStrongsWordClicked(e, s);
				}}
			>
				{#if !s.toggle}
					<KeyboardArrowRight></KeyboardArrowRight>
				{:else}
					<KeyboardArrowDown></KeyboardArrowDown>
				{/if}
			</KJVButton>
			<ShortText></ShortText>
			<span class="ps-1 pe-4"
				><pre class="inline-block">{`${s.number}:`.padStart(6, ' ')}</pre>
				{sanitize(strongsWords[idx])}</span
			>
		{:else}
			<!-- This is for single word clicks. That word could have an
			 	 associated cross reference so we'd want to toggle the 
				 strongs def. Also a word could have more than one associated 
				 strongs def. If thats the case we want to toggle them -->
			{#if hasCrossRef || strongsWithToggle?.length > 1}
				<KJVButton
					classes=""
					onClick={(e: Event) => {
						onStrongsWordClicked(e, s);
					}}
				>
					{#if !s.toggle}
						<KeyboardArrowRight></KeyboardArrowRight>
					{:else}
						<KeyboardArrowDown></KeyboardArrowDown>
					{/if}
				</KJVButton>
			{/if}
			<span class="pe-4">{s.number}: {sanitize(text)}</span>
		{/if}
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

{#if strongsWithToggle.length > 1 || hasCrossRef}
	{@render strongsToggle()}
	{@render strongsList()}
{:else if strongsWithToggle.length === 1}
	{@render strongsWordToggle(strongsWithToggle[0], 0)}
	{@render strongsHtml(strongsWithToggle[0], 0)}
{/if}

<style>
	ol {
		counter-reset: item;
	}
	ol {
		list-style-type: decimal;
		padding-left: 23px;
	}

	ol ol {
		list-style-type: lower-alpha;
	}

	ol ol ol {
		list-style-type: upper-roman;
	}

	ol ol ol ol {
		list-style-type: decimal;
	}

	ol ol ol ol ol {
		list-style-type: lower-alpha;
	}

	ol ol ol ol ol ol {
		list-style-type: upper-roman;
	}
</style>
