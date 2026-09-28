<script lang="ts">
	// ================================ IMPORTS ================================
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

	function onBack(): void {
		navigation.back();
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<KJVHeader
		title="Profile"
		leadingAction={{
			icon: 'arrow-back',
			label: 'Back',
			onClick: onBack
		}}
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
