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

	import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '../../../resources/booknames/bible-booknames-resource';
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
	const definitionRequests = new Map<string, Promise<Strongs>>();

	interface StrongsRow {
		ref: string;
		expanded: boolean;
		definition?: Strongs;
		loading: boolean;
		error?: string;
	}

	// Collapsed rows only need the IDs and verse words already supplied by Refs.
	let strongsRows: StrongsRow[] = $state(
		strongsRefs.map(ref => ({
			ref: ref.toUpperCase(),
			expanded: false,
			loading: false
		}))
	);

	type StrongsDefinition = NonNullable<
		Strongs['brownDef'] | Strongs['thayersDef']
	>;

	// =============================== LIFECYCLE ===============================
	onMount(() => {
		// A single definition without other reference sections is visible on open.
		if (strongsRows.length === 1 && !collapseDefinitions) {
			void loadDefinition(strongsRows[0]);
		}
	});

	// ================================ FUNCS ==================================
	async function loadDefinition(row: StrongsRow): Promise<void> {
		if (row.loading || row.definition) {
			return;
		}

		row.loading = true;
		row.error = undefined;
		let request = definitionRequests.get(row.ref);
		if (!request) {
			request = strongsService.get(strongsSource, row.ref);
			definitionRequests.set(row.ref, request);
		}

		try {
			row.definition = await request;
		} catch (error) {
			definitionRequests.delete(row.ref);
			row.error = error instanceof Error
				? error.message
				: "Unable to load Strong's definition.";
		} finally {
			row.loading = false;
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

	function onStrongsWordClicked(row: StrongsRow): void {
		row.expanded = !row.expanded;
		if (row.expanded) {
			void loadDefinition(row);
		}
	}

	function onToggleStrongs(): void {
		toggleStrongs = !toggleStrongs;
		if (toggleStrongs && strongsRows.length === 1) {
			void loadDefinition(strongsRows[0]);
		}
	}

</script>

<!-- ================================= BODY ================================ -->
{#snippet strongsHtml(s: Strongs)}
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
			<div class="w-full ps-2">
				{@render recursiveDef(s.thayersDef)}
			</div>
		</div>
	{/if}
{/snippet}

{#snippet brownContainer(s: Strongs)}
	{#if s.brownDef}
		<div class="w-full pt-4">
			<p class="text-neutral-600">Brown Definition:</p>
			<div class="w-full ps-2">
				{@render recursiveDef(s.brownDef)}
			</div>
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
	{#each strongsRows as row, idx (idx)}
		{@render strongsWordToggle(row, idx)}
		{#if row.expanded}
			{@render strongsDefinition(row)}
		{/if}
	{/each}
{/snippet}

{#snippet strongsDefinition(row: StrongsRow)}
	{#if row.definition}
		{@render strongsHtml(row.definition)}
	{:else if row.loading}
		<p class="ps-8 text-neutral-600">Loading definition...</p>
	{:else if row.error}
		<p class="ps-8 text-neutral-600">{row.error}</p>
	{/if}
{/snippet}

{#snippet strongsWordToggle(row: StrongsRow, idx: number)}
	<div class="flex flex-row items-center ps-2 pt-2">
		{#if strongsRows.length > 1}
			<KJVButton
				classes=""
				onClick={() => {
					onStrongsWordClicked(row);
				}}
			>
				{#if !row.expanded}
					<KeyboardArrowRight></KeyboardArrowRight>
				{:else}
					<KeyboardArrowDown></KeyboardArrowDown>
				{/if}
			</KJVButton>
		{/if}

		{#if strongsWords && strongsWords.length > 0}
			<ShortText></ShortText>
			<span class="ps-1 pe-4"
				><pre class="inline-block">{`${row.ref}:`.padStart(6, ' ')}</pre>
				{sanitize(strongsWords[idx])}</span
			>
		{:else}
			<span class="pe-4">{row.ref}: {sanitize(text)}</span>
		{/if}
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

{#if collapseDefinitions}
	{@render strongsHeader()}
	{#if toggleStrongs}
		{#if strongsRows.length > 1}
			{@render strongsList()}
		{:else if strongsRows.length === 1}
			{@render strongsWordToggle(strongsRows[0], 0)}
			{@render strongsDefinition(strongsRows[0])}
		{/if}
	{/if}
{:else if strongsRows.length > 1}
	{@render strongsHeader()}
	{@render strongsList()}
{:else if strongsRows.length === 1}
	{@render strongsWordToggle(strongsRows[0], 0)}
	{@render strongsDefinition(strongsRows[0])}
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
