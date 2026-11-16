import { system } from "@minecraft/server";
import { currentConfig } from "./data/config.js";
import { ChunkedStorage } from "./util/storage.js";
import { safeCall, safeGet } from "./util/safe.js";
import { TrimmedLogStore } from "./util/trimmedLogStore.js";
import { CHUNK_SIZE, LOG_BATCH_SIZE, STORAGE_MAX_CHUNKS, DEFAULT_MAX_LOGS, LOG_UPPER_BOUND_FACTOR, } from "./util/constants.js";
export class BlockLogManager {
    static getLogs() {
        return this.logs;
    }
    static getLogCount() {
        return this.logs.length;
    }
    static locationKey(x, y, z, dim) {
        return `${x}:${y}:${z}:${dim}`;
    }
    static indexEntry(entry) {
        const key = this.locationKey(entry.x, entry.y, entry.z, entry.dim);
        const bucket = this.spatialIndex.get(key);
        if (bucket)
            bucket.push(entry);
        else
            this.spatialIndex.set(key, [entry]);
    }
    static rebuildIndex() {
        this.spatialIndex.clear();
        for (const e of this.logs)
            this.indexEntry(e);
    }
    static trimToMax(max) {
        if (this.logs.length <= max)
            return;
        const keepFrom = this.logs.length - max;
        const toRemove = new Set();
        for (let i = 0; i < keepFrom; i++)
            toRemove.add(this.logs[i]);
        this.logs = this.logs.slice(keepFrom);
        for (const [key, bucket] of this.spatialIndex) {
            const filtered = bucket.filter((e) => !toRemove.has(e));
            if (filtered.length === bucket.length)
                continue;
            if (filtered.length === 0)
                this.spatialIndex.delete(key);
            else
                this.spatialIndex.set(key, filtered);
        }
    }
    static dimToIndex(dim) {
        return dim.includes("nether") ? 1 : dim.includes("end") ? 2 : 0;
    }
    static indexToDim(idx) {
        return idx === 0 ? "minecraft:overworld" : idx === 1 ? "minecraft:nether" : "minecraft:the_end";
    }
    static toCompact(e) {
        return [
            e.x, e.y, e.z,
            this.dimToIndex(e.dim),
            e.action === "place" ? 1 : 0,
            e.player, e.block, e.time,
        ];
    }
    static fromCompact(a) {
        return {
            x: a[0], y: a[1], z: a[2],
            dim: this.indexToDim(a[3]),
            action: a[4] === 1 ? "place" : "break",
            player: a[5], block: a[6], time: a[7],
        };
    }
    static loadLogs() {
        this.logs = safeGet(() => {
            const arr = this.store.load([]);
            return arr.map((e) => this.fromCompact(e));
        }, [], "BlockLogManager.loadLogs");
        this.dirty = false;
        this.rebuildIndex();
        this.recomputeCachedBytes();
    }
    static recomputeCachedBytes() {
        this.cachedBytes = safeGet(() => {
            const compact = this.logs.map((e) => this.toCompact(e));
            return JSON.stringify(compact).length;
        }, 0, "BlockLogManager.recomputeCachedBytes");
    }
    static saveLogs() {
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
    static flushIfDirty() {
        if (!this.dirty)
            return;
        this.saveLogs();
    }
    static addLog(entry) {
        if (!currentConfig.CoreProtect?.enabled)
            return;
        this.logs.push(entry);
        this.indexEntry(entry);
        const max = currentConfig.CoreProtect?.maxLogs ?? DEFAULT_MAX_LOGS;
        const upperBound = Math.floor(max * LOG_UPPER_BOUND_FACTOR);
        if (this.logs.length > upperBound) {
            this.trimToMax(max);
        }
        this.dirty = true;
    }
    static async getLogsAtAsync(x, y, z, dim, batchSize = LOG_BATCH_SIZE) {
        const key = this.locationKey(Math.floor(x), Math.floor(y), Math.floor(z), dim);
        const bucket = this.spatialIndex.get(key);
        if (!bucket || bucket.length === 0)
            return [];
        const matched = [];
        for (let i = bucket.length - 1; i >= 0; i--) {
            matched.push(bucket[i]);
            if (i % batchSize === 0 && i !== 0) {
                await new Promise((resolve) => system.run(resolve));
            }
        }
        return matched;
    }
    static async getRecentLogsAsync(limit = DEFAULT_MAX_LOGS, batchSize = LOG_BATCH_SIZE) {
        const matched = [];
        const len = this.logs.length;
        for (let i = len - 1; i >= 0 && matched.length < limit; i--) {
            matched.push(this.logs[i]);
            if (i % batchSize === 0 && i !== 0) {
                await new Promise((resolve) => system.run(resolve));
            }
        }
        return matched;
    }
    static getLogsAt(x, y, z, dim) {
        const key = this.locationKey(Math.floor(x), Math.floor(y), Math.floor(z), dim);
        const bucket = this.spatialIndex.get(key);
        if (!bucket)
            return [];
        return bucket.slice().reverse();
    }
    static toggleInspect(player) {
        if (this.inspectPlayers.has(player.name)) {
            this.inspectPlayers.delete(player.name);
            return false;
        }
        this.inspectPlayers.add(player.name);
        return true;
    }
    static isInspectMode(player) {
        return this.inspectPlayers.has(player.name);
    }
    static clearLogs() {
        this.logs = [];
        this.spatialIndex.clear();
        this.dirty = false;
        this.cachedBytes = 0;
        this.store.clear();
    }
    static getStorageInfo() {
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
BlockLogManager.logs = [];
BlockLogManager.inspectPlayers = new Set();
BlockLogManager.dirty = false;
BlockLogManager.cachedBytes = 0;
BlockLogManager.cachedMaxBytes = CHUNK_SIZE * STORAGE_MAX_CHUNKS;
BlockLogManager.spatialIndex = new Map();
BlockLogManager.store = new ChunkedStorage("block_logs_", "block_logs_count", "block_logs");
export class LogManager {
    static pushLog(player, type, message) {
        this.logs.unshift({ time: system.currentTick, player: player.name, type, message });
        if (this.logs.length > this.MAX_LOG_ENTRIES)
            this.logs.pop();
    }
    static clearLog() {
        this.logs.length = 0;
    }
}
LogManager.MAX_LOG_ENTRIES = 30;
LogManager.logs = [];
class PlayerAccessLogStoreImpl extends TrimmedLogStore {
    constructor() {
        super("PlayerAccessLog", 1000, new ChunkedStorage("player_access_logs_", "player_access_logs_count", "player_access_logs"));
    }
    migrateLoaded(logs) {
        let migrated = false;
        for (let i = 0; i < logs.length; i++) {
            if (logs[i].type === "spwan") {
                logs[i] = { ...logs[i], type: "spawn" };
                migrated = true;
            }
        }
        return migrated;
    }
}
const playerAccessLogStore = new PlayerAccessLogStoreImpl();
export class PlayerAccessLogManager {
    static loadLogs() { playerAccessLogStore.load(); }
    static saveLogs() { playerAccessLogStore.save(); }
    static flushIfDirty() { playerAccessLogStore.flushIfDirty(); }
    static addLog(entry) { playerAccessLogStore.addLog(entry); }
    static clearLogs() { playerAccessLogStore.clearLogs(); }
}
PlayerAccessLogManager.logs = playerAccessLogStore.getLogs();
class AdminActionLogStoreImpl extends TrimmedLogStore {
    constructor() {
        super("AdminActionLog", 2000, new ChunkedStorage("admin_action_logs_", "admin_action_logs_count", "admin_action_logs"));
    }
}
const adminActionLogStore = new AdminActionLogStoreImpl();
export class AdminActionLogManager {
    static loadLogs() { adminActionLogStore.load(); }
    static saveLogs() { adminActionLogStore.save(); }
    static flushIfDirty() { adminActionLogStore.flushIfDirty(); }
    static addLog(entry) { adminActionLogStore.addLog(entry); }
    static clearLogs() { adminActionLogStore.clearLogs(); }
}
AdminActionLogManager.logs = adminActionLogStore.getLogs();
