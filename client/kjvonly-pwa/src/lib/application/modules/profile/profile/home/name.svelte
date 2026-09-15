<script lang="ts">
	import { onMount } from 'svelte';
	import { useApplicationContext } from '$lib/application/runtime/application-context';

	const {
		accountService
	} = useApplicationContext();

	let name = $state('');

	onMount(() => {
		return accountService.subscribe(
			(state) => {
				name = state.name ?? '';
			}
		);
	});
</script>

<div>
	<p class="capitalize underline">name</p>
	<div class="grid grid-cols-1">
		<span class="break-words">{name}</span>
	</div>
</div>
