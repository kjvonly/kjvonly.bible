<script lang="ts">
	import { bibleDB } from '$lib/db/bible.db';
	import { onMount } from 'svelte';
	import Verse from './verse.svelte';
	import { chapterService } from '$lib/api/chapters.service';
	let showChapter: boolean = $state(true);
	let fadeClass: string = $state('');
	let timeoutIDs: number[] = [];
	let loadedBookName = $state();
	let loadedChapter = $state();
	let firstLoad = true;

	let {
		chapterKey = $bindable(),
		bookName = $bindable(),
		bookChapter = $bindable(),
		doChapterFadeAnimation = $bindable()
	} = $props();

	$effect(() => {
		if (chapterKey) {
			if (doChapterFadeAnimation) {
				if (firstLoad) {
					firstLoad = false;
					loadChapter();
					return;
				}

				chapterService.getChapter(chapterKey).then((data) => {
					bookName = data['bookName'];
					bookChapter = data['number'];
				});
				timeoutIDs.forEach((id, idx) => {
					//showChapter = false;
					clearTimeout(id);
				});

				fadeClass = 'fade-out';
				let id = setTimeout(() => {
					showChapter = false;
				}, 900);

				let id2 = setTimeout(() => {
					loadChapter();
					fadeClass = 'fade-in';
					showChapter = true;
					timeoutIDs = [];
				}, 2200);

				timeoutIDs.push(id2);
			} else {
				showChapter = false;
				setTimeout(() => {
					showChapter = true;
				}, 100);
				loadChapter();
			}
		}
	});

	let verses: any = $state();
	let keys: string[] = $state([]);

	async function loadChapter() {
		let data = await chapterService.getChapter(chapterKey);
		bookName = data['bookName'];
		bookChapter = data['number'];
		loadedBookName = bookName;
		loadedChapter = bookChapter;
		verses = data['verses'];
		keys = Object.keys(verses).sort((a, b) => (Number(a) < Number(b) ? -1 : 1));
	}

	onMount(async () => {});
</script>

<div class="{fadeClass} flex-col leading-loose">
	{#if showChapter}
		{#if loadedBookName && loadedChapter}
			<h1 class="text-center font-bold">{loadedBookName} {loadedChapter}</h1>
		{/if}
		{#each keys as k}
			<Verse verse={verses[k]}></Verse>
		{/each}
	{/if}
</div>

<style>
	.fade-in {
		animation: fadeIn 0.5s ease-in-out;
	}

	.fade-out {
		animation: fadeOut 1s ease-in-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes fadeOut {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}
</style>
