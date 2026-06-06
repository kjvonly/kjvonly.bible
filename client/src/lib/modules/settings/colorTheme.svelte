<script lang="ts">
	import { type Settings } from '$lib/models/settings.model';

	let { settings = $bindable<Settings>() } = $props();
</script>

<div class="flex w-full flex-col bg-neutral-50 p-4 font-bold">
	{#if settings?.colorTheme}
		<select
			name="HeadlineAct"
			id="HeadlineAct"
			class="bg-primary-500 w-full flex-1 rounded-lg p-4 font-bold text-neutral-50 uppercase"
			bind:value={settings.colorTheme}
			onchange={() => {
				settings = settings;
			}}
		>
			<option value="red">RED</option>
			<option value="light-blue">LIGHT BLUE</option>
			<option value="purple">PURPLE</option>
			<option value="cyan">CYAN</option>
			<option value="pink">PINK</option>
		</select>
	{/if}
	<div class="felx w-full pt-2">
		<div class="flex justify-center space-x-4">
			<button aria-label="color-a" class="bg-highlighta h-8 w-8 rounded-full"
			></button>
			<button aria-label="color-b" class="bg-highlightb h-8 w-8 rounded-full"
			></button>
			<button aria-label="color-c" class="bg-highlightc h-8 w-8 rounded-full"
			></button>
			<button aria-label="color-d" class="bg-highlightd h-8 w-8 rounded-full"
			></button>
			<button aria-label="color-e" class="bg-highlighte h-8 w-8 rounded-full"
			></button>
		</div>
	</div>
</div>
