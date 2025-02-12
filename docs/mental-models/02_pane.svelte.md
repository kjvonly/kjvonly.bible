# 2. Pane Component
The `Pane` component (different than the `Pane` tree/node) is the base component for every module. The responsibility for the `Pane` component is to set the height of `Pane` and to render the `Module` component i.e. Bible, search etc...


## Component

```html

<div style="{containerWidth} {containerHeight}">
	<!-- Since component is a Const we need a way to rerender this when the component changes. 
			     We accomplish this with the toggle. -->
	{#if pane?.toggle}
		{#if pane?.buffer?.componentName}
			{@const Component = componentMapping.getComponent(pane?.buffer?.componentName)}
			<Component bind:containerHeight bind:containerWidth paneId={pane.id}></Component>
		{/if}
	{/if}

	{#if pane && !pane.toggle}
		{#if pane?.buffer?.componentName}
			{@const Component = componentMapping.getComponent(pane?.buffer?.componentName)}
			<Component bind:containerHeight bind:containerWidth paneId={pane.id}></Component>
		{/if}
	{/if}
</div>
```