<script lang="ts">
	import type { Settings } from '$lib/application/models/settings.model';

	// =============================== BINDINGS ================================

	let { settings = $bindable<Settings>() } = $props();

	// ================================== VARS =================================

	let fontWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];

	// ============================== CLICK FUNCS ==============================

	function onFontWeightSelected(fontWeight: number) {
		settings.fontWeight = fontWeight;
	}
</script>

<div class="ps-4">Font Weights</div>
<div class="flex flex-wrap gap-2 p-4">
	{#each fontWeights as fw}
		<button
			style="font-weight: {fw}"
			class="{fw === settings.fontWeight
				? 'bg-primary-500 text-neutral-50'
				: ''} border border-1 border-neutral-400 px-3 py-2 hover:cursor-pointer"
			onclick={() => onFontWeightSelected(fw)}
		>
			{fw}
		</button>
	{/each}
</div>
