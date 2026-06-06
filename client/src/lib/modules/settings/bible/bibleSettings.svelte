<script lang="ts">
	import type { Settings } from '$lib/models/settings.model';
	import Paragraphs from './paragraphs.svelte';
	import Pericopes from './pericopes.svelte';
	import BibleVersion from './bibleVersion.svelte';
	import MaxWidth from './maxWidth.svelte';

	let { settings = $bindable<Settings>() } = $props();

	$effect(() => {
		settings;
	});
</script>

<div class="ps-4">Bible Settings</div>

<Paragraphs bind:settings></Paragraphs>

<Pericopes bind:settings></Pericopes>

<BibleVersion bind:settings></BibleVersion>

<MaxWidth bind:settings></MaxWidth>
