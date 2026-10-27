<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';

	type KJVCardProps = {
		header?: Snippet;
		body?: Snippet;
		actions?: Snippet;
	} & (
		| {
			onClick: MouseEventHandler<HTMLButtonElement>;
			label: string;
		}
		| {
			onClick?: undefined;
			label?: undefined;
		}
	);

	let {
		header = undefined,
		body = undefined,
		actions = undefined,
		onClick = undefined,
		label = undefined
	}: KJVCardProps = $props();
</script>

<article
	class="w-full overflow-hidden rounded-lg bg-neutral-50 outline outline-neutral-300"
>
	{#if onClick}
		<button
			type="button"
			onclick={onClick}
			aria-label={label}
			class="block w-full p-4 text-left transition-colors duration-150 hover:bg-neutral-100 active:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-primary-500"
		>
			<div class="flex min-w-0 flex-col gap-2">
				{#if header}
					<div class="min-w-0">
						{@render header()}
					</div>
				{/if}

				{#if body}
					<div class="min-w-0">
						{@render body()}
					</div>
				{/if}
			</div>
		</button>
	{:else}
		<div class="flex min-w-0 flex-col gap-2 p-4">
			{#if header}
				<div class="min-w-0">
					{@render header()}
				</div>
			{/if}

			{#if body}
				<div class="min-w-0">
					{@render body()}
				</div>
			{/if}
		</div>
	{/if}

	{#if actions}
		<div class="flex min-w-0 items-start gap-3 px-4 pb-4 pt-2">
			{@render actions()}
		</div>
	{/if}
</article>
