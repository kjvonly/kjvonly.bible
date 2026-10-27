<script lang="ts">
	// ================================ IMPORTS ================================
	import KJVBackButton from '../../../ui/navigation/KJVBackButton.svelte';

	// APPLICATION
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import {
		useNavigationRuntimeContext
	} from '$lib/application/runtime/navigation/navigation-runtime-context';

	// COMPONENTS
	import { KJVHeader } from '$lib/components';

	// MODELS
	import {
		PROFILE_VIEWS
	} from '../profile-navigation.model';

	const {
		authenticationService,
		toastService
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	// ============================== CLICK FUNCS ==============================

	function onEdit(): void {
		if (authenticationService.getState().status !== 'authenticated') {
			toastService.showToast('Login first');
			return;
		}

		navigation.pushView(
			PROFILE_VIEWS.EDIT,
			{}
		);
	}

</script>

<!-- ================================ HEADER =============================== -->

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet header()}
	<KJVHeader
		title="Profile"
		{leadingContent}
		actions={[
			{
				icon: 'edit',
				label: 'Edit profile',
				onClick: onEdit
			}
		]}
	></KJVHeader>
{/snippet}

<!-- ============================== CONTAINER ============================== -->
{@render header()}
