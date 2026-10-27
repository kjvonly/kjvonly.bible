<script lang="ts">
	import { onMount } from 'svelte';
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import Visibility from '$lib/components/svgs/visibility.svelte';
	import VisibilityOff from '$lib/components/svgs/visibilityOff.svelte';

	const {
		authenticationService
	} = useApplicationContext();

	let nsec = $state('');
	let visible = $state(false);

	onMount(() => {
		return authenticationService.subscribe(
			() => {
				const secret = authenticationService.tryGetExportableSecret();

				nsec = secret?.type === 'nsec'
					? secret.value
					: '';

				if (nsec === '') {
					visible = false;
				}
			}
		);
	});
</script>

{#if nsec !== ''}
	<div class="w-full">
		<div class="flex items-center gap-2">
			<p class="capitalize underline">Nsec</p>
			<KJVButton
				classes=""
				onClick={() => (visible = !visible)}
			>
				{#if visible}
					<VisibilityOff classes=""></VisibilityOff>
					<span class="sr-only">Hide nsec</span>
				{:else}
					<Visibility classes=""></Visibility>
					<span class="sr-only">Show nsec</span>
				{/if}
			</KJVButton>
		</div>
		<span class="break-all">
			{visible ? nsec : '••••••••••••••••••••••••'}
		</span>
	</div>
{/if}
