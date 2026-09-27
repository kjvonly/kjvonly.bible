<script lang="ts">
	import {
		usePaneLayoutContext
	} from '../../../runtime/pane/pane-layout-context';
	import ViewBody from '$lib/application/runtime/navigation/components/viewBody.svelte';
	import ViewHeader from '$lib/application/runtime/navigation/components/viewHeader.svelte';
	import ProfileHeader from './profileHeader.svelte';
	import Pubkey from './home/pubkey.svelte';
	import Relays from './home/relays.svelte';
	import Name from './home/name.svelte';
	import Nsec from './home/nsec.svelte';

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	let headerHeight: number = $state(0);
</script>

{#snippet header()}
	<ProfileHeader></ProfileHeader>
{/snippet}

{#snippet body()}
	<div class="flex h-full flex-col items-start justify-start space-y-2 py-4">
		<Name></Name>
		<Pubkey></Pubkey>
		<Nsec></Nsec>
		<Relays></Relays>
	</div>
{/snippet}

<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>
<ViewBody {clientHeight} {headerHeight}>
	{@render body()}
</ViewBody>
