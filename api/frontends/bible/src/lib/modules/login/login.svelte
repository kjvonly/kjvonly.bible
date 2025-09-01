<script lang="ts">
	import { paneService } from '$lib/services/pane.service.svelte';

	let {
		paneId,
		pane = $bindable(),
		containerHeight = $bindable(),
		containerWidth = $bindable(),
		onClose = undefined
	} = $props();

	let clientHeight = $state(0);
	let headerHeight = $state(0);
</script>

<div bind:clientHeight style={containerHeight} class="overflow-hidden">
	<div class="flex flex-col items-center">
		<div bind:clientHeight={headerHeight} class="flex w-full  flex-col items-center">
			<div class="flex w-full max-w-lg justify-end bg-neutral-100">
				<div class="flex w-full max-w-lg justify-end bg-neutral-100">
					<button
						aria-label="close"
						onclick={() => {
							if (onClose) {
								onClose();
							} else {
								paneService.onDeletePane(paneService.rootPane, paneId);
							}
						}}
						class="h-12 w-12 px-2 pt-2 text-neutral-700"
					>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
							<path
								class="fill-neutral-700"
								d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M17,15.59L15.59,17L12,13.41L8.41,17L7,15.59 L10.59,12L7,8.41L8.41,7L12,10.59L15.59,7L17,8.41L13.41,12L17,15.59z"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>
		<div class="flex w-full max-w-lg justify-center px-2 pt-2">
			<div
				style="height: {clientHeight - headerHeight}px"
				class="flex flex-col max-w-lg overflow-x-hidden overflow-y-scroll px-6 "
			>
				<div class="sm:mx-auto sm:w-full sm:max-w-sm">
					<img src="/icons/cross.svg" alt="KJVonly" class="mx-auto h-10 w-auto" />
                    <h2 class="mt-2 text-center text-2xl/9 font-bold tracking-tight text-neutral-700">
						KJVonly
					</h2>
					<h2 class="mt-10 text-center text-2xl/9 font-bold tracking-tight text-neutral-700">
						Sign in to your account
					</h2>
				</div>

				<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
					<form action="#" method="POST" class="space-y-6">
						<div>
							<label for="email" class="block text-base font-medium text-neutral-700"
								>Email address</label
							>
							<div class="mt-2">
								<input
									id="email"
									type="email"
									name="email"
									required
									autocomplete="email"
									class="text-base border-primary-500 w-full max-w-3xl border-b bg-neutral-50 outline-none"
								/>
							</div>
						</div>

						<div>
							<div class="flex items-center justify-between">
								<label for="password" class="block text-base font-medium text-neutral-700"
									>Password</label
								>
								<div class="text-sm">
									<a href="#" class="font-semibold text-support-a-500 hover:text-support-a-300 text-base"
										>Forgot password?</a
									>
								</div>
							</div>
							<div class="mt-2">
								<input
									id="password"
									type="password"
									name="password"
									required
									autocomplete="current-password"
									class=" border-primary-500 w-full max-w-3xl border-b bg-neutral-50 outline-none"
								/>
							</div>
						</div>

						<div>
							<button
								type="submit"
								class="flex w-full justify-center rounded-md bg-support-a-500 px-3 py-1.5 text-sm/6 font-semibold text-neutral-100 hover:bg-support-a-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-support-a-300
                                hover:cursor-pointer"
								>Sign in</button
							>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
</div>
