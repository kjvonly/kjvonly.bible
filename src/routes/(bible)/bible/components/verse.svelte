<script lang="ts">
	import Word from './word.svelte';

	let { verse } = $props();

	let words: string[] = [
		'16',
		'For',
		'God',
		'so',
		'loved',
		'the',
		'world,',
		'that',
		'he',
		'gave',
		'his',
		'only',
		'begotten',
		'Son,',
		'that',
		'whosoever',
		'believeth',
		'in',
		'him',
		'should',
		'not',
		'perish,',
		'but',
		'have',
		'everlasting',
		'life.'
	];
</script>

<p>
	{#each words as word}
		<Word {word}></Word>
	{/each}
</p>
