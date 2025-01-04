<script lang="ts">
	import { bibleDB } from '$lib/db/bible.db';
	import { onMount } from 'svelte';
	import Verse from './verse.svelte';
	import { chapterService } from '$lib/api/chapters.service';

	let { chapterKey = $bindable(), bookName = $bindable(), bookChapter = $bindable() } = $props();

	$effect(() => {
		if (chapterKey) {
			loadChapter();
		}
	});

	let verses: any = $state();
	let keys: string[] = $state([]);

	async function loadChapter() {
		let data = await chapterService.getChapter(chapterKey)
		bookName = data['bookName'];
		bookChapter = data['number'];
		verses = data['verses'];
		keys = Object.keys(verses).sort((a, b) => (Number(a) < Number(b) ? -1 : 1));
	}

	onMount(async () => {});
</script>


<div class="flex-col leading-loose">
	{#if bookChapter && bookName}
		<h1 class="text-center font-bold">{bookName} {bookChapter}</h1>
	{/if}
	{#each keys as k}
		<Verse verse={verses[k]}></Verse>
	{/each}
</div>

<style>

</style>
