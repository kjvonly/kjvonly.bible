<script lang="ts">
	import type { Settings } from '$lib/application/models/settings.model';

	let { settings = $bindable<Settings>() } = $props();
</script>

<button
	type="button"
	aria-pressed={settings.showBibleVersion}
	class="{settings.showBibleVersion
		? 'bg-primary-500 text-neutral-50'
		: ''} border border-1 border-neutral-400 px-3 py-2"
	onclick={() => (settings.showBibleVersion = !settings.showBibleVersion)}
>
	Show Bible Version
</button>
