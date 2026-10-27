<script lang="ts">
	let {
		kind = 'status',
		message,
		retryLabel = 'Retry',
		onRetry,
		inset = true
	}: {
		kind?: 'status' | 'failure';
		message: string;
		retryLabel?: string;
		onRetry?: () => void;
		inset?: boolean;
	} = $props();
</script>

{#if kind === 'failure'}
	<div class="flex flex-col gap-4 py-4 {inset ? 'px-4' : ''}" role="alert">
		<div class="text-base">{message}</div>
		{#if onRetry}
			<button
				type="button"
				class="min-h-[44px] self-start rounded-lg bg-primary-500 px-4 text-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
				onclick={onRetry}
			>
				{retryLabel}
			</button>
		{/if}
	</div>
{:else}
	<div class="py-4 text-sm text-neutral-500 {inset ? 'px-4' : ''}" role="status" aria-live="polite">
		{message}
	</div>
{/if}
