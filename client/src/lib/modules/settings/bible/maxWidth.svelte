<script lang="ts">
	import type { Settings } from '$lib/models/settings.model';

	let { settings = $bindable<Settings>() } = $props();

	let enableMaxWidth = $state(settings?.enableMaxWidth);

	$effect(() => {
		settings;
		enableMaxWidth = settings?.enableMaxWidth;
	});

	function toggleEnableMaxWidth() {
		settings.enableMaxWidth = enableMaxWidth;
	}
</script>

<div class="my-auto flex flex-row p-2">
	<label
		for="enableMaxWidth"
		class="has-checked:bg-primary-500 relative block h-8 max-w-14 min-w-14 rounded-full bg-neutral-300 transition-colors [-webkit-tap-highlight-color:_transparent] hover:cursor-pointer"
	>
		<input
			bind:checked={enableMaxWidth}
			onchange={toggleEnableMaxWidth}
			type="checkbox"
			id="enableMaxWidth"
			class="peer sr-only"
		/>

		<span
			class="absolute inset-y-0 start-0 m-1 size-6 rounded-full bg-neutral-100 transition-[inset-inline-start] peer-checked:start-6"
		></span>
	</label>
	<span class="my-auto ms-2 text-center">enable max width</span>
</div>
