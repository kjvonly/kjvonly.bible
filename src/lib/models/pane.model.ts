export interface Pane {
    id: string | any;
    left: Pane | any;
    right: Pane | any;
    split: string | any;
    buffer: any
    updateBuffer: Function | any
}