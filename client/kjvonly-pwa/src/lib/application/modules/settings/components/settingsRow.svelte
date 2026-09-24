<script lang="ts">
	// COMPONENTS
	import KeyboardArrowRight from '$lib/components/svgs/keyboardArrowRight.svelte';
	import Toggle from '$lib/components/toggle.svelte';
	import SettingsIcon from './settingsIcon.svelte';

	// MODELS
	import type {
		SettingsRowDefinition,
		SettingsToggleRowDefinition
	} from '../models/settings-definition.model';

	// RUNTIME
	import { useSettingsContext } from '../runtime/settings-context';
	import { useSettingsNavigationContext } from '../runtime/settings-navigation-context';

	// RESOLVERS
	import { formatSettingsValue } from '../resolvers/settings-value-formatter';

	// =============================== BINDINGS ================================

	let {
		row
	}: {
		row: SettingsRowDefinition;
	} = $props();

	// ================================= VARS ==================================

	let settingsContext = useSettingsContext();
	let settingsNavigation = useSettingsNavigationContext();

	// ================================ FUNCS ==================================

	function onToggleChange(
		row: SettingsToggleRowDefinition,
		event: Event
	): void {
		const input = event.currentTarget as HTMLInputElement;
		settingsContext.update(
			row.setting,
			input.checked
		);
	}

	function getSecondaryText(
		row: SettingsRowDefinition
	): string | undefined {
		if (typeof row.secondary === 'string') {
			return row.secondary;
		}

		if (row.secondary) {
			const value = settingsContext.settings[row.secondary.setting];

			return row.secondary.formatter
				? formatSettingsValue(row.secondary.formatter, value)
				: String(value);
		}

		if (row.type === 'select') {
			const currentValue = settingsContext.settings[row.setting];
			return row.options.find(
				(option) => option.value === currentValue
			)?.label;
		}

		return undefined;
	}
</script>

{#if row.type === 'toggle'}
	<div class="flex w-full items-center gap-3 bg-neutral-50 px-4 py-3 text-neutral-700">
		{#if row.icon}
			<SettingsIcon icon={row.icon}></SettingsIcon>
		{/if}

		<span class="min-w-0 flex-1">
			<span class="block font-medium">{row.title}</span>
			{#if getSecondaryText(row)}
				<span class="block text-sm text-neutral-500">{getSecondaryText(row)}</span>
			{/if}
		</span>

		<Toggle
			isToggled={settingsContext.settings[row.setting]}
			onChange={(event) => onToggleChange(row, event)}
		></Toggle>
	</div>
{:else}
	<button
		type="button"
		onclick={() => settingsNavigation.navigate(row)}
		class="flex w-full items-center gap-3 bg-neutral-50 px-4 py-3 text-start text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
	>
		{#if row.icon}
			<SettingsIcon icon={row.icon}></SettingsIcon>
		{/if}

		<span class="min-w-0 flex-1">
			<span class="block font-medium">{row.title}</span>
			{#if getSecondaryText(row)}
				<span class="block text-sm text-neutral-500">{getSecondaryText(row)}</span>
			{/if}
		</span>

		<KeyboardArrowRight classes="h-6 w-6 shrink-0 text-neutral-500"></KeyboardArrowRight>
	</button>
{/if}
