package mergesortedslices

import (
	"cmp"
)

// Merge take a bunch of simple lists and merges them. They must be ordered otherwise everything will be broken.
// Merge will order stuff with bigger values first, which is the opposite of what everybody else does.
// Why? Because that how I needed it to work. It will also expect the given lists to be ordered like that.
func Merge[A cmp.Ordered](all [][]A) []A {
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

	return MergeLimitNoEmptyLists(all, total)
}

// MergeLimit is the same as Merge, but takes a limit. While Merge will order all the items in all the lists
// MergeLimit will stop when it reaches limit, which means it will be much faster if the limit is smaller than
// the total count of all items.
func MergeLimit[A cmp.Ordered](all [][]A, limit int) []A {
	// remove empty lists
	for i := len(all) - 1; i >= 0; i-- {
		if len(all[i]) == 0 {
			all = swapDelete(all, i)
		}
	}

	return MergeLimitNoEmptyLists(all, limit)
}

// MergeLimitNoEmptyLists is the same as MergeLimit, but assumes there are not empty lists, like MergeNoEmptyLists.
func MergeLimitNoEmptyLists[A cmp.Ordered](all [][]A, limit int) []A {
	return MergeNoEmptyListsIntoSlice(make([]A, limit), all)
}

// MergeNoEmptyListsIntoSlice is the same as MergeLimitNoEmptyLists, but take a slice into which it will insert the results. The slice length will not be increased, its length will be treated as the max limit.
func MergeNoEmptyListsIntoSlice[A cmp.Ordered](res []A, all [][]A) []A {
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
			if v := all[a][next]; fstSrc == -1 || cmp.Compare(v, fst) == 1 {
				snd, fst = fst, v
				sndSrc, fstSrc = fstSrc, a
			} else if sndSrc == -1 || cmp.Compare(v, snd) == 1 {
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
			for n := all[fstSrc][any[fstSrc]]; cmp.Compare(n, snd) > -1; n = all[fstSrc][any[fstSrc]] {
				// as long as the first value is greater than the second we keep adding it
				// fmt.Println("    adding", n, "(fst again)")
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
				// fmt.Println("    adding", snd, "(final snd)")
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
