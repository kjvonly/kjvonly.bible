<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';

	import KJVButton from './KJVButton.svelte';

	export type KJVIconButtonVariant = 'standard' | 'quiet';

	let {
		label,
		onClick,
		disabled = false,
		variant = 'standard',
		children
	}: {
		label: string;
		onClick: MouseEventHandler<HTMLButtonElement>;
		disabled?: boolean;
		variant?: KJVIconButtonVariant;
		children: Snippet;
	} = $props();

	const baseClasses =
		'flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-full text-neutral-700 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500';

	const variantClasses: Record<KJVIconButtonVariant, string> = {
		standard: 'bg-neutral-100 ring-2 ring-neutral-300 hover:bg-neutral-200 active:bg-neutral-200',
		quiet: 'bg-transparent hover:bg-neutral-100 active:bg-neutral-200'
	};

	let buttonClasses = $derived(`${baseClasses} ${variantClasses[variant]}`);
</script>

<KJVButton classes={buttonClasses} {onClick} {disabled}>
	{@render children?.()}
	<span class="sr-only">{label}</span>
</KJVButton>
