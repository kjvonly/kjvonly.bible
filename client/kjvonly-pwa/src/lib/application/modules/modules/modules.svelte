<script lang="ts">
	// ================================ IMPORTS ================================

	// COMPONENTS
	import BufferBody from '$lib/application/runtime/buffer/components/bufferBody.svelte';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';
	import Close from '$lib/components/svgs/close.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// MODELS
	import { Modules } from '$lib/application/models/modules.model';
	import { PLANS_VIEWS } from '$lib/domains/reading-plans';
	import { NOTES_VIEWS } from '$lib/domains/notes';
	import { BIBLE_VIEWS, SEARCH_VIEWS } from '$lib/domains/bible';
	import { ARCHIVE_VIEWS } from '../archive/archive-navigation.model';
	import { PROFILE_VIEWS } from '../profile/profile-navigation.model';
	import { LOGIN_VIEWS } from '../login/login-navigation.model';
	import { SETTINGS_VIEWS } from '../settings/models/settings-navigation.model';

	// SERVICES
	import { onMount } from 'svelte';
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import { useNavigationRuntimeContext } from '$lib/application/runtime/navigation/navigation-runtime-context';
	const {
		workspaceRuntime,
		authenticationService
	} = useApplicationContext();
	const {
		navigation
	} = useNavigationRuntimeContext();

	// =============================== BINDINGS ================================
	let {
		clientHeight
	}: {
		clientHeight: number;
	} = $props();

	// ================================== VARS =================================

	let components: Record<string, Modules> = $state({
		bible: Modules.BIBLE,
		search: Modules.SEARCH,
		notes: Modules.NOTES,
		plans: Modules.PLANS,
		archive: Modules.ARCHIVE,
		settings: Modules.SETTINGS
	});

	let headerHeight = $state(0);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		return authenticationService.subscribe((state) => {
			addDynamicModules(state.status !== 'signed-out');
		});
	});

	// ================================ FUNCS ==================================
	function addDynamicModules(isAuthenticated: boolean) {
		delete components['profile'];
		delete components['login'];

		if (isAuthenticated) {
			components['profile'] = Modules.PROFILE;
		} else {
			components['login'] = Modules.LOGIN;
		}
	}

	// ============================== CLICK FUNCS ==============================
	function onClose(): void {
		workspaceRuntime.deletePane(
			navigation.paneID
		);
	}

	function onModuleSelected(
		module: Modules
	): void {
		if (module === Modules.PLANS) {
			navigation.pushModule(
				Modules.PLANS,
				PLANS_VIEWS.SUBS_LIST,
				{}
			);
			return;
		}

		if (module === Modules.BIBLE) {
			navigation.pushModule(
				Modules.BIBLE,
				BIBLE_VIEWS.READER,
				{}
			);
			return;
		}

		if (module === Modules.SEARCH) {
			navigation.pushModule(
				Modules.SEARCH,
				SEARCH_VIEWS.RESULTS,
				{}
			);
			return;
		}

		if (module === Modules.NOTES) {
			navigation.pushModule(
				Modules.NOTES,
				NOTES_VIEWS.ROOT,
				{}
			);
			return;
		}

		if (module === Modules.ARCHIVE) {
			navigation.pushModule(
				Modules.ARCHIVE,
				ARCHIVE_VIEWS.ROOT,
				{}
			);
			return;
		}

		if (module === Modules.PROFILE) {
			navigation.pushModule(
				Modules.PROFILE,
				PROFILE_VIEWS.ROOT,
				{}
			);
			return;
		}

		if (module === Modules.LOGIN) {
			navigation.pushModule(
				Modules.LOGIN,
				LOGIN_VIEWS.ROOT,
				{}
			);
			return;
		}

		if (module === Modules.SETTINGS) {
			navigation.pushModule(
				Modules.SETTINGS,
				SETTINGS_VIEWS.ROOT,
				{}
			);
			return;
		}

		throw new Error(
			`Unsupported Modules launcher target: ${module}`
		);
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<span class="flex-1"></span>
	<span class="text-center"> Modules </span>
	<span class="flex flex-1 justify-end">
		<KJVButton classes="" onClick={onClose}>
			<Close></Close>
		</KJVButton>
	</span>
{/snippet}

<!-- ================================= BODY ================================ -->
{#snippet body()}
	{#each Object.keys(components) as c}
		<div class="w-full">
			<button
				onclick={() => onModuleSelected(components[c])}
				class="w-full bg-neutral-50 p-4 text-start capitalize hover:bg-neutral-100"
				>{c}</button
			>
		</div>
	{/each}
{/snippet}

<!-- ============================== CONTAINER ============================== -->
<BufferHeader bind:headerHeight>
	{@render header()}
</BufferHeader>
<BufferBody {clientHeight} {headerHeight} classes="">
	{@render body()}
</BufferBody>
