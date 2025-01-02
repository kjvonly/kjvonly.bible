<script lang="ts">

    let {children} = $props()
</script>

<div class="w-full h-full flex justify-center">

    <div class="max-w-6xl w-full">
        {@render children?.()}
    </div>

</div>