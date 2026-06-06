package mergesortedslices

func swapDelete[A any](arr []A, i int) []A {
	arr[i] = arr[len(arr)-1]
	return arr[:len(arr)-1]
}
