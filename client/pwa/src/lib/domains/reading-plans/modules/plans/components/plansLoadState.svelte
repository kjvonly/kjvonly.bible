<script lang="ts">
	import { KJVAsyncState } from '$lib/components';
	import type { PlansViewLoadState } from '../runtime/plans-view-load-state';

	let {
		state,
		onRetry,
		inset = true,
		subject
	}: {
		state: PlansViewLoadState;
		onRetry: () => void;
		inset?: boolean;
		subject: string;
	} = $props();
</script>

{#if state === 'initializing'}
	<KJVAsyncState message={`Initializing ${subject}…`} {inset}></KJVAsyncState>
{:else if state === 'loading'}
	<KJVAsyncState message={`Loading ${subject}…`} {inset}></KJVAsyncState>
{:else if state === 'failure'}
	<KJVAsyncState
		kind="failure"
		message={`Unable to load ${subject}.`}
		{onRetry}
		{inset}
	></KJVAsyncState>
{/if}
