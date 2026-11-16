import { currentConfig } from "../data/config.js";
import { ChunkedStorage } from "./storage.js";
import { safeCall, safeGet } from "./safe.js";

export abstract class TrimmedLogStore<T> {
    constructor(
        protected readonly label: string,
        protected readonly maxEntries: number,
        protected readonly store: ChunkedStorage<T[]>,
    ) {}

    protected logs: T[] = [];
    protected dirty = false;

    protected migrateLoaded(_logs: T[]): boolean { return false; }

    public getLogs(): T[] {
        return this.logs;
    }

    public getCount(): number {
        return this.logs.length;
    }

    public load(): void {
        const raw = safeGet(() => this.store.load([]), [] as T[], `${this.label}.load`);
        this.logs.length = 0;
        for (const e of raw) this.logs.push(e);
        this.dirty = this.migrateLoaded(this.logs);
    }

    public save(): void {
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

    public flushIfDirty(): void {
        if (!this.dirty) return;
        this.save();
    }

    public addLog(entry: T): void {
        this.logs.unshift(entry);
        if (this.logs.length > this.maxEntries) {
            this.logs.pop();
        }
        this.dirty = true;
    }

    public clearLogs(): void {
        this.logs.length = 0;
        this.dirty = false;
        this.store.clear();
    }
}