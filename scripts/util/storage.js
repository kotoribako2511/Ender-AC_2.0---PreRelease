import { world } from "@minecraft/server";
import { CHUNK_SIZE, STORAGE_MAX_CHUNKS } from "./constants.js";
export class ChunkedStorage {
    constructor(prefix, countKey, legacyKey, chunkSize = CHUNK_SIZE, maxChunks = STORAGE_MAX_CHUNKS) {
        this.prefix = prefix;
        this.countKey = countKey;
        this.legacyKey = legacyKey;
        this.chunkSize = chunkSize;
        this.maxChunks = maxChunks;
    }
    load(fallback) {
        try {
            const rawCount = world.getDynamicProperty(this.countKey);
            const count = typeof rawCount === "number" ? rawCount : undefined;
            let raw = "";
            if (count !== undefined) {
                for (let i = 0; i < count; i++) {
                    const part = world.getDynamicProperty(`${this.prefix}${i}`);
                    if (typeof part === "string")
                        raw += part;
                }
            }
            else if (this.legacyKey) {
                const legacy = world.getDynamicProperty(this.legacyKey);
                if (typeof legacy === "string")
                    raw = legacy;
            }
            return raw ? JSON.parse(raw) : fallback;
        }
        catch {
            return fallback;
        }
    }
    save(data) {
        const json = JSON.stringify(data);
        const chunks = Math.ceil(json.length / this.chunkSize);
        for (let i = 0; i < chunks; i++) {
            world.setDynamicProperty(`${this.prefix}${i}`, json.slice(i * this.chunkSize, (i + 1) * this.chunkSize));
        }
        world.setDynamicProperty(this.countKey, chunks);
        for (let i = chunks; i < this.maxChunks; i++) {
            if (world.getDynamicProperty(`${this.prefix}${i}`) === undefined)
                break;
            world.setDynamicProperty(`${this.prefix}${i}`, undefined);
        }
    }
    clear() {
        const rawCount = world.getDynamicProperty(this.countKey);
        const count = typeof rawCount === "number" ? rawCount : undefined;
        const limit = count ?? this.maxChunks;
        for (let i = 0; i < limit; i++) {
            world.setDynamicProperty(`${this.prefix}${i}`, undefined);
        }
        world.setDynamicProperty(this.countKey, undefined);
        if (this.legacyKey) {
            world.setDynamicProperty(this.legacyKey, undefined);
        }
    }
    bytes(data) {
        return JSON.stringify(data).length;
    }
}
