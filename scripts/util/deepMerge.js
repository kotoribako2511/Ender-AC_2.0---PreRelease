export function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function deepMerge(target, source) {
    if (!isPlainObject(target) || !isPlainObject(source)) {
        return (source === undefined ? target : source);
    }
    const result = { ...target };
    for (const key of Object.keys(source)) {
        const sourceValue = source[key];
        const targetValue = result[key];
        if (sourceValue === undefined)
            continue;
        result[key] = isPlainObject(targetValue) && isPlainObject(sourceValue)
            ? deepMerge(targetValue, sourceValue)
            : sourceValue;
    }
    return result;
}
