<script lang="ts">
	import type { Settings } from '$lib/models/settings.model';

	let { settings = $bindable<Settings>() } = $props();

	let showBibleVersion = $state(settings?.showBibleVersion);

	$effect(() => {
		settings;
		showBibleVersion = settings?.showBibleVersion;
	});
	function toggleShowBibleVersion() {
		settings.showBibleVersion = showBibleVersion;
	}
</script>

<div class="my-auto flex flex-row p-2">
	<label
		for="showBibleVersion"
		class="has-checked:bg-primary-500 relative block h-8 max-w-14 min-w-14 rounded-full bg-neutral-300 transition-colors [-webkit-tap-highlight-color:_transparent] hover:cursor-pointer"
	>
		<input
			bind:checked={showBibleVersion}
			onchange={toggleShowBibleVersion}
			type="checkbox"
			id="showBibleVersion"
			class="peer sr-only"
		/>

		<span
			class="absolute inset-y-0 start-0 m-1 size-6 rounded-full bg-neutral-100 transition-[inset-inline-start] peer-checked:start-6"
		></span>
	</label>
	<span class="my-auto ms-2 text-center">show bible version</span>
</div>
