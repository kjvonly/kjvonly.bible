<script lang="ts">
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import Save from '$lib/components/svgs/save.svelte';
	import type { Settings } from '$lib/models/settings.model';

	// =============================== BINDINGS ================================

	let { settings = $bindable<Settings>() } = $props();

	// ================================== VARS =================================

	let fontSize = $state(12);

	// =============================== LIFECYCLE ===============================

	$effect(() => {
		settings;
		updateFontSize();
	});

	// ================================ FUNCS ==================================

	function updateFontSize(): void {
		let fs = parseInt(settings?.fontSize);

		if (fs) {
			fontSize = fs;
		}
	}

	// ============================== CLICK FUNCS ==============================

	function onSizeSelected() {
		settings.fontSize = fontSize;
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
