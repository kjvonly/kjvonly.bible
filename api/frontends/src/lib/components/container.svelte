<script lang="ts">

    let {children} = $props()
</script>

<div class="w-full h-[100vh] flex justify-center">

    <div class="w-full">
        {@render children?.()}
    </div>

</div>