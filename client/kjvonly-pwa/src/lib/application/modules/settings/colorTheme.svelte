<script lang="ts">
	import type { Settings } from '$lib/application/models/settings.model';

	// =============================== BINDINGS ================================

	let { settings = $bindable<Settings>() } = $props();

	// ================================== VARS =================================

	let colorThemes = [
		{
			name: 'NIGHT',
			colorTheme: 'night'
		},
		{
			name: 'NIGHT COLORBLIND',
			colorTheme: 'night-colorblind'
		},
		{
			name: 'RED',
			colorTheme: 'red'
		},
		{
			name: 'LIGHT BLUE',
			colorTheme: 'light-blue'
		},
		{
			name: 'PURPLE',
			colorTheme: 'purple'
		},
		{
			name: 'CYAN',
			colorTheme: 'cyan'
		},
		{
			name: 'PINK',
			colorTheme: 'pink'
		}
	];

	// ============================== CLICK FUNCS ==============================

	function onColorThemeSelected(colorTheme: string) {
		settings.colorTheme = colorTheme;
	}
</script>

<div class="ps-4">Color Themes</div>
<div class="flex flex-wrap gap-2 p-4">
	{#each colorThemes as ct}
		<button
			class="{ct.colorTheme === settings.colorTheme
				? 'bg-primary-500 text-neutral-50'
				: ''} border border-1 border-neutral-400 px-3 py-2"
			onclick={() => onColorThemeSelected(ct.colorTheme)}
		>
			{ct.name}
		</button>
	{/each}
</div>
<div class="flex justify-center gap-4 px-4 pb-4">
	<button aria-label="color-a" class="bg-highlighta h-8 w-8 rounded-full"></button>
	<button aria-label="color-b" class="bg-highlightb h-8 w-8 rounded-full"></button>
	<button aria-label="color-c" class="bg-highlightc h-8 w-8 rounded-full"></button>
	<button aria-label="color-d" class="bg-highlightd h-8 w-8 rounded-full"></button>
	<button aria-label="color-e" class="bg-highlighte h-8 w-8 rounded-full"></button>
</div>
