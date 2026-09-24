<script lang="ts">
	// MODELS
	import type { SettingsIconDefinition } from '../models/settings-definition.model';

	// RESOLVERS
	import {
	resolveSettingsIconAccentClass,
	resolveSettingsIconComponent
} from '../resolvers/settings-icon-component-resolver';

	// =============================== BINDINGS ================================

	let {
		icon
	}: {
		icon: SettingsIconDefinition;
	} = $props();

	// ================================= VARS ==================================

	let IconComponent = $derived(
		resolveSettingsIconComponent(icon.name)
	);
	let accentClass = $derived(
		resolveSettingsIconAccentClass(icon.accent)
	);
</script>

<span class="flex h-8 w-8 shrink-0 items-center justify-center {accentClass}">
	<IconComponent classes="h-6 w-6"></IconComponent>
</span>
