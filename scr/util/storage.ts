import { world } from "@minecraft/server";
import { CHUNK_SIZE, STORAGE_MAX_CHUNKS } from "./constants.js";

export class ChunkedStorage<T> {
    constructor(
        private readonly prefix: string,
        private readonly countKey: string,
        private readonly legacyKey?: string,
        private readonly chunkSize: number = CHUNK_SIZE,
        private readonly maxChunks: number = STORAGE_MAX_CHUNKS,
    ) {}

    load(fallback: T): T {
        try {
            const rawCount = world.getDynamicProperty(this.countKey);
            const count = typeof rawCount === "number" ? rawCount : undefined;
            let raw = "";
            if (count !== undefined) {
                for (let i = 0; i < count; i++) {
                    const part = world.getDynamicProperty(`${this.prefix}${i}`);
                    if (typeof part === "string") raw += part;
                }
            } else if (this.legacyKey) {
                const legacy = world.getDynamicProperty(this.legacyKey);
                if (typeof legacy === "string") raw = legacy;
            }
            return raw ? (JSON.parse(raw) as T) : fallback;
        } catch {
            return fallback;
        }
    }

    save(data: T): void {
        const json = JSON.stringify(data);
        const chunks = Math.ceil(json.length / this.chunkSize);
        for (let i = 0; i < chunks; i++) {
            world.setDynamicProperty(
                `${this.prefix}${i}`,
                json.slice(i * this.chunkSize, (i + 1) * this.chunkSize),
            );
        }
        world.setDynamicProperty(this.countKey, chunks);
        for (let i = chunks; i < this.maxChunks; i++) {
            if (world.getDynamicProperty(`${this.prefix}${i}`) === undefined) break;
            world.setDynamicProperty(`${this.prefix}${i}`, undefined);
        }
    }

    clear(): void {
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

    bytes(data: T): number {
        return JSON.stringify(data).length;
    }
}