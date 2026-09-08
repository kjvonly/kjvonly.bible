import { get, writable, type Writable } from "svelte/store"

export class NavigationService {

  views: Writable<any[]> = writable([])


  push(v: any) {
    let vs = get(this.views)
    vs.push(v)
    this.views.set(vs)
  }


  pop() {
    let vs = get(this.views)
    vs.pop()
    this.views.set(vs)

  }
}
