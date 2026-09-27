<script lang="ts">
	import {
		onMount
	} from 'svelte';

	import {
		usePaneLayoutContext
	} from '../../../runtime/pane/pane-layout-context';
	import {
		useNavigationEntryContext
	} from '../../../runtime/navigation/navigation-entry-context';
	import {
		useNavigationRuntimeContext
	} from '../../../runtime/navigation/navigation-runtime-context';
	import type {
		NavigationStateValue
	} from '../../../services/navigation.service';
	import ViewBody from '$lib/application/runtime/navigation/components/viewBody.svelte';
	import ViewHeader from '$lib/application/runtime/navigation/components/viewHeader.svelte';
	import KJVButtonRounded from '$lib/components/buttons/KJVButtonRounded.svelte';
	import LoginOptionsHeader from './loginOptionsHeader.svelte';
	import {
		LOGIN_NAVIGATION_RESULTS,
		LOGIN_VIEWS
	} from '../login-navigation.model';
	import { Modules } from '../../../models/modules.model';
	import { PROFILE_VIEWS } from '../../profile/profile-navigation.model';

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	const {
		navigation
	} = useNavigationRuntimeContext();

	const {
		onResult,
		whenActive
	} = useNavigationEntryContext();

	let headerHeight: number = $state(0);

	onMount(() =>
		onResult(
			onNavigationResult
		)
	);

	function onNavigationResult(
		result: NavigationStateValue
	): void {
		if (
			typeof result !== 'object' ||
			result === null ||
			Array.isArray(result) ||
			result.type !==
				LOGIN_NAVIGATION_RESULTS.AUTHENTICATED
		) {
			return;
		}

		whenActive(() => {
			navigation.back();
			navigation.pushModule(
				Modules.PROFILE,
				PROFILE_VIEWS.ROOT,
				{}
			);
		});
	}

	function createAccount(): void {
		navigation.pushView(
			LOGIN_VIEWS.CREATE_ACCOUNT,
			{}
		);
	}

	function nsecLogin(): void {
		navigation.pushView(
			LOGIN_VIEWS.NSEC,
			{}
		);
	}
</script>

{#snippet header()}
	<LoginOptionsHeader></LoginOptionsHeader>
{/snippet}

{#snippet body()}
	<div class="flex h-full flex-col items-center justify-center">
		<div class="flex max-w-72 flex-col space-y-2">
			<KJVButtonRounded onClick={createAccount}>Create Account</KJVButtonRounded
			>

			<KJVButtonRounded onClick={nsecLogin}>NSEC Login</KJVButtonRounded>
		</div>
		<div>
			<span class="flex underline"></span>
			<span class="flex underline"></span>
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
