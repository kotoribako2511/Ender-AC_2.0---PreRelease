export function isValid(e: { isValid?: boolean } | null | undefined): boolean {
    try {
        return e?.isValid === true;
    } catch {
        return false;
    }
}

export function safeGet<T>(fn: () => T, fallback: T, context?: string): T {
    try {
        return fn();
    } catch (e) {
        if (context) console.warn(`[safeGet:${context}] ${e}`);
        else console.warn(`[Ender-log] ${e}`);
        return fallback;
    }
}

export function safeCall(
    fn: () => void,
    onError?: (e: unknown) => void,
    context?: string,
): void {
    try {
        fn();
    } catch (e) {
        if (onError) {
            onError(e);
            return;
        }
        if (context) console.warn(`[safeCall:${context}] ${e}`);
        else console.warn(`[safeCall] ${e}`);
    }
}