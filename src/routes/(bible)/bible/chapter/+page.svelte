<script lang="ts">
	import { bibleNavigationService } from '$lib/services/bible-navigation.service';
	import Header from '../../components/header.svelte';
	import Chapter from '../components/chapter.svelte';

	let chapterKey = $state('50_3');
	let bookName: string = $state('');
	let bookChapter: string = $state('');

	async function _nextChapter() {
		chapterKey = bibleNavigationService.next(chapterKey);
	}

	async function _previousChapter() {
		chapterKey = bibleNavigationService.previous(chapterKey);
	}
</script>

<Header bind:bookName bind:bookChapter bind:chapterKey></Header>

<div class="m-4 flex justify-center md:m-12">
	<div class="max-w-sm md:max-w-lg">
		<div class="flex flex-wrap justify-start">
			<Chapter bind:bookName bind:bookChapter bind:chapterKey></Chapter>
		</div>
	</div>
</div>

<div class="aboslute sticky bottom-28 flex flex-row px-4">
	<button
	onclick="{_previousChapter}"
		class="ring-offset-blue-20 h-12 w-12 rounded-full bg-white text-gray-500 ring-2 ring-slate-200 ring-offset-2"
		>{'<'}</button
	>
	<span class="flex-1"></span>
	<button
	onclick="{_nextChapter}"
		class="ring-offset-blue-20 h-12 w-12 rounded-full bg-white text-gray-500 ring-2 ring-slate-200 ring-offset-2"
		>{'>'}</button
	>
</div>
