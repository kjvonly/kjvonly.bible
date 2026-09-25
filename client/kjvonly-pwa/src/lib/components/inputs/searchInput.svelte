<script lang="ts">
	// COMPONENTS
	import Close from '../svgs/close.svelte';
	import Search from '../svgs/search.svelte';

	// =============================== BINDINGS ================================

	let {
		value,
		placeholder = 'Search',
		label,
		focusOnMount = false,
		onInput
	}: {
		value: string;
		placeholder?: string;
		label?: string;
		focusOnMount?: boolean;
		onInput: (value: string) => void;
	} = $props();

	// ================================ FUNCS ==================================

	function focusInput(node: HTMLInputElement): void {
		if (focusOnMount) {
			node.focus();
		}
	}

	function handleInput(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;
		onInput(input.value);
	}

	function handleClear(): void {
		onInput('');
	}
</script>

<div class="w-full px-4 py-3">
	<div
		class="flex min-h-[44px] items-center gap-2 rounded-lg bg-neutral-100 px-3 text-neutral-700 focus-within:ring-2 focus-within:ring-primary-500"
	>
		<span class="flex h-11 w-11 shrink-0 items-center justify-center">
			<Search classes="h-5 w-5 text-neutral-500"></Search>
		</span>
		<input
			use:focusInput
			type="search"
			{placeholder}
			aria-label={label ?? placeholder}
			value={value}
			oninput={handleInput}
			class="search-input min-w-0 flex-1 border-none bg-transparent p-0 text-neutral-700 outline-none placeholder:text-neutral-500 focus:outline-none focus:ring-0"
		/>
		<button
			type="button"
			aria-label="Clear search"
			disabled={value.length === 0}
			onclick={handleClear}
			class:invisible={value.length === 0}
			class="flex h-11 w-11 shrink-0 items-center justify-center text-support-a-500"
		>
			<Close classes="h-5 w-5"></Close>
		</button>
	</div>
</div>

<style>
	.search-input::-webkit-search-cancel-button {
		appearance: none;
		-webkit-appearance: none;
	}
</style>
