<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import type { NavigationService } from '$lib/application/services/navigation.service';

	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import Close from '$lib/components/svgs/close.svelte';
	import Edit from '$lib/components/svgs/edit.svelte';
	import EditProfile from './edit/editProfile.svelte';

	const {
		authenticationService,
		toastService,
		workspaceRuntime
	} = useApplicationContext();

	// =============================== BINDINGS ================================

	let {
		paneID,
		navService = $bindable()
	}: {
		paneID: string;
		navService: NavigationService;
	} = $props();

	// ============================== CLICK FUNCS ==============================

	function onEdit(e: Event): void {
		e.stopPropagation();

		if (authenticationService.getState().status !== 'authenticated') {
			toastService.showToast('Login first');
			return;
		}

		navService.push({
			component: EditProfile,
			obj: {}
		});
	}

	function onClose(e: Event): void {
		e.stopPropagation();
		workspaceRuntime.closePane(paneID);
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
