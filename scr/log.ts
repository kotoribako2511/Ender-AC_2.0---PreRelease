import { world, Player, system } from "@minecraft/server";
import { BlockLogEntry, PlayerAccessLogEntry, AdminActionLogEntry } from "./data/type.js";
import { currentConfig } from "./data/config.js";
import { ChunkedStorage } from "./util/storage.js";
import { safeCall, safeGet } from "./util/safe.js";
import { TrimmedLogStore } from "./util/trimmedLogStore.js";
import {
    CHUNK_SIZE, LOG_BATCH_SIZE, STORAGE_MAX_CHUNKS,
    DEFAULT_MAX_LOGS, LOG_UPPER_BOUND_FACTOR,
} from "./util/constants.js";

type CompactBlockLog = [number, number, number, number, 0 | 1, string, string, number];

export class BlockLogManager {
    private static logs: BlockLogEntry[] = [];
    public static inspectPlayers = new Set<string>();
    private static dirty = false;
    private static cachedBytes = 0;
    private static cachedMaxBytes = CHUNK_SIZE * STORAGE_MAX_CHUNKS;
    private static spatialIndex = new Map<string, BlockLogEntry[]>();
    private static store = new ChunkedStorage<CompactBlockLog[]>(
        "block_logs_", "block_logs_count", "block_logs",
    );

    public static getLogs(): readonly BlockLogEntry[] {
        return this.logs;
    }

    public static getLogCount(): number {
        return this.logs.length;
    }

    private static locationKey(x: number, y: number, z: number, dim: string): string {
        return `${x}:${y}:${z}:${dim}`;
    }

    private static indexEntry(entry: BlockLogEntry): void {
        const key = this.locationKey(entry.x, entry.y, entry.z, entry.dim);
        const bucket = this.spatialIndex.get(key);
        if (bucket) bucket.push(entry);
        else this.spatialIndex.set(key, [entry]);
    }

    private static rebuildIndex(): void {
        this.spatialIndex.clear();
        for (const e of this.logs) this.indexEntry(e);
    }

    private static trimToMax(max: number): void {
        if (this.logs.length <= max) return;
        const keepFrom = this.logs.length - max;
        const toRemove = new Set<BlockLogEntry>();
        for (let i = 0; i < keepFrom; i++) toRemove.add(this.logs[i]);
        this.logs = this.logs.slice(keepFrom);
        for (const [key, bucket] of this.spatialIndex) {
            const filtered = bucket.filter((e) => !toRemove.has(e));
            if (filtered.length === bucket.length) continue;
            if (filtered.length === 0) this.spatialIndex.delete(key);
            else this.spatialIndex.set(key, filtered);
        }
    }

    private static dimToIndex(dim: string): number {
        return dim.includes("nether") ? 1 : dim.includes("end") ? 2 : 0;
    }

    private static indexToDim(idx: number): string {
        return idx === 0 ? "minecraft:overworld" : idx === 1 ? "minecraft:nether" : "minecraft:the_end";
    }

    private static toCompact(e: BlockLogEntry): CompactBlockLog {
        return [
            e.x, e.y, e.z,
            this.dimToIndex(e.dim),
            e.action === "place" ? 1 : 0,
            e.player, e.block, e.time,
        ];
    }

    private static fromCompact(a: CompactBlockLog): BlockLogEntry {
        return {
            x: a[0], y: a[1], z: a[2],
            dim: this.indexToDim(a[3]),
            action: a[4] === 1 ? "place" : "break",
            player: a[5], block: a[6], time: a[7],
        };
    }

    public static loadLogs(): void {
        this.logs = safeGet(() => {
            const arr = this.store.load([]);
            return arr.map((e) => this.fromCompact(e));
        }, [], "BlockLogManager.loadLogs");
        this.dirty = false;
        this.rebuildIndex();
        this.recomputeCachedBytes();
    }

    private static recomputeCachedBytes(): void {
        this.cachedBytes = safeGet(() => {
            const compact = this.logs.map((e) => this.toCompact(e));
            return JSON.stringify(compact).length;
        }, 0, "BlockLogManager.recomputeCachedBytes");
    }

    public static saveLogs(): void {
        safeCall(() => {
            const max = currentConfig.CoreProtect?.maxLogs ?? DEFAULT_MAX_LOGS;
            this.trimToMax(max);
            const compact = this.logs.map((e) => this.toCompact(e));
            this.store.save(compact);
            this.cachedBytes = JSON.stringify(compact).length;
            this.dirty = false;
        }, (e) => {
            console.warn(`${currentConfig.System.prefix} §cBlockLog Save Error: ${e}`);
        }, "BlockLogManager.saveLogs");
    }

    public static flushIfDirty(): void {
        if (!this.dirty) return;
        this.saveLogs();
    }

    public static addLog(entry: BlockLogEntry): void {
        if (!currentConfig.CoreProtect?.enabled) return;
        this.logs.push(entry);
        this.indexEntry(entry);
        const max = currentConfig.CoreProtect?.maxLogs ?? DEFAULT_MAX_LOGS;
        const upperBound = Math.floor(max * LOG_UPPER_BOUND_FACTOR);
        if (this.logs.length > upperBound) {
            this.trimToMax(max);
        }
        this.dirty = true;
    }

