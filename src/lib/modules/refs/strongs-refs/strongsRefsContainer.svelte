<script lang="ts">
	import ChevronDown from '$lib/components/chevronDown.svelte';
	import { bibleDB } from '$lib/db/bible.db';
	import { onMount } from 'svelte';

	let { isVerseRef, strongsRefs, strongsWords, text } = $props();

	let toggle = $state(false);

	let strongs: any[] | undefined = $state([]);
	onMount(async () => {
		if (strongsRefs) {
			strongsRefs.forEach(async (ref: string) => {
				let data = await bibleDB.getValue('strongs', ref.toLowerCase());
				if (data) {
					strongs.push(data);
				}
			});
		}
	});
</script>

{#snippet header(s, idx)}
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

{#snippet strongsHtml(s)}
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
			<h1 class="pt-4 font-bold text-neutral-600">Linguistic Elements:</h1>
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
	</div>
{/snippet}

<div class="pt-4">
	{#if strongs.length > 1 || isVerseRef}
		<div class="flex flex-row items-center">
			<p class="pe-4 capitalize">strong's:</p>
			<button
				onclick={() => {
					toggle = !toggle;
				}}
				aria-label="toggle drop down"
			>
				<ChevronDown className="w-4 h-4" fill="fill-neutral-700"></ChevronDown>
			</button>
		</div>
		{#if toggle}
			{#each strongs as s, idx}
				{@render header(s, idx)}
				{#if s.toggle}
					{@render strongsHtml(s)}
				{/if}
			{/each}
		{/if}
	{:else if strongs.length > 0}
		{@render header(strongs[0], 0)}
		{@render strongsHtml(strongs[0])}
	{/if}
</div>

<style>
</style>
