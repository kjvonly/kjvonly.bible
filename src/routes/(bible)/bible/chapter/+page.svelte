<script lang="ts">
	import Header from '../../components/header.svelte';
	import Chapter from '../components/chapter.svelte';

	let chapterKey = $state('50_3');
	let bookName: string = $state('');
	let bookChapter: string = $state('');
</script>

<Header bind:bookName bind:bookChapter bind:chapterKey></Header>

<div class="md:m-12 m-4 flex justify-center">
	<div class="max-w-sm md:max-w-lg">
		<div class="flex flex-wrap justify-start">
			<Chapter bind:bookName bind:bookChapter bind:chapterKey></Chapter>
		</div>
	</div>
</div>

<div class="sticky aboslute bottom-28 flex flex-row px-4">
	<button class="ring-offset-blue-20 h-12 w-12 rounded-full ring-2 ring-slate-200 ring-offset-2 text-gray-500 bg-white"
		>{'<'}</button
	>
	<span class="flex-1"></span>
	<button class="ring-offset-blue-20 h-12 w-12 rounded-full ring-2 ring-slate-200 ring-offset-2 text-gray-500 bg-white"
		>{'>'}</button
	>
</div>
