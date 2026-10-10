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
		leadingContent = undefined,
		actions = [],
		trailingContent = undefined,
		titleAction = undefined,
		titleContent = undefined
	}: {
		title: string;
		leadingAction?: HeaderActionDefinition;
		leadingContent?: Snippet;
		actions?: HeaderActions;
		/** Caller-owned control rendered after direct header actions. */
		trailingContent?: Snippet;
		titleAction?: HeaderTitleActionDefinition;
		titleContent?: Snippet;
	} = $props();
</script>

<!--
	@component
	Shared application header. `leadingContent` and `trailingContent` let callers
	render richer standard controls such as Back and More Actions without moving
	navigation policy into the generic header component.
-->
<div class="flex min-h-[44px] w-full min-w-0 items-center gap-1">
	{#if leadingContent}
		{@render leadingContent()}
	{:else if leadingAction}
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

	{#if actions.length > 0 || trailingContent}
		<div class="flex shrink-0 items-center justify-end gap-1">
			{#each actions as action}
				<HeaderActionButton {action}></HeaderActionButton>
			{/each}

			{#if trailingContent}
				{@render trailingContent()}
			{/if}
		</div>
	{/if}
</div>
