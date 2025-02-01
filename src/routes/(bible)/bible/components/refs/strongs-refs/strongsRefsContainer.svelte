<script lang="ts">
	import { bibleDB } from '$lib/db/bible.db';
	import { onMount } from 'svelte';

	let { strongsRef } = $props();

	let strongs: any | undefined = $state();
	onMount(() => {
		if (strongsRef) {
			bibleDB.getValue('strongs', strongsRef.toLowerCase()).then((data) => {
				strongs = data;
			});
		}
	});
</script>

{#if strongs}
	<div class="pt-4 px-4">
		<h1 class="pt-4 text-4xl">{strongs['number']}</h1>
		{#if strongs['strongsDef']}
			<div class="py-4">
				<h1 class="font-bold underline underline-offset-8">Strongs Definition</h1>
				<div class="py-4">
					{@html strongs['strongsDef']}
				</div>
			</div>
		{/if}

		<div class="">
			<h1 class="font-bold underline underline-offset-8">Linguistic Elements</h1>
			<div class="flex flex-shrink py-4">
				<div class="grid grid-cols-2 border">
					{#if strongs['originalWord']}
						<p class="border-2 p-4 text-center">Original Word</p>
						<p class="border-2 p-4 text-center">{@html strongs['originalWord']}</p>
					{/if}

					{#if strongs['partsOfSpeech']}
						<p class="border-2 p-4 text-center">Parts of Speech</p>
						<p class="border-2 p-4 text-center">{@html strongs['partsOfSpeech']}</p>
					{/if}

					{#if strongs['phoneticSpelling']}
						<p class="border-2 p-4 text-center">Phonetic Spelling</p>
						<p class="border-2 p-4 text-center">{@html strongs['phoneticSpelling']}</p>
					{/if}

					{#if strongs['transliteratedWord']}
						<p class="border-2 p-4 text-center">Transliterated Word</p>
						<p class="border-2 p-4 text-center">{@html strongs['transliteratedWord']}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
</style>
