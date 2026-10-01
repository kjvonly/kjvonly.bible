<script lang="ts" generics="TAction extends string">
	import type {
		Snippet
	} from 'svelte';

	// APPLICATION
	import {
		ViewBody,
		ViewHeader
	} from '$lib/application/ui';

	// COMPONENTS
	import {
		KJVHeader,
		type HeaderActions
	} from '../header';

	// MODELS
	import type {
		KJVMenuAction
	} from './kjv-menu.model';

	// =============================== BINDINGS ================================

	let {
		title = 'Menu',
		clientHeight,
		actions,
		headerActions = [],
		leadingContent,
		onAction
	}: {
		title?: string;
		clientHeight: number;
		actions: readonly KJVMenuAction<TAction>[];
		headerActions?: HeaderActions;
		leadingContent: Snippet;
		onAction: (action: TAction) => void | Promise<void>;
	} = $props();

	// ================================= VARS ==================================

	let headerHeight = $state(0);
</script>

<!-- ================================ HEADER =============================== -->

<ViewHeader bind:headerHeight>
	<KJVHeader
		{title}
		{leadingContent}
		actions={headerActions}
	></KJVHeader>
</ViewHeader>

<!-- ================================= BODY ================================ -->

<ViewBody
	{clientHeight}
	{headerHeight}
	classes="remove-default-class"
>
	{#each actions as action (action.value)}
		<button
			type="button"
			disabled={action.disabled ?? false}
			onclick={() => void onAction(action.value)}
			class="min-h-[max(2.75rem,44px)] w-full bg-neutral-50 px-4 py-3 text-left text-base text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 active:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-primary-500 disabled:pointer-events-none disabled:opacity-50"
		>
			{action.label}
		</button>
	{/each}
</ViewBody>
