<script lang="ts">
	// COMPONENTS
	import CheckCircle from '$lib/components/svgs/checkCircle.svelte';
	import SettingsScreen from './components/settingsScreen.svelte';

	// MODELS
	import type { Settings } from '../../models/settings.model';
	import type {
		SettingsOptionDefinition
	} from './models/settings-definition.model';

	// RESOLVERS
	import { requireSettingsSelectRow } from './resolvers/settings-definition-resolver';

	// RUNTIME
	import {
		useNavigationEntryContext
	} from '../../runtime/navigation/navigation-entry-context';
	import { useSettingsContext } from './runtime/settings-context';
	import { useSettingsNavigationContext } from './runtime/settings-navigation-context';

	// =============================== BINDINGS ================================

	let {
		clientHeight
	}: {
		clientHeight: number;
	} = $props();

	// ================================= VARS ==================================

	const settingsContext = useSettingsContext();
	const settingsNavigation = useSettingsNavigationContext();
	const {
		navigationState
	} = useNavigationEntryContext();

	let row = $derived.by(() => {
		const rowID = navigationState.state.rowID;

		if (typeof rowID !== 'string') {
			throw new Error('Settings choice navigation requires a rowID.');
		}

		return requireSettingsSelectRow(rowID);
	});

	// ================================ FUNCS ==================================

	function onBack(event: Event): void {
		event.stopPropagation();
		settingsNavigation.back();
	}

	function setSetting<K extends keyof Settings>(
		setting: K,
		value: Settings[K]
	): void {
		settingsContext.update(
			setting,
			value
		);
	}

	function onOptionSelect(
		option: SettingsOptionDefinition
	): void {
		setSetting(
			row.setting,
			option.value
		);
	}

	function isSelected(
		option: SettingsOptionDefinition
	): boolean {
		return settingsContext.settings[row.setting] === option.value;
	}
</script>

<!-- ============================== CONTAINER ============================== -->

<SettingsScreen title={row.title} {clientHeight} {onBack}>
	<div class="flex w-full flex-col">
		{#each row.options as option (option.id)}
			<button
				type="button"
				onclick={() => onOptionSelect(option)}
				class="group flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 {isSelected(option)
					? 'bg-primary-500 text-primary-surface'
					: 'bg-neutral-50 text-neutral-700'}"
			>
				<span class="min-w-0 flex-1">
					<span class="block font-medium">{option.label}</span>
					{#if option.secondary}
						<span class="block text-sm group-hover:text-neutral-500 {isSelected(option) ? 'text-primary-surface/80' : 'text-neutral-500'}">
							{option.secondary}
						</span>
					{/if}
				</span>

				{#if isSelected(option)}
					<CheckCircle classes="h-6 w-6 shrink-0"></CheckCircle>
				{/if}
			</button>
		{/each}
	</div>
</SettingsScreen>
