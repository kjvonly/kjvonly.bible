<script lang="ts">
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import Moon from '$lib/components/buttons/moon.svelte';
	import Sun from '$lib/components/buttons/sun.svelte';
	import DarkMode from '$lib/components/svgs/darkMode.svelte';
	import LightMode from '$lib/components/svgs/lightMode.svelte';
	import { type Settings } from '$lib/models/settings.model';

	let { settings = $bindable<Settings>() } = $props();

	function onLightModeClicked(e: Event): void {
		e.stopPropagation();
		settings.isDarkTheme = false;
	}

	function onDarkModeClicked() {
		settings.isDarkTheme = true;
	}
</script>

<div class="flex flex-row p-4">
	<KJVButton
		classes="{settings?.isDarkTheme === false
			? 'bg-primary-500 '
			: ' '} flex h-16 w-1/2 items-center justify-center outline outline-neutral-400"
		onClick={onLightModeClicked}
	>
		<LightMode
			classes={settings?.isDarkTheme === true
				? 'fill-neutral-700'
				: 'fill-neutral-100'}
		></LightMode>
	</KJVButton>

	<KJVButton
		classes="{settings?.isDarkTheme === true
			? 'bg-primary-500 '
			: ' '} flex h-16 w-1/2 items-center justify-center outline outline-neutral-400"
		onClick={onDarkModeClicked}
	>
		<DarkMode
			classes={settings?.isDarkTheme === true
				? 'fill-neutral-100'
				: 'fill-neutral-700'}
		></DarkMode>
	</KJVButton>
</div>
