<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import Container from '$lib/components/container.svelte';
	import '../../node_modules/quill/dist/quill.snow.css';
	import { syncService } from '$lib/services/sync.service';
	import { searchService } from '$lib/services/search.service';
	import { authService } from '$lib/services/auth.service';
	import { notesService } from '$lib/services/notes.service';

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
		/* This pulls the chapter and strongs data from api and stores in indexdb for offline use. */
		await syncService.init();
		if (authService.isLoggedIn()) {
			register();
			setTimeout(() => {
				// Give the sync worker time to start up
				syncService.sync();

			}, 5000);
		}
	});

	let { children } = $props();
</script>

<Container>
	{@render children?.()}
</Container>
