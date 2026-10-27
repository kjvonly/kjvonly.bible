<script lang="ts">
	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import Save from '$lib/components/svgs/save.svelte';

	// RUNTIME
	import { useSettingsContext } from './runtime/settings-context';

	// ================================= VARS ==================================

	let settingsContext = useSettingsContext();
	let fontSize = $state(12);

	// =============================== LIFECYCLE ===============================

	$effect(() => {
		fontSize = settingsContext.settings.fontSize;
	});

	// ============================== CLICK FUNCS ==============================

	function onSizeSelected(): void {
		settingsContext.update(
			'fontSize',
			fontSize
		);
	}
</script>

<div class="p-4">
	<div class="flex w-full flex-col">
		<p class="flex w-full items-center text-nowrap capitalize">font size</p>
		<div class="flex flex-row pt-4">
			<input
				bind:value={fontSize}
				class="flex w-full p-2 text-center outline outline-neutral-400"
				type="number"
			/>
			<KJVButton classes="ps-2" onClick={onSizeSelected}>
				<Save classes=""></Save>
			</KJVButton>
		</div>
	</div>
	<div class="mt-4 outline outline-neutral-400">
		<p class="p-4" style="font-size: {fontSize}px">
			Ephesians 2:8 <br />For by grace are ye saved through faith; and that not
			of yourselves: it is the gift of God:
		</p>
	</div>
</div>
