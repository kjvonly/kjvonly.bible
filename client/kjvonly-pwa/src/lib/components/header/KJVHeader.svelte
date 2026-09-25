<script lang="ts">
	import type { Snippet } from 'svelte';

	// COMPONENTS
	import HeaderActionButton from './HeaderActionButton.svelte';

	// MODELS
	import type {
		HeaderActionDefinition,
		HeaderActions,
		HeaderTitleActionDefinition
	} from './header-action.model';

	// =============================== BINDINGS ================================

	let {
		title,
		leadingAction = undefined,
		actions = [],
		titleAction = undefined,
		titleContent = undefined
	}: {
		title: string;
		leadingAction?: HeaderActionDefinition;
		actions?: HeaderActions;
		titleAction?: HeaderTitleActionDefinition;
		titleContent?: Snippet;
	} = $props();
</script>

<div class="flex min-h-[44px] w-full min-w-0 items-center gap-1">
	{#if leadingAction}
		<HeaderActionButton action={leadingAction}></HeaderActionButton>
	{/if}

	<div class="min-w-0 flex-1">
		{#if titleAction}
			<button
				type="button"
				aria-label={titleAction.label}
				onclick={titleAction.onClick}
				class="flex min-h-[44px] w-full min-w-0 items-center bg-transparent text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
			>
				{#if titleContent}
					{@render titleContent()}
				{:else}
					<span class="block truncate text-base whitespace-nowrap">
						{title}
					</span>
				{/if}
			</button>
		{:else if titleContent}
			{@render titleContent()}
		{:else}
			<span class="block truncate text-base whitespace-nowrap">
				{title}
			</span>
		{/if}
	</div>

	{#if actions.length > 0}
		<div class="flex shrink-0 items-center justify-end gap-1">
			{#each actions as action}
				<HeaderActionButton {action}></HeaderActionButton>
			{/each}
		</div>
	{/if}
</div>
