package mergesortedslices

// MergeFunc is like Merge, but takes a custom comparator. It will still put bigger elements first
// (but you can pass a comparator that returns reverse values if you want the opposite behavior).
func MergeFunc[A any](all [][]A, cmp func(a, b A) int) []A {
	total := 0
	for i := len(all) - 1; i >= 0; i-- {
		if len(all[i]) == 0 {
			// remove empty lists
			all = swapDelete(all, i)
		} else {
			// count total
			total += len(all[i])
		}
	}

	return MergeFuncLimitNoEmptyLists(all, cmp, total)
}

// MergeFuncLimit is like MergeLimit, but with a custom comparator.
func MergeFuncLimit[A any](all [][]A, cmp func(a, b A) int, limit int) []A {
	// remove empty lists
	for i := len(all) - 1; i >= 0; i-- {
		if len(all[i]) == 0 {
			all = swapDelete(all, i)
		}
	}

	return MergeFuncLimitNoEmptyLists(all, cmp, limit)
}

// MergeFuncLimitNoEmptyLists is like MergeLimitNoEmptyLists, but with a custom comparator.
func MergeFuncLimitNoEmptyLists[A any](all [][]A, cmp func(a, b A) int, limit int) []A {
	return MergeFuncNoEmptyListsIntoSlice(make([]A, limit), all, cmp)
}

// MergeFuncNoEmptyListsIntoSlice is like MergeNoEmptyListsIntoSlice, but with a custom comparator.
func MergeFuncNoEmptyListsIntoSlice[A any](res []A, all [][]A, cmp func(a, b A) int) []A {
	any := make([]int, len(all))

	for i := 0; i < len(res); i++ {
		if len(any) == 0 {
			res = res[0:i]
			break
		}

		var fst A
		var fstSrc int = -1
		var snd A
		var sndSrc int = -1

		for a, next := range any {
			if v := all[a][next]; fstSrc == -1 || cmp(v, fst) == 1 {
				snd, fst = fst, v
				sndSrc, fstSrc = fstSrc, a
			} else if sndSrc == -1 || cmp(v, snd) == 1 {
				snd = v
				sndSrc = a
			}
		}

		// fmt.Println("fst", fst, "from", fstSrc, all[fstSrc])
		// if sndSrc == -1 {
		// 	fmt.Println("  snd is none")
		// } else {
		// 	fmt.Println("  snd", snd, "from", sndSrc, all[sndSrc])
		// }

		// fmt.Println("    adding", fst)
		any[fstSrc]++
		res[i] = fst

		if len(all[fstSrc]) == any[fstSrc] {
			// queue from which the first value came is exhausted, so
			// fmt.Println("    adding", fst, "(immediate snd)")

			// remove the first queue
			any = swapDelete(any, fstSrc)
			all = swapDelete(all, fstSrc)
			if sndSrc == len(any) {
				sndSrc = fstSrc
			}

			// add the second value
			if sndSrc > -1 {
				i++
				if i == len(res) {
					break
				}

				res[i] = snd
				any[sndSrc]++
				if len(all[sndSrc]) == any[sndSrc] {
					// potentially remove the second queue
					any = swapDelete(any, sndSrc)
					all = swapDelete(all, sndSrc)
					// fmt.Println("    %%", sndSrc)
				}
			}
		} else {
			// first queue is not exhausted, so try to fetch its next value and compare it with the second
			for n := all[fstSrc][any[fstSrc]]; cmp(n, snd) > -1; n = all[fstSrc][any[fstSrc]] {
				// as long as the first value is greater than the second we keep adding it
				// fmt.Println("    adding", n, "(fst again) from", fstSrc)
				i++
				if i == len(res) {
					break
				}

				res[i] = n
				any[fstSrc]++

				// or until the first queue is exhausted
				if len(all[fstSrc]) == any[fstSrc] {
					any = swapDelete(any, fstSrc)
					all = swapDelete(all, fstSrc)
					// fmt.Println("    %%", fstSrc)

					if sndSrc == len(any) {
						sndSrc = fstSrc
					}

					break
				}
			}

			// then we add the second
			if sndSrc > -1 {
				// fmt.Println("    adding", snd, "(final snd) from", sndSrc)
				i++
				if i >= len(res) {
					break
				}

				res[i] = snd
				any[sndSrc]++
				if len(all[sndSrc]) == any[sndSrc] {
					any = swapDelete(any, sndSrc)
					all = swapDelete(all, sndSrc)
					// fmt.Println("    %%", sndSrc)
				}
			}
		}
		// fmt.Println("      ::", res)
	}

	return res
}
