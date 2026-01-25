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
	import { authService } from '$lib/services/auth.service';
	import { relayService } from '$lib/services/relay.service';

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
		await relayService.init();

		setTimeout(() => {
			syncService.init();
		}, 5000);

		if (authService.isLoggedIn()) {
			register();
			setTimeout(() => {
				// Give the sync worker time to start up
				// we could sync from the worker if the
				// BEARER token was stored in indexed db
				// instead of local storage
				//				syncService.sync();
			}, 5000);
		}
	});

	let { children } = $props();
</script>

<Container>
	{@render children?.()}
</Container>
