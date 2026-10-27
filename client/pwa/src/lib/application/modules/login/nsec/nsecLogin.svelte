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
	import NsecLoginHeader from './nsecLoginHeader.svelte';

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
	let nsec = $state('');

	async function nsecLogin(): Promise<void> {
		await authenticationService.login(nsec);

		const userId =
			authenticationService.getUserId();

		await accountService.load(userId);

		void accountService
			.refresh(userId)
			.catch((error) => {
				console.warn(
					'[Account refresh failed]',
					error
				);
			});

		await navigation.backWithResult({
			type:
				LOGIN_NAVIGATION_RESULTS.AUTHENTICATED
		});
	}
</script>

{#snippet header()}
	<NsecLoginHeader></NsecLoginHeader>
{/snippet}

{#snippet body()}
	<div class="flex h-full flex-col items-center justify-center">
		<div class="flex max-w-72 flex-col space-y-6">
			<input
				bind:value={nsec}
				type="text"
				id="nsecText"
				placeholder="nsec1..."
				class=" border-primary-500 w-full border-b-1 outline-none"
			/>
			<KJVButtonRounded onClick={nsecLogin}>NSEC Login</KJVButtonRounded>
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
