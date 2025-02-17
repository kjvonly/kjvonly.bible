<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { chapterService } from '$lib/api/chapters.service';
	import Verse from './verse.svelte';

	let showChapter: boolean = $state(true);
	let fadeClass: string = $state('');

	let loadedBookName = $state();
	let loadedChapter = $state();
	let footnotes: any = $state();

	let {
		chapterKey = $bindable(),
		bookName = $bindable(),
		bookChapter = $bindable(),
		id = $bindable(),
		pane = $bindable(),
		mode = $bindable(),
		annotations = $bindable(),
		notes = $bindable(),
		lastKnownScrollPosition
	} = $props();

	$effect(() => {
		if (!chapterKey) {
			return;
		}

		mode.value = ''

		let bcv = chapterKey.split('_');
		if (bcv.length === 3) {
			chapterKey = `${bcv[0]}_${bcv[1]}`;
			setTimeout(() => {
				let e = document.getElementById(`${id}-vno-${bcv[2]}`);
				e?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
				e?.classList.add('scrolled-to');
				setTimeout(() => {
					e?.classList.remove('scrolled-to');
				}, 4000);
			}, 250);
		}

		if (chapterKey) {
			let el = document.getElementById(id);
			el?.scrollTo(0, 0);
			annotations = {};
			loadAnnotations();
			loadNotes();
			loadChapter();
		}
	});


	let verses: any = $state();
	let keys: string[] = $state([]);

	async function loadAnnotations() {
		annotations = await chapterService.getAnnotations(chapterKey);
	}

	async function loadNotes() {
		notes = await chapterService.getNotes(chapterKey);
	}

	async function loadChapter() {
		let data = await chapterService.getChapter(chapterKey);
		bookName = data['bookName'];
		bookChapter = data['number'];
		loadedBookName = bookName;
		loadedChapter = bookChapter;
		verses = data['verses'];
		footnotes = data['footnotes'];
		keys = Object.keys(verses).sort((a, b) => (Number(a) < Number(b) ? -1 : 1));
	}

	onMount(async () => {});
</script>

<div class="{fadeClass} flex-col leading-loose">
	{#if showChapter}
		<p class="px-4">
			{#each keys as k, idx}
				<!-- w-full required for safari. -->
				<span class="whitespace-normal" id={`${id}-vno-${idx + 1}`}>
					<Verse
						bind:pane
						bind:annotations
						bind:notes
						bind:mode
						verse={verses[k]}
						{footnotes}
						{chapterKey}
						{lastKnownScrollPosition}
					></Verse>
				</span>
			{/each}
		</p>
		<div class="mt-16"></div>

		{#if mode.value !== ''}
			<div class="mt-32"></div>
		{/if}
	{/if}
</div>

<style>
	.scrolled-to {
		@apply animate-pulse;
	}
</style>
