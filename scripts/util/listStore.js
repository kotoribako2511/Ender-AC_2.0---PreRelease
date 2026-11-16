import { CHUNK_SIZE, STORAGE_MAX_CHUNKS } from "./constants.js";
export class ExpiringListManager {
    constructor(store, createdAtField) {
        this.store = store;
        this.createdAtField = createdAtField;
        this.list = [];
        this.cachedBytes = 0;
    }
    onAdded(_entry) { }
    onRemoved(_entries) { }
    shouldSkipAdd(_persistentId, _name) {
        return false;
    }
    findExistingIndex(persistentId, name) {
        return this.list.findIndex((e) => e.persistentId === persistentId && e.name === name);
    }
    getList() {
        return this.list;
    }
    getCount() {
        return this.list.length;
    }
    normalizeEntry(raw) {
        const now = Date.now();
        const entry = { ...raw };
        const e = entry;
        if (e[this.createdAtField] === undefined)
            e[this.createdAtField] = now;
        if (e.reason === undefined)
            e.reason = "";
        if (e.expireAt === undefined)
            e.expireAt = null;
        if (e.by === undefined)
            e.by = "Legacy";
        if (e.persistentId === undefined)
            e.persistentId = e.name;
        return entry;
    }
    load() {
        const raw = this.store.load([]);
        this.list.length = 0;
        for (const e of raw)
            this.list.push(this.normalizeEntry(e));
        this.cachedBytes = JSON.stringify(this.list).length;
    }
    save() {
        try {
            this.store.save(this.list);
            this.cachedBytes = JSON.stringify(this.list).length;
        }
        catch (e) {
            console.warn(`[${this.constructor.name}] save failed: ${e}`);
        }
    }
    flushIfDirty() {
        this.save();
    }
    isActive(persistentId, name) {
        const now = Date.now();
        return this.list.some((e) => {
            if (e.expireAt !== null && e.expireAt <= now)
                return false;
            if (persistentId && e.persistentId === persistentId)
                return true;
            if (name && e.name === name)
                return true;
            return false;
        });
    }
    findByName(name) {
        const now = Date.now();
        return this.list.find((e) => e.name === name && (e.expireAt === null || e.expireAt > now));
    }
    findByPersistentId(persistentId) {
        const now = Date.now();
        return this.list.find((e) => e.persistentId === persistentId && (e.expireAt === null || e.expireAt > now));
    }
    add(name, persistentId, reason, durationMs, by) {
        if (this.shouldSkipAdd(persistentId, name))
            return false;
        const entry = this.createEntry(name, persistentId, reason, durationMs, by);
        const idx = this.findExistingIndex(persistentId, name);
        if (idx >= 0)
            this.list[idx] = entry;
        else
            this.list.push(entry);
        this.save();
        this.onAdded(entry);
        return true;
    }
    removeMatching(predicate) {
        const removed = [];
        const kept = [];
        for (const e of this.list) {
            if (predicate(e))
                removed.push(e);
            else
                kept.push(e);
        }
        if (removed.length === 0)
            return [];
        this.list.length = 0;
        for (const e of kept)
            this.list.push(e);
        this.save();
        this.onRemoved(removed);
        return removed;
    }
    removeByName(name) {
        return this.removeMatching((e) => e.name === name);
    }
    cleanExpired() {
        const now = Date.now();
        return this.removeMatching((e) => e.expireAt !== null && e.expireAt <= now).length;
    }
    clear() {
        this.list.length = 0;
        this.cachedBytes = 0;
        this.store.clear();
    }
    getStorageInfo() {
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
