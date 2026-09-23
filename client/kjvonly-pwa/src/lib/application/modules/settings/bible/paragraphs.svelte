<script lang="ts">
	import type { Settings } from '$lib/application/models/settings.model';

	let { settings = $bindable<Settings>() } = $props();
</script>

<button
	type="button"
	aria-pressed={settings.showParagraphs}
	class="{settings.showParagraphs
		? 'bg-primary-500 text-neutral-50'
		: ''} border border-1 border-neutral-400 px-3 py-2"
	onclick={() => (settings.showParagraphs = !settings.showParagraphs)}
>
	Show Paragraphs
</button>
