<script lang="ts">
	import Header from '../../components/header.svelte';
	import Chapter from '../components/chapter.svelte';

	let chapterKey = $state('50_3');
	let bookName: string = $state('');
	let bookChapter: string = $state('');


</script>

<Header bind:bookName bind:bookChapter bind:chapterKey></Header>
<div class="m-12 flex justify-center">
	<div class="max-w-sm md:max-w-lg">
		<div class="flex flex-wrap justify-start">
			<Chapter bind:bookName bind:bookChapter bind:chapterKey></Chapter>
		</div>
	</div>
</div>
