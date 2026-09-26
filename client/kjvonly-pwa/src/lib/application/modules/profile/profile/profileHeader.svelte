<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import {
		useNavigationRuntimeContext
	} from '$lib/application/runtime/navigation/navigation-runtime-context';

	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import Close from '$lib/components/svgs/close.svelte';
	import Edit from '$lib/components/svgs/edit.svelte';

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

	function onEdit(e: Event): void {
		e.stopPropagation();

		if (authenticationService.getState().status !== 'authenticated') {
			toastService.showToast('Login first');
			return;
		}

		navigation.pushView(
			PROFILE_VIEWS.EDIT,
			{}
		);
	}

	function onClose(e: Event): void {
		e.stopPropagation();

		navigation.back();
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<div class="grid w-full grid-cols-3 place-items-center">
		<div class="flex justify-center justify-self-start pe-4">
			<KJVButton onClick={onEdit} classes="">
				<Edit classes=""></Edit>
				<span class="sr-only">Edit profile</span>
			</KJVButton>
		</div>

		<span class="text-center">Profile</span>
		<div class="flex justify-center justify-self-end pe-4">
			<KJVButton onClick={onClose} classes="">
				<Close classes=""></Close>
				<span class="sr-only">Close profile</span>
			</KJVButton>
		</div>
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->
{@render header()}
