import { currentConfig } from "../data/config.js";
import { safeCall, safeGet } from "./safe.js";
export class TrimmedLogStore {
    constructor(label, maxEntries, store) {
        this.label = label;
        this.maxEntries = maxEntries;
        this.store = store;
        this.logs = [];
        this.dirty = false;
    }
    migrateLoaded(_logs) { return false; }
    getLogs() {
        return this.logs;
    }
    getCount() {
        return this.logs.length;
    }
    load() {
        const raw = safeGet(() => this.store.load([]), [], `${this.label}.load`);
        this.logs.length = 0;
        for (const e of raw)
            this.logs.push(e);
        this.dirty = this.migrateLoaded(this.logs);
    }
    save() {
        safeCall(() => {
            if (this.logs.length > this.maxEntries) {
                this.logs.splice(0, this.logs.length - this.maxEntries);
            }
            this.store.save(this.logs);
            this.dirty = false;
        }, (e) => {
            console.warn(`${currentConfig.System.prefix} §c${this.label} Save Error: ${e}`);
        }, `${this.label}.save`);
    }
    flushIfDirty() {
        if (!this.dirty)
            return;
        this.save();
    }
    addLog(entry) {
        this.logs.unshift(entry);
        if (this.logs.length > this.maxEntries) {
            this.logs.pop();
        }
        this.dirty = true;
    }
    clearLogs() {
        this.logs.length = 0;
        this.dirty = false;
        this.store.clear();
    }
}
