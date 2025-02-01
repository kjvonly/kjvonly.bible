export function getParentHeight(id: string) {
    let el = document.getElementById(id);
    if (el === null) {
        return 0;
    }
    let cel = document.getElementById(`${id}-container`);
    if (cel === null) {
        return 0;
    }

    let pel = el?.parentNode as HTMLElement;

    return pel.clientHeight
}