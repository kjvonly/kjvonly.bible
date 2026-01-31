<script lang="ts">
	// CSS
	import '../app.css';
	import '../../node_modules/quill/dist/quill.snow.css';

	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import Container from '$lib/components/container.svelte';

	// SERVICES
	import { syncService } from '$lib/services/sync.service';
	import { relayService } from '$lib/nostr/services/relay.service';
	import { identityService } from '$lib/nostr/services/identity.service';

	function register() {
		// Listen for connection coming online
		window.addEventListener('online', () => {
			syncService.sync();
			console.log('Network connection restored.');
		});

		// Listen for connection going offline
		window.addEventListener('offline', () => {
			console.log('Network connection lost.');
			// Show offline message or queue requests
		});

		document.addEventListener('visibilitychange', () => {
			if (!document.hidden) {
				syncService.sync();
				console.log('Page is now visible (returned to foreground)');
			}
		});
	}

	onMount(async () => {
		identityService.init();
		await relayService.init();

		setTimeout(() => {
			syncService.init();
		}, 5000);

		//register();
	});

	let { children } = $props();
</script>

<Container>
	{@render children?.()}
</Container>
