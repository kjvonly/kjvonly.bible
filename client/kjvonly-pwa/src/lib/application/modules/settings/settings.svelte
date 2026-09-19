<script lang="ts">
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import BufferBody from '$lib/application/runtime/buffer/components/bufferBody.svelte';
	import BufferContainer from '$lib/application/runtime/buffer/components/bufferContainer.svelte';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ColorTheme from './colorTheme.svelte';
	import FontFamilies from './fontFamilies.svelte';
	import FontSize from './fontSize.svelte';
	import FontWeights from './fontWeights.svelte';
	import LightDarkMode from './lightDarkMode.svelte';

	// MODELS
	import { newSettings, type Settings } from '$lib/application/models/settings.model';

	// SERVICES
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import Close from '$lib/components/svgs/close.svelte';
	import BibleSettings from './bible/bibleSettings.svelte';

	const { settingsService } = useApplicationContext();
	// =============================== BINDINGS ================================

	let { onClose } = $props();

	// ================================== VARS =================================

	let headerHeight = $state(0);
	let clientHeight = $state(0);
	let settings: Settings = $state(newSettings());
	let settingsLoaded = $state(false);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		setSettings();
		settingsLoaded = true;
	});

	$effect(() => {
		if (!settingsLoaded) {
			return;
		}

		settings;

		settingsService.updateSettings(settings);
	});

	// ================================ FUNCS ==================================

	function setSettings(): void {
		settings = settingsService.getSettings();
	}
</script>

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<span class="flex-1"></span>
	<span></span>

	<span class="text-center">Settings</span>

	<KJVButton classes="flex-1 flex justify-end" onClick={onClose}>
		<Close classes=""></Close>
	</KJVButton>
{/snippet}

<!-- ================================= BODY =============================+== -->

{#snippet body()}
	<LightDarkMode bind:settings></LightDarkMode>

	<ColorTheme bind:settings></ColorTheme>

	<FontSize bind:settings></FontSize>

	<FontFamilies bind:settings></FontFamilies>

	<FontWeights bind:settings></FontWeights>

	<BibleSettings bind:settings></BibleSettings>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		{@render header()}
	</BufferHeader>

	<BufferBody bind:headerHeight bind:clientHeight>
		{@render body()}
	</BufferBody>
</BufferContainer>
