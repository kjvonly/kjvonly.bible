<script lang="ts">
	import type { AccountRelay } from '$lib/application/services/account/account-state';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import AddCircle from '$lib/components/svgs/addCircle.svelte';
	import Delete from '$lib/components/svgs/delete.svelte';

	let {
		relays = $bindable<readonly AccountRelay[]>([])
	}: {
		relays: readonly AccountRelay[];
	} = $props();

	function updateRelay(index: number, update: Partial<AccountRelay>): void {
		relays = relays.map((relay, relayIndex) =>
			relayIndex === index
				? {
						...relay,
						...update
					}
				: relay
		);
	}

	function onRelayUrlInput(index: number, event: Event): void {
		updateRelay(index, {
			url: (event.currentTarget as HTMLInputElement).value
		});
	}

	function onRelayReadChange(index: number, event: Event): void {
		updateRelay(index, {
			read: (event.currentTarget as HTMLInputElement).checked
		});
	}

	function onRelayWriteChange(index: number, event: Event): void {
		updateRelay(index, {
			write: (event.currentTarget as HTMLInputElement).checked
		});
	}

	function onAddRelay(): void {
		relays = [
			...relays,
			{
				url: '',
				read: true,
				write: true
			}
		];
	}

	function onDeleteRelay(index: number): void {
		relays = relays.filter((_, relayIndex) => relayIndex !== index);
	}
</script>

<div class="w-full">
	<div class="flex items-center gap-2">
		<p class="capitalize underline">Relays</p>
		<KJVButton classes="" onClick={onAddRelay}>
			<AddCircle classes=""></AddCircle>
			<span class="sr-only">Add relay</span>
		</KJVButton>
	</div>

	<div class="space-y-4">
		{#each relays as relay, index}
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<input
						value={relay.url}
						oninput={(event) => onRelayUrlInput(index, event)}
						class="min-w-0 flex-1 p-2 outline outline-neutral-400"
						type="text"
						aria-label={`relay ${index + 1} url`}
						placeholder="wss://relay.example"
					/>
					<KJVButton classes="" onClick={() => onDeleteRelay(index)}>
						<Delete classes=""></Delete>
						<span class="sr-only">Delete relay</span>
					</KJVButton>
				</div>
				<div class="flex items-center gap-6 text-sm">
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							class="accent-support-a-300"
							checked={relay.read}
							onchange={(event) => onRelayReadChange(index, event)}
						/>
						<span>read</span>
					</label>
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							class="accent-support-a-300"
							checked={relay.write}
							onchange={(event) => onRelayWriteChange(index, event)}
						/>
						<span>write</span>
					</label>
				</div>
			</div>
		{/each}
	</div>
</div>
