# 1. +page.svelte

`+page.svelte` is the only route at `/`. The name of this file is for svelte conventions. What this file is responsible for is managing the `Pane` tree/node with 3 simple functions `findPane`, `splitPane`, and `deletePane` and rendering the `Pane`s to the DOM with the `onGridUpdate` function.


## Pane Id
A `Pane` id is a sequence of alpha chars e.g. `a` `b` `za` `zb` `zza` `zzb` etc... The `Pane` id is used throughout the code base to perform Retrieve, Update, Delete operations on that `Pane`.

## paneIds array
This is an array that contains the `Pane` ids to be displayed. 

```typescript
let paneIds: string[] = $state([]);
```

!!! important
    Pane ids are never removed from this array. We use the deletedPaneIds array to track what was deleted. If this array changes then the DOM thinks the `Pane` is new and will rerender that `Pane` in the DOM. This is an issue if a user has multiple panes open at different scroll locations. Rerendering the `Pane` would move the scroll position back to 0.

## deletedPaneIds array
This is an array that contains the deleted `Pane` ids. 

```typescript
let deletedPaneIds: any = $state({});
```


## 

## Tree/Node
### findPane
A recursive function that finds a `Pane` provided a starting `Pane` and a `Pane` id.

```typescript
function findPane(p: Pane, paneId: string): Pane | undefined {
		if (p.id === paneId) {
			return p;
		}
		let found;

		if (p.left) {
			found = findPane(p.left, paneId);
		}

		if (found) {
			return found;
		}

		if (p.right) {
			found = findPane(p.right, paneId);
		}

		return found;
	}
```

### splitPane
This function simply gets the last `Pane` id added to the `paneIds` array and gets the next `Pane` id by calling the `numberToLetters` function. Assigns the current `Pane` variables to the `left` variable and the new `Pane` variables to the `right` variable. Making the current `Pane` a branch by adding a `split` variable and removing the `Pane` id.

```typescript
function splitPane(paneId: string, split: string, componentName: string, bag: any) {
		function splitPane(paneId: string, split: string, componentName: string, bag: any) {
		let p = findPane(paneService.rootPane, paneId);

		/** p should never be undefined */
		if (!p) {
			return;
		}

		let lastPaneId: string = paneIds[paneIds.length - 1];
		let val = 0;
		for (let i = 0; i < lastPaneId.length; i++) {
			val += lastPaneId.charCodeAt(i) - 96;
		}

		let pid = numberToLetters(val + 1);

		p.split = split;
		p.left = {
			id: p.id,
			buffer: p.buffer,
			updateBuffer: p.updateBuffer,
			toggle: p.toggle
		};

		let buffer = new Buffer();
		buffer.componentName = componentName;
		buffer.name = componentName;
		buffer.bag = bag;

		p.right = {
			id: pid,
			buffer: buffer
		};
		p.id = undefined;
        
        onGridUpdate();
	}
	}
```

### deletePane

```typescript
function deletePane(n: Pane, key: string) {
		if (n.id === paneService.rootPane.id && n.left === undefined && n.right === undefined) {
			n.buffer.componentName = 'Modules';
			n.buffer.bag = {};
			n.updateBuffer('Modules');
		}

		if (n.id === key) {
			return n;
		}
		let found;

		if (n.left) {
			found = deletePane(n.left, key);
		}

		if (found) {
			deletedPaneIds[n.left.id] = n.left.id;
			paneService.unsubscribe(n.left.id);
			//do delete. this is the parent
			if (n.right.split) {
				n.split = n.right.split;
				n.left = n.right.left;
				n.right = n.right.right;
			} else {
				n.id = n.right.id;
				n.updateBuffer = n.right.updateBuffer;
				n.toggle = n.right.toggle;
				n.split = undefined;
				n.left = undefined;
				n.right = undefined;
			}

			onGridUpdate();
			return;
		}

		if (n.right) {
			found = deletePane(n.right, key);
		}

		if (found) {
			deletedPaneIds[n.right.id] = n.right.id;
			paneService.unsubscribe(n.right.id);
			//do delete this is the parent
			if (n.left.split) {
				n.split = n.left.split;
				n.right = n.left.right;
				n.left = n.left.left;
			} else {
				n.id = n.left.id;
				n.updateBuffer = n.left.updateBuffer;
				n.toggle = n.left.toggle;
				n.split = undefined;
				n.left = undefined;
				n.right = undefined;
			}

			onGridUpdate();
			return;
		}
	}
```