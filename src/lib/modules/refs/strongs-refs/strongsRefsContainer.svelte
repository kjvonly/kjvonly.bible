<script lang="ts">
	import { bibleDB } from '$lib/db/bible.db';
	import { onMount } from 'svelte';

	let { strongsRefs, text } = $props();

	$effect(() => {});

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

<div class="px-4 pt-4">
	{#each strongs as s}
		<h1 class="pt-4 text-4xl">{s['number']}: {text}</h1>

		{#if s['strongsDef']}
			<div class="py-4">
				<h1 class="font-bold underline underline-offset-8">Strongs Definition</h1>
				<div class="py-4">
					{@html s['strongsDef']}
				</div>
			</div>
		{/if}

		<div class="">
			<h1 class="font-bold underline underline-offset-8">Linguistic Elements</h1>
			<div class="flex flex-shrink py-4">
				<div class="flex flex-col">
					{#if s['originalWord']}
						<p class="pt-6 font-semibold underline">Original Word</p>
						<p class="">{@html s['originalWord']}</p>
					{/if}

					{#if s['partsOfSpeech']}
						<p class="pt-6 font-semibold underline">Parts of Speech</p>
						<p class="">{@html s['partsOfSpeech']}</p>
					{/if}

					{#if s['phoneticSpelling']}
						<p class="pt-6 font-semibold underline">Phonetic Spelling</p>
						<p class="">{@html s['phoneticSpelling']}</p>
					{/if}

					{#if s['transliteratedWord']}
						<p class="pt-6 font-semibold underline">Transliterated Word</p>
						<p class="">{@html s['transliteratedWord']}</p>
					{/if}
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
</style>
