<!-- Select one initial to browse without loading definitions. -->
<script lang="ts">
	type Props = {
		/** Canonical lowercase initial; owned by the Dictionary root view. */
		selected: string;
		/** Notify the root view of a newly selected initial. */
		onSelect: (letter: string) => void;
	};

	let { selected, onSelect }: Props = $props();
	const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
</script>

<div role="group" aria-label="Browse headwords by initial letter" class="flex flex-wrap gap-1">
	{#each letters as letter (letter)}
		<button
			type="button"
			aria-label={`Browse ${letter} headwords`}
			aria-pressed={selected === letter.toLowerCase()}
			class={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-base hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary-500 ${selected === letter.toLowerCase() ? 'text-support-a-500 underline decoration-support-a-500 underline-offset-4' : 'text-neutral-700'}`}
			onclick={() => onSelect(letter.toLowerCase())}
		>{letter}</button>
	{/each}
</div>
