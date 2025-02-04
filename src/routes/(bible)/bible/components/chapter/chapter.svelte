<script lang="ts">
	import { onMount } from 'svelte';
	import { chapterService } from '$lib/api/chapters.service';
	import Verse from './verse.svelte';
	import BookChapterPopup from '../../../components/bookChapterPopup.svelte';
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
		id = $bindable(),
		pane = $bindable(),
		doChapterFadeAnimation = $bindable()
	} = $props();

	$effect(() => {
		if (!chapterKey) {
			return;
		}

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
					window.scrollTo(0, 0);
					showChapter = true;
					timeoutIDs = [];
				}, 2200);

				timeoutIDs.push(id2);
			} else {
				let el = document.getElementById(id);
				el?.scrollTo(0, 0);
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
	let showBookChapterPopup: Boolean = $state(false);

	onMount(async () => {});
</script>

<div class="{fadeClass} flex-col leading-loose">
	<div>
		{#if showChapter}
			{#if loadedBookName && loadedChapter}
				<div class="sticky top-0 w-full justify-center flex">
					<BookChapterPopup
						bind:showBookChapterPopup
						bind:chapterKey
						bookName={loadedBookName}
						bookChapter={loadedChapter}
					></BookChapterPopup>
				</div>
			{/if}
			<p>
				{#each keys as k, idx}
					<span id={`${id}-vno-${idx + 1}`}>
						<Verse bind:pane verse={verses[k]}></Verse>
					</span>
				{/each}
			</p>
		{/if}
	</div>
</div>

<style>
	.scrolled-to {
		@apply animate-pulse;
	}

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
