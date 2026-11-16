import { ChunkedStorage } from "./storage.js";
import { CHUNK_SIZE, STORAGE_MAX_CHUNKS } from "./constants.js";

export interface ExpiringEntry {
    name: string;
    persistentId: string;
    reason?: string;
    expireAt: number | null;
    by: string;
}

export abstract class ExpiringListManager<T extends ExpiringEntry> {
    constructor(
        protected readonly store: ChunkedStorage<T[]>,
        protected readonly createdAtField: "bannedAt" | "mutedAt",
    ) {}

    protected list: T[] = [];
    protected cachedBytes = 0;

    protected abstract createEntry(
        name: string,
        persistentId: string,
        reason: string,
        durationMs: number | null,
        by: string,
    ): T;

    protected onAdded(_entry: T): void { /* noop */ }

    protected onRemoved(_entries: T[]): void { /* noop */ }

    protected shouldSkipAdd(_persistentId: string, _name: string): boolean {
        return false;
    }

    protected findExistingIndex(persistentId: string, name: string): number {
        return this.list.findIndex((e) => e.persistentId === persistentId && e.name === name);
    }

    public getList(): T[] {
        return this.list;
    }

    public getCount(): number {
        return this.list.length;
    }

    protected normalizeEntry(raw: T): T {
        const now = Date.now();
        const entry = { ...raw } as T;
        const e = entry as Record<string, unknown>;
        if (e[this.createdAtField] === undefined) e[this.createdAtField] = now;
        if (e.reason === undefined) e.reason = "";
        if (e.expireAt === undefined) e.expireAt = null;
        if (e.by === undefined) e.by = "Legacy";
        if (e.persistentId === undefined) e.persistentId = e.name;
        return entry;
    }

    public load(): void {
        const raw = this.store.load([]);
        this.list.length = 0;
        for (const e of raw) this.list.push(this.normalizeEntry(e));
        this.cachedBytes = JSON.stringify(this.list).length;
    }

    public save(): void {
        try {
            this.store.save(this.list);
            this.cachedBytes = JSON.stringify(this.list).length;
        } catch (e) {
            console.warn(`[${this.constructor.name}] save failed: ${e}`);
        }
    }

    public flushIfDirty(): void {
        this.save();
    }

    public isActive(persistentId: string | undefined, name?: string): boolean {
        const now = Date.now();
        return this.list.some((e) => {
            if (e.expireAt !== null && e.expireAt <= now) return false;
            if (persistentId && e.persistentId === persistentId) return true;
            if (name && e.name === name) return true;
            return false;
        });
    }

    public findByName(name: string): T | undefined {
        const now = Date.now();
        return this.list.find((e) => e.name === name && (e.expireAt === null || e.expireAt > now));
    }

    public findByPersistentId(persistentId: string): T | undefined {
        const now = Date.now();
        return this.list.find((e) => e.persistentId === persistentId && (e.expireAt === null || e.expireAt > now));
    }

    public add(
        name: string,
        persistentId: string,
        reason: string,
        durationMs: number | null,
        by: string,
    ): boolean {
        if (this.shouldSkipAdd(persistentId, name)) return false;
        const entry = this.createEntry(name, persistentId, reason, durationMs, by);
        const idx = this.findExistingIndex(persistentId, name);
        if (idx >= 0) this.list[idx] = entry;
        else this.list.push(entry);
        this.save();
        this.onAdded(entry);
        return true;
    }

    public removeMatching(predicate: (e: T) => boolean): T[] {
        const removed: T[] = [];
        const kept: T[] = [];
        for (const e of this.list) {
            if (predicate(e)) removed.push(e);
            else kept.push(e);
        }
        if (removed.length === 0) return [];
        this.list.length = 0;
        for (const e of kept) this.list.push(e);
        this.save();
        this.onRemoved(removed);
        return removed;
    }

    public removeByName(name: string): T[] {
        return this.removeMatching((e) => e.name === name);
    }

    public cleanExpired(): number {
        const now = Date.now();
        return this.removeMatching((e) => e.expireAt !== null && e.expireAt <= now).length;
    }

    public clear(): void {
        this.list.length = 0;
        this.cachedBytes = 0;
        this.store.clear();
    }

    public getStorageInfo(): { count: number; bytes: number; maxBytes: number; percent: number } {
        const bytes = this.cachedBytes;
        const maxBytes = CHUNK_SIZE * STORAGE_MAX_CHUNKS;
        return {
            count: this.list.length,
            bytes,
            maxBytes,
            percent: Math.min(100, Math.round((bytes / maxBytes) * 100)),
        };
    }
}