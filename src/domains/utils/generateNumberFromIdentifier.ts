
export function generateId(value: string): number {
    let id = 0
    value.split('').forEach((value, index) => {
        id += value.charCodeAt(0) % 1000
    })
    return id % 10000;
}