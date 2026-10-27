<script lang="ts">
	import { useNavigationEntryContext } from '$lib/application/runtime/navigation/navigation-entry-context';
	import { useNavigationRuntimeContext } from '$lib/application/runtime/navigation/navigation-runtime-context';

	const { navigationState } = useNavigationEntryContext();
	const { navigation } = useNavigationRuntimeContext();
</script>

<!-- Navigation-only destination: no Notes persistence or live resources required. -->
<div data-testid="normalized-word-notes-destination">
	<span>{String(Boolean(navigationState.state.normalizedDocument))}</span>
	<button onclick={() => navigation.back()}>Back to document</button>
</div>
