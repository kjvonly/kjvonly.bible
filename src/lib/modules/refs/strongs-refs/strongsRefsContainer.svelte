<script lang="ts">
	import { chapterService } from '$lib/api/chapters.service';
	import ChevronDown from '$lib/components/chevronDown.svelte';
	import { bibleDB } from '$lib/db/bible.db';
	import Search from '$lib/modules/search/search.svelte';
	import { onMount } from 'svelte';

	let { containerHeight, isVerseRef, strongsRefs, strongsWords, text, paneId } = $props();

	let toggleStrongs = $state(false);
	let showByBook = $state(false);
	let showByWord = $state(false);
	let searchTerms = $state('');
	let booknames: any= {};
	let startsWithBookId = ''

	let strongs: any[] | undefined = $state([]);

	function sanatize(w: string) {
		return w.replace(/[^a-zA-Z0-9]/g, '');
	}

	onMount(async () => {
		if (strongsRefs) {
			strongsRefs.forEach(async (ref: string) => {
				let data = await bibleDB.getValue('strongs', ref.toLowerCase());
				if (data) {
					strongs.push(data);
				}
			});
		}

		booknames = await chapterService.getBooknames();
	});

	function onFilterBookIndexes(indexes: string[]) {
		return indexes.filter(bookId => {
			if (bookId.startsWith(startsWithBookId)){
				console.log(bookId)
				return bookId
			}
		})
	}

	function onByBook(b: any, idx: number) {
		
		if (strongsWords && strongsWords.length > 0){
			searchTerms = sanatize(strongsWords[idx])
		} else {
			searchTerms = sanatize(text);
		}
		
		let bookid = booknames['booknamesByName'][b.text];
		if (bookid){
			startsWithBookId = `${bookid}_`
		}
		showByBook = true;
	}
</script>

{#snippet header(s: any, idx: number)}
	<div class="flex flex-row items-center ps-2 pt-2">
		{#if strongsWords && strongsWords.length > 0}
			<span class="pe-4">{s['number']}: {strongsWords[idx]}</span>

			<button
				onclick={() => {
					s.toggle = !s.toggle;
				}}
				aria-label="toggle drop down"
			>
				<ChevronDown className="w-4 h-4" fill="fill-neutral-700"></ChevronDown>
			</button>
		{:else}
			<span class="pe-4">{s['number']}: {text}</span>
			{#if isVerseRef || strongs?.length > 1}
				<button
					onclick={() => {
						s.toggle = !s.toggle;
					}}
					aria-label="toggle drop down"
				>
					<ChevronDown className="w-4 h-4" fill="fill-neutral-700"></ChevronDown>
				</button>
			{/if}
		{/if}
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

{#snippet brownContainer(s)}
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
			<p class="pe-4 capitalize">By Book:</p>
			<button
				onclick={() => {
					s.toggleBooks = !s.toggleBooks;
				}}
				aria-label="toggle drop down"
			>
				<ChevronDown className="w-4 h-4" fill="fill-neutral-700"></ChevronDown>
			</button>
		</div>

		<div class="space-y-2 ps-4 pt-2">
			{#each s['usageByBook'] as b, idx}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				{#if idx !== 0}&shy;,&nbsp;{/if}<span
					onclick={() => {
						onByBook(b, idx);
					}}
					class="inline-block hover:cursor-pointer hover:text-neutral-400">{b.text}</span
				>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet byWord(s: any, idx: number)}
	{#if s['usageByWord']}
		<h1 class="pt-4 text-neutral-600">By Word:</h1>

		<div class="space-y-2 ps-4">
			{#each s['usageByBook'] as b, idx}
				{#if idx !== 0}&shy;,&nbsp;{/if}<span class="inline-block">{b.text}</span>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet strongsHtml(s: any, idx: number)}
	<div class="ps-4">
		{#if s['strongsDef']}
			<div class="">
				<p class="text-neutral-600">Strongs Definition:</p>
				<p class="ps-2">
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
		<!-- {@render byWord(s, idx)} -->
	</div>
{/snippet}

<div class="">
	{#if showByBook}
		<div class="sticky top-0 z-popover flex w-full justify-center">
			<div style={containerHeight} class="absolute z-[10000] w-full bg-neutral-50">
				<!-- <div class="flex h-full w-full justify-center bg-neutral-50">
						<div class="w-full md:max-w-lg"> -->
				<Search
					{paneId}
					{containerHeight}
					showInput={true}
					{searchTerms}
					onClose={() => {
						showByBook = false;
						searchTerms = '';
					}}
					onFilterIndex={onFilterBookIndexes}
				></Search>
			</div>
			<!-- </div>
				</div> -->
		</div>
	{/if}

	{#if strongs.length > 1 || isVerseRef}
		<div class="flex flex-row items-center">
			<p class="pe-4 capitalize">definitions:</p>
			<button
				onclick={() => {
					toggleStrongs = !toggleStrongs;
				}}
				aria-label="toggle drop down"
			>
				<ChevronDown className="w-4 h-4" fill="fill-neutral-700"></ChevronDown>
			</button>
		</div>
		{#if toggleStrongs}
			{#each strongs as s, idx}
				{@render header(s, idx)}
				{#if s.toggle}
					{@render strongsHtml(s, idx)}
				{/if}
			{/each}
		{/if}
	{:else if strongs.length > 0}
		{@render header(strongs[0], 0)}
		{@render strongsHtml(strongs[0], 0)}
	{/if}
</div>

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
