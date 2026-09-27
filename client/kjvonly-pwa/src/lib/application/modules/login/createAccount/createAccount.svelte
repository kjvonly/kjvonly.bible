<script lang="ts">
	import {
		usePaneLayoutContext
	} from '../../../runtime/pane/pane-layout-context';
	import ViewBody from '$lib/application/runtime/navigation/components/viewBody.svelte';
	import ViewHeader from '$lib/application/runtime/navigation/components/viewHeader.svelte';
	import KJVButtonRounded from '$lib/components/buttons/KJVButtonRounded.svelte';
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import { useNavigationRuntimeContext } from '$lib/application/runtime/navigation/navigation-runtime-context';
	import { LOGIN_NAVIGATION_RESULTS } from '../login-navigation.model';
	import CreateAccountHeader from './createAccountHeader.svelte';

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	const {
		authenticationService,
		accountService
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	let headerHeight: number = $state(0);
	let name = $state('');

	async function createAccount(): Promise<void> {
		await authenticationService.createIdentity();

		await accountService.setup(
			authenticationService.getUserId(),
			name
		);

		await navigation.backWithResult({
			type:
				LOGIN_NAVIGATION_RESULTS.AUTHENTICATED
		});
	}
</script>

{#snippet header()}
	<CreateAccountHeader></CreateAccountHeader>
{/snippet}

{#snippet body()}
	<div class="flex h-full flex-col items-center justify-center">
		<p class="p-2">All you need is a name.</p>
		<div class="flex max-w-72 flex-col space-y-6">
			<input
				bind:value={name}
				type="text"
				id="name"
				placeholder="Name"
				class=" border-primary-500 w-full border-b-1 outline-none"
			/>
			<KJVButtonRounded onClick={createAccount}>Create Account</KJVButtonRounded>
		</div>
	</div>
{/snippet}

<ViewHeader
	bind:headerHeight
	classes="flex w-full justify-between outline outline-neutral-400 text-neutral-700"
>
	{@render header()}
</ViewHeader>
<ViewBody {clientHeight} {headerHeight}>
	{@render body()}
</ViewBody>
