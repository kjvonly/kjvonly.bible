<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import {
		useNavigationRuntimeContext
	} from '$lib/application';

	// COMPONENTS
	import Close from '$lib/components/svgs/close.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	const { navigation } =
		useNavigationRuntimeContext();

	// ============================== CLICK FUNCS ==============================

	function onClose(e: Event): void {
		e.stopPropagation();
		navigation.back();
	}
</script>

<!-- ================================ HEADER =============================== -->
<div
	class="flex w-full flex-row bg-neutral-100 py-2 leading-tight"
>
	<span class="flex-1"></span>
	<span class="text-center">Strongs / Refs</span>
	<div class="flex flex-1 justify-end pe-4">
		<KJVButton onClick={onClose} classes="">
			<Close classes=""></Close>
		</KJVButton>
	</div>
</div>
