<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { settingsService } from '$lib/services/settings.service';
	import uuid4 from 'uuid4';
	import type { Settings } from '$lib/models/settings.model';

	let { clientHeight = $bindable<number>(), children } = $props();

	let maxWidth: boolean | undefined = $state(undefined);

	let id = uuid4();

	onMount(() => {
		subscribeToSettings();
		onSettingsChange(settingsService.getSettings());
	});

	onDestroy(() => {
		unsubscribeToSettings();
	});

	function subscribeToSettings() {
		settingsService.subscribe(id, onSettingsChange);
	}

	function unsubscribeToSettings() {
		settingsService.unsubscribe(id);
	}

	function onSettingsChange(cs: Settings) {
		maxWidth = cs.enableMaxWidth;
	}
</script>

{#if maxWidth !== undefined}
	<div
		bind:clientHeight
		class="relative flex h-full w-full justify-center bg-neutral-50 outline outline-neutral-400"
	>
		<div
			class="w-full {maxWidth ? 'max-w-lg' : ''} outline outline-neutral-400"
		>
			{@render children?.()}
		</div>
	</div>
{/if}