    public static async getLogsAtAsync(
        x: number, y: number, z: number, dim: string,
        batchSize = LOG_BATCH_SIZE,
    ): Promise<BlockLogEntry[]> {
        const key = this.locationKey(Math.floor(x), Math.floor(y), Math.floor(z), dim);
        const bucket = this.spatialIndex.get(key);
        if (!bucket || bucket.length === 0) return [];
        const matched: BlockLogEntry[] = [];
        for (let i = bucket.length - 1; i >= 0; i--) {
            matched.push(bucket[i]);
            if (i % batchSize === 0 && i !== 0) {
                await new Promise<void>((resolve) => system.run(resolve));
            }
        }
        return matched;
    }

    public static async getRecentLogsAsync(
        limit = DEFAULT_MAX_LOGS,
        batchSize = LOG_BATCH_SIZE,
    ): Promise<BlockLogEntry[]> {
        const matched: BlockLogEntry[] = [];
        const len = this.logs.length;
        for (let i = len - 1; i >= 0 && matched.length < limit; i--) {
            matched.push(this.logs[i]);
            if (i % batchSize === 0 && i !== 0) {
                await new Promise<void>((resolve) => system.run(resolve));
            }
        }
        return matched;
    }

    public static getLogsAt(x: number, y: number, z: number, dim: string): BlockLogEntry[] {
        const key = this.locationKey(Math.floor(x), Math.floor(y), Math.floor(z), dim);
        const bucket = this.spatialIndex.get(key);
        if (!bucket) return [];
        return bucket.slice().reverse();
    }

    public static toggleInspect(player: Player): boolean {
        if (this.inspectPlayers.has(player.name)) {
            this.inspectPlayers.delete(player.name);
            return false;
        }
        this.inspectPlayers.add(player.name);
        return true;
    }

    public static isInspectMode(player: Player): boolean {
        return this.inspectPlayers.has(player.name);
    }

    public static clearLogs(): void {
        this.logs = [];
        this.spatialIndex.clear();
        this.dirty = false;
        this.cachedBytes = 0;
        this.store.clear();
    }

    public static getStorageInfo(): { count: number; maxLogs: number; bytes: number; maxBytes: number; percent: number } {
        const maxLogs = currentConfig.CoreProtect?.maxLogs ?? DEFAULT_MAX_LOGS;
        const percent = Math.min(100, Math.round((this.cachedBytes / this.cachedMaxBytes) * 100));
        return {
            count: this.logs.length,
            maxLogs,
            bytes: this.cachedBytes,
            maxBytes: this.cachedMaxBytes,
            percent,
        };
    }
}

export interface LogEntry {
    time: number;
    player: string;
    type: string;
    message?: string;
}

export class LogManager {
    private static readonly MAX_LOG_ENTRIES = 30;
    public static logs: LogEntry[] = [];

    public static pushLog(player: Player, type: string, message?: string): void {
        this.logs.unshift({ time: system.currentTick, player: player.name, type, message });
        if (this.logs.length > this.MAX_LOG_ENTRIES) this.logs.pop();
    }

    public static clearLog(): void {
        this.logs.length = 0;
    }
}


class PlayerAccessLogStoreImpl extends TrimmedLogStore<PlayerAccessLogEntry> {
    constructor() {
        super(
            "PlayerAccessLog",
            1000,
            new ChunkedStorage<PlayerAccessLogEntry[]>(
                "player_access_logs_",
                "player_access_logs_count",
                "player_access_logs",
            ),
        );
    }

    protected migrateLoaded(logs: PlayerAccessLogEntry[]): boolean {
        let migrated = false;
        for (let i = 0; i < logs.length; i++) {
            if ((logs[i].type as string) === "spwan") {
                logs[i] = { ...logs[i], type: "spawn" as const };
                migrated = true;
            }
        }
        return migrated;
    }
}

const playerAccessLogStore = new PlayerAccessLogStoreImpl();

export class PlayerAccessLogManager {
    public static readonly logs: PlayerAccessLogEntry[] = playerAccessLogStore.getLogs();

    public static loadLogs(): void { playerAccessLogStore.load(); }
    public static saveLogs(): void { playerAccessLogStore.save(); }
    public static flushIfDirty(): void { playerAccessLogStore.flushIfDirty(); }
    public static addLog(entry: PlayerAccessLogEntry): void { playerAccessLogStore.addLog(entry); }
    public static clearLogs(): void { playerAccessLogStore.clearLogs(); }
}

class AdminActionLogStoreImpl extends TrimmedLogStore<AdminActionLogEntry> {
    constructor() {
        super(
            "AdminActionLog",
            2000,
            new ChunkedStorage<AdminActionLogEntry[]>(
                "admin_action_logs_",
                "admin_action_logs_count",
                "admin_action_logs",
            ),
        );
    }
}

const adminActionLogStore = new AdminActionLogStoreImpl();

export class AdminActionLogManager {
    public static readonly logs: AdminActionLogEntry[] = adminActionLogStore.getLogs();

    public static loadLogs(): void { adminActionLogStore.load(); }
    public static saveLogs(): void { adminActionLogStore.save(); }
    public static flushIfDirty(): void { adminActionLogStore.flushIfDirty(); }
    public static addLog(entry: AdminActionLogEntry): void { adminActionLogStore.addLog(entry); }
    public static clearLogs(): void { adminActionLogStore.clearLogs(); }
}