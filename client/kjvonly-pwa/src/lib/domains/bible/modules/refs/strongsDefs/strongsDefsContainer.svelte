<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS

	// MODELS
	// SERVICES

	// API
	import type { Strongs, UsageBy } from '$lib/domains/strongs';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import KeyboardArrowRight from '$lib/components/svgs/keyboardArrowRight.svelte';
	import KeyboardArrowDown from '$lib/components/svgs/keyboardArrowDown.svelte';
	import Dictionary from '$lib/components/svgs/dictionary.svelte';
	import ShortText from '$lib/components/svgs/shortText.svelte';

	import {
		Modules,
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext
	} from '$lib/application';

	import type { PublishedResourceReference } from '$lib/resource';

	import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '../../../resources/booknames/bible-booknames-interpreter';
	import { SEARCH_VIEWS } from '../../../models/search-navigation.model';

	const {
		strongsService,
		bibleBooknamesService,
		moduleResourceSelectionResolver
	} = useApplicationContext();

	const { navigationState } =
		useNavigationEntryContext();

	const { navigation } =
		useNavigationRuntimeContext();

	// =============================== BINDINGS ================================
	let {
		strongsSource,
		strongsRefs,
		strongsWords,
		text,
		collapseDefinitions
	}: {
		strongsSource: PublishedResourceReference;
		strongsRefs: string[];
		strongsWords: string[] | undefined;
		text: string;
		collapseDefinitions: boolean;
	} = $props();

	// ================================== VARS =================================

	let toggleStrongs = $state(false);
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
					navigationState,
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

		const lastIndexOfOr =
			searchText.lastIndexOf('OR');

		const searchTerms = sanitize(
			searchText.substring(
				0,
				lastIndexOfOr
			)
		);

		navigation.pushModule(
			Modules.SEARCH,
			SEARCH_VIEWS.RESULTS,
			{
				query: searchTerms,
				bookID
			}
		);
	}

	function onByWord(b: UsageBy): void {
		navigation.pushModule(
			Modules.SEARCH,
			SEARCH_VIEWS.RESULTS,
			{
				query: sanitize(b.text)
			}
		);
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
		<div class="w-full pt-4">
			<p class="text-neutral-600">Thayers Definition:</p>
			<p class="w-full ps-2">
				{@render recursiveDef(s.thayersDef)}
			</p>
		</div>
	{/if}
{/snippet}

{#snippet brownContainer(s: Strongs)}
	{#if s.brownDef}
		<div class="w-full pt-4">
			<p class="text-neutral-600">Brown Definition:</p>
			<p class="w-full ps-2">
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

{#snippet strongsHeader()}
	<div class="flex flex-row items-center">
		{#if collapseDefinitions}
			<KJVButton classes="" onClick={onToggleStrongs}>
				{#if !toggleStrongs}
					<KeyboardArrowRight></KeyboardArrowRight>
				{:else}
					<KeyboardArrowDown></KeyboardArrowDown>
				{/if}
			</KJVButton>
		{/if}
		<Dictionary></Dictionary>
		<p class="ps-1 pe-4 capitalize">
			{strongsRefs.length === 1 ? 'definition' : 'definitions'}
		</p>
	</div>
{/snippet}

{#snippet strongsList()}
	{#each strongsWithToggle as s, idx}
		{@render strongsWordToggle(s, idx)}
		{#if s.toggle}
			{@render strongsHtml(s)}
		{/if}
	{/each}
{/snippet}

{#snippet strongsWordToggle(s: StrongsWithToggle, idx: number)}
	<div class="flex flex-row items-center ps-2 pt-2">
		{#if strongsWithToggle.length > 1}
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

		{#if strongsWords && strongsWords.length > 0}
			<ShortText></ShortText>
			<span class="ps-1 pe-4"
				><pre class="inline-block">{`${s.number}:`.padStart(6, ' ')}</pre>
				{sanitize(strongsWords[idx])}</span
			>
		{:else}
			<span class="pe-4">{s.number}: {sanitize(text)}</span>
		{/if}
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

{#if collapseDefinitions}
	{@render strongsHeader()}
	{#if toggleStrongs}
		{#if strongsWithToggle.length > 1}
			{@render strongsList()}
		{:else if strongsWithToggle.length === 1}
			{@render strongsWordToggle(strongsWithToggle[0], 0)}
			{@render strongsHtml(strongsWithToggle[0])}
		{/if}
	{/if}
{:else if strongsWithToggle.length > 1}
	{@render strongsHeader()}
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
