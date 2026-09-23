<script lang="ts">
	import type { Settings } from '$lib/application/models/settings.model';
	import Paragraphs from './paragraphs.svelte';
	import Pericopes from './pericopes.svelte';
	import BibleVersion from './bibleVersion.svelte';
	import MaxWidth from './maxWidth.svelte';

	let { settings = $bindable<Settings>() } = $props();
</script>

<div class="ps-4">Bible Settings</div>
<div class="flex flex-wrap gap-2 p-4">
	<Paragraphs bind:settings></Paragraphs>
	<Pericopes bind:settings></Pericopes>
	<BibleVersion bind:settings></BibleVersion>
	<MaxWidth bind:settings></MaxWidth>
</div>
