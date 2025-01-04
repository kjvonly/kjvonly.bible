<script lang="ts">
	import { base } from '$app/paths';
	import BookChapterPopup from './bookChapterPopup.svelte';

	let { chapterKey = $bindable(), bookName = $bindable(), bookChapter = $bindable() } = $props();

	let showBookChapterPopup: Boolean = $state(false);
	function onBookChapterClick() {
		showBookChapterPopup = !showBookChapterPopup;
	}
</script>

<div class="flex-column sticky top-0 w-[100%] bg-white">
	<div class="pt-5">
		<h1 class="text-3xl font-bold">KJVonly</h1>
	</div>
	<div class="justify-items-center pt-11">
		<div class=" text-base">
			<button onclick={onBookChapterClick}>
				<div class="my-2 border-b-2 hover:bg-gray-300/75">
					<span class="mr-56 ps-2 text-sm">{bookName} {bookChapter}</span>
					<span
						><img
							class="mr-2 inline-block w-3"
							src={`${base}/icons/chevron-down.svg`}
							alt="chevron-down"
						/></span
					>
				</div>
			</button>

			<div
				class="absolute {showBookChapterPopup
					? ''
					: 'hidden'} left-0 right-0 mx-auto h-[70vh] w-[90vw] bg-white shadow-lg md:w-1/2 md:max-w-screen-sm"
			>
				<BookChapterPopup bind:showBookChapterPopup bind:chapterKey></BookChapterPopup>
			</div>
		</div>
	</div>
	<span class="fixed w-full	 left-0 border-b-2 border-gray-500"></span>
</div>

<style>
</style>
