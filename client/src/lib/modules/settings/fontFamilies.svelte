<script lang="ts">
	import { type Settings } from '$lib/models/settings.model';

	// =============================== BINDINGS ================================

	let { settings = $bindable<Settings>() } = $props();

	// ================================== VARS =================================

	let fontFamilies = [
		{
			name: 'sans',
			fontFamily: 'sans'
		},
		{
			name: 'serif',
			fontFamily: 'serif'
		},
		{
			name: 'monospace',
			fontFamily: 'mono'
		},
		{
			name: 'KJV 1611',
			fontFamily: 'kjv'
		},
		{
			name: 'Roboto Mono',
			fontFamily: 'roboto-mono'
		},
		{
			name: 'JetBrains Mono',
			fontFamily: 'jetbrains-mono'
		}
	];

	// ============================== CLICK FUNCS ==============================

	function onFontFamilySelected(fontFamily: string) {
		settings.fontFamily = fontFamily;
	}
</script>

<div class="ps-4">Font Families</div>
<div class="grid grid-cols-3 gap-4 p-4">
	{#each fontFamilies as ff}
		<button
			class="font-{ff.fontFamily} {ff.fontFamily === settings?.fontFamily
				? 'bg-primary-500 text-neutral-50'
				: ''} border border-1 border-neutral-400 p-2"
			onclick={() => onFontFamilySelected(ff.fontFamily)}
		>
			{ff.name}
		</button>
	{/each}
</div>
