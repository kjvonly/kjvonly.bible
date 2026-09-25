<script lang="ts">
	// COMPONENTS
	import KJVButton from '../buttons/KJVButton.svelte';

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

<KJVButton
	classes="flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-full bg-transparent text-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
	onClick={action.onClick}
	disabled={action.disabled ?? false}
>
	<IconComponent classes="h-[1.25em] w-[1.25em]"></IconComponent>
	<span class="sr-only">{action.label}</span>
</KJVButton>
