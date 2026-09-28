<script lang="ts">
	// COMPONENTS
	import KJVIconButton from '../buttons/KJVIconButton.svelte';

	// MODELS
	import type {
		HeaderActionDefinition
	} from './header-action.model';

	// RESOLVERS
	import {
		resolveHeaderIconComponent
	} from './header-icon-component-resolver';

	// =============================== BINDINGS ================================

	let {
		action
	}: {
		action: HeaderActionDefinition;
	} = $props();

	// ================================= VARS ==================================

	let IconComponent = $derived(
		resolveHeaderIconComponent(action.icon)
	);
</script>

<KJVIconButton
	label={action.label}
	onClick={action.onClick}
	disabled={action.disabled ?? false}
	variant="quiet"
>
	<IconComponent
		classes={`h-[1.25em] w-[1.25em] ${action.selected ? 'text-primary-500' : ''}`}
	></IconComponent>
</KJVIconButton>
