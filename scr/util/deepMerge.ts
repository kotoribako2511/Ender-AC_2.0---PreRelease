export function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepMerge<T>(target: T, source: unknown): T {
    if (!isPlainObject(target) || !isPlainObject(source)) {
        return (source === undefined ? target : source) as T;
    }
    const result: Record<string, unknown> = { ...target };
    for (const key of Object.keys(source)) {
        const sourceValue = source[key];
        const targetValue = result[key];
        if (sourceValue === undefined) continue;
        result[key] = isPlainObject(targetValue) && isPlainObject(sourceValue)
            ? deepMerge(targetValue, sourceValue)
            : sourceValue;
    }
    return result as T;
}