<script lang="ts">
	// COMPONENTS
	import SettingsRow from './settingsRow.svelte';

	// MODELS
	import type {
		SettingsRowID,
		SettingsSectionDefinition
	} from '../models/settings-definition.model';

	// =============================== BINDINGS ================================

	let {
		section,
		pulseRowID
	}: {
		section: SettingsSectionDefinition;
		pulseRowID?: SettingsRowID;
	} = $props();
</script>

<section class="w-full">
	{#if section.label}
		<div class="px-4 pb-2 pt-5 text-sm font-semibold text-primary-500">
			{section.label}
		</div>
	{/if}

	{#if section.description}
		<div class="px-4 pb-2 text-sm text-neutral-500">
			{section.description}
		</div>
	{/if}

	<div class="flex w-full flex-col">
		{#each section.rows as row (row.id)}
			<div
				data-settings-row-id={row.id}
				class="transition-shadow {pulseRowID === row.id
					? 'animate-pulse ring-2 ring-inset ring-primary-500 motion-reduce:animate-none'
					: ''}"
			>
				<SettingsRow {row}></SettingsRow>
			</div>
		{/each}
	</div>
</section>
