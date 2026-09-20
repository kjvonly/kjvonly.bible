<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS

	// MODELS
	// SERVICES

	// API
	import type { Strongs, StrongsPopups, UsageBy } from '$lib/domains/strongs';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import KeyboardArrowRight from '$lib/components/svgs/keyboardArrowRight.svelte';
	import KeyboardArrowDown from '$lib/components/svgs/keyboardArrowDown.svelte';
	import Dictionary from '$lib/components/svgs/dictionary.svelte';
	import ShortText from '$lib/components/svgs/shortText.svelte';

	import { useApplicationContext } from '$lib/application';

	import type { PublishedResourceReference } from '$lib/resource';

	import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '$lib/domains/bible/resources/booknames/bible-booknames-interpreter';
	import { filterBibleLocationRefsByBookID } from './strongs-search';

	const {
		strongsService,
		bibleBooknamesService,
		moduleResourceSelectionResolver
	} = useApplicationContext();

	// =============================== BINDINGS ================================
	let {
		popups = $bindable<StrongsPopups>(),
		hasCrossRef,
		strongsSource,
		strongsRefs,
		strongsWords,
		text,
		paneID
	}: {
		popups: StrongsPopups;
		hasCrossRef: boolean;
		strongsSource: PublishedResourceReference;
		strongsRefs: string[];
		strongsWords: string[] | undefined;
		text: string;
		paneID: string;
	} = $props();

	// ================================== VARS =================================

	let toggleStrongs = $state(false);
	let searchTerms = $state('');
	let strongsWithToggle: StrongsWithToggle[] = $state([]);

	interface StrongsWithToggle extends Strongs {
		toggle: boolean;
	}

	type StrongsDefinition = NonNullable<
		Strongs['brownDef'] | Strongs['thayersDef']
	>;

	// =============================== LIFECYCLE ===============================
	onMount(async () => {
		await setStrongsRef();
	});

	// ================================ FUNCS ==================================
	async function setStrongsRef():
	Promise<void> {

	if (!strongsRefs) {
		return;
	}

	for (
		const ref of strongsRefs
	) {
		const data =
			await strongsService.get(
				strongsSource,
				ref.toUpperCase()
			);

		strongsWithToggle.push({
			...data,
			toggle:
				false
		});
	}
}

	function sanitize(w: string): string {
		return w?.replace(/[^a-zA-Z0-9 ]/g, '');
	}

	// ============================== CLICK FUNCS ==============================

	async function onByBook(
		s: Strongs,
		b: UsageBy
	): Promise<void> {
		const source =
			moduleResourceSelectionResolver
				.require(
					paneID,
					BIBLE_BOOKNAMES_RESOURCE_TYPE
				);

		const booknames =
			await bibleBooknamesService.get(
				source
			);

		const bookID =
			booknames.booknamesByName[
				b.text
			];

		const shortName =
			booknames.shortNames[
				String(bookID)
			] ?? '';

		let byWord = s.usageByWord;

		let searchText = '';
		byWord?.forEach((ub: UsageBy) => {
			searchText += `${shortName} ${ub.text} OR `;
		});

		let lastIndexOfOr = searchText.lastIndexOf('OR');
		searchTerms = sanitize(searchText.substring(0, lastIndexOfOr));

		popups.searchPopup = {
			paneID,
			searchTerms,
			onFilterBibleLocationRefByBookID: (refs) =>
				filterBibleLocationRefsByBookID(
					refs,
					bookID
				)
		};
	}

	function onByWord(b: UsageBy): void {
		searchTerms = sanitize(b.text);

		popups.searchPopup = {
			paneID,
			searchTerms
		};
	}

	function onStrongsWordClicked(s: StrongsWithToggle): void {
		s.toggle = !s.toggle;
	}

	function onToggleStrongs(): void {
		toggleStrongs = !toggleStrongs;
	}
</script>

<!-- ================================= BODY ================================ -->
{#snippet strongsHtml(s: StrongsWithToggle)}
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
		{@render byBook(s)}
		{@render byWord(s)}
	</div>
{/snippet}

{#snippet thayersContainer(s: Strongs)}
	{#if s.thayersDef}
		<div class="max-w-lg pt-4">
			<p class="text-neutral-600">Thayers Definition:</p>
			<p class="max-w-lg ps-2">
				{@render recursiveDef(s.thayersDef)}
			</p>
		</div>
	{/if}
{/snippet}

{#snippet brownContainer(s: Strongs)}
	{#if s.brownDef}
		<div class="max-w-lg pt-4">
			<p class="text-neutral-600">Brown Definition:</p>
			<p class="max-w-lg ps-2">
				{@render recursiveDef(s.brownDef)}
			</p>
		</div>
	{/if}
{/snippet}

{#snippet recursiveDef(def: StrongsDefinition)}
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

{#snippet byBook(s: Strongs)}
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
						onByBook(s, b);
					}}
					class="inline-block hover:cursor-pointer hover:text-neutral-400"
					>{b.text}</span
				>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet byWord(s: Strongs)}
	{#if s['usageByWord']}
		<h1 class="pt-4 text-neutral-600">By Word:</h1>

		<div class="space-y-2 ps-4 pb-4">
			{#each s['usageByWord'] as w, idx}
				{#if idx !== 0}&shy;,&nbsp;{/if}<span
					role="button"
					tabindex="-1"
					onkeydown={() => {}}
					onclick={() => {
						onByWord(w);
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
				{@render strongsHtml(s)}
			{/if}
		{/each}
	{/if}
{/snippet}

{#snippet strongsWordToggle(s: StrongsWithToggle, idx: number)}
	<div class="flex flex-row items-center ps-2 pt-2">
		{#if strongsWords && strongsWords.length > 0}
			<KJVButton
				classes=""
				onClick={() => {
					onStrongsWordClicked(s);
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
					onClick={() => {
						onStrongsWordClicked(s);
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
	{@render strongsHtml(strongsWithToggle[0])}
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
