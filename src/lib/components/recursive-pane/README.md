# Recursive Pane

This is the old way of rendering split screen. The main issue with this is every time there was a split the DOM would rerender all elements in the Pane node. We've since moved to the dynamic grid to remedy these issues with recursive pane.