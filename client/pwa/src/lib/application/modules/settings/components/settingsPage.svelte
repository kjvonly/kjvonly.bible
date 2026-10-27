<script lang="ts">
	// COMPONENTS
	import SettingsSection from './settingsSection.svelte';

	// MODELS
	import type {
		SettingsPageDefinition,
		SettingsRowID
	} from '../models/settings-definition.model';

	// =============================== BINDINGS ================================

	let {
		page,
		focusRowID
	}: {
		page: SettingsPageDefinition;
		focusRowID?: SettingsRowID;
	} = $props();

	// ================================= VARS ==================================

	let pageElement = $state<HTMLDivElement>();
	let pulseRowID = $state<SettingsRowID>();
	let lastFocusedRowID: SettingsRowID | undefined;

	// =============================== EFFECTS =================================

	$effect(() => {
		const rowID = focusRowID;
		const container = pageElement;

		if (!rowID || !container || rowID === lastFocusedRowID) {
			return;
		}

		const rowElement = Array.from(
			container.querySelectorAll<HTMLElement>('[data-settings-row-id]')
		).find((element) => element.dataset.settingsRowId === rowID);

		if (!rowElement) {
			return;
		}

		lastFocusedRowID = rowID;
		const prefersReducedMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)'
		).matches;

		rowElement.scrollIntoView({
			behavior: prefersReducedMotion ? 'auto' : 'smooth',
			block: 'center'
		});

		pulseRowID = rowID;
		const timeoutID = window.setTimeout(() => {
			pulseRowID = undefined;
		}, 1600);

		return () => window.clearTimeout(timeoutID);
	});
</script>

<div bind:this={pageElement} class="flex w-full flex-col">
	{#each page.sections as section (section.id)}
		<SettingsSection {section} {pulseRowID}></SettingsSection>
	{/each}
</div>
