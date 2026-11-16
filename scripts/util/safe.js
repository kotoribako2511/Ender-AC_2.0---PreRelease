export function isValid(e) {
    try {
        return e?.isValid === true;
    }
    catch {
        return false;
    }
}
export function safeGet(fn, fallback, context) {
    try {
        return fn();
    }
    catch (e) {
        if (context)
            console.warn(`[safeGet:${context}] ${e}`);
        else
            console.warn(`[Ender-log] ${e}`);
        return fallback;
    }
}
export function safeCall(fn, onError, context) {
    try {
        fn();
    }
    catch (e) {
        if (onError) {
            onError(e);
            return;
        }
        if (context)
            console.warn(`[safeCall:${context}] ${e}`);
        else
            console.warn(`[safeCall] ${e}`);
    }
}
