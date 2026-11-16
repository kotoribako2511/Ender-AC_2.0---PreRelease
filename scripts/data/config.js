import { world } from "@minecraft/server";
import { deepMerge } from "../util/deepMerge.js";
import { ChunkedStorage } from "../util/storage.js";
import { TAG_KEYS, DP_KEYS } from "../util/constants.js";
import { ExpiringListManager } from "../util/listStore.js";
import { DefaultConfig } from "./lists/main_list.js";
export let currentConfig = JSON.parse(JSON.stringify(DefaultConfig));
export let illegalBlockSet = new Set();
export let resetBlockSet = new Set();
export let IllegalItems = new Set();
export let illegalEntity = new Set();
export let noticeEntity = new Set();
export let resetEntity = new Set();
export let illegalEggSet = new Set();
export let illegalInstaBreakSet = new Set();
export let banList = [];
export let muteList = [];
export const SessionIdMap = new Map();
const configStore = new ChunkedStorage(DP_KEYS.configPrefix, DP_KEYS.configChunks, DP_KEYS.config);
const banStore = new ChunkedStorage(DP_KEYS.banPrefix, DP_KEYS.banChunks, DP_KEYS.banLegacy);
const muteStore = new ChunkedStorage(DP_KEYS.mutePrefix, DP_KEYS.muteChunks, DP_KEYS.muteList);
export class ConfigManager {
    static loadConfig() {
        try {
            let parsed = null;
            const legacyExists = world.getDynamicProperty(DP_KEYS.config) !== undefined;
            const countRaw = world.getDynamicProperty(DP_KEYS.configChunks);
            const hasChunks = typeof countRaw === "number" && countRaw > 0;
            if (hasChunks) {
                const loaded = configStore.load(null);
                if (loaded !== null)
                    parsed = loaded;
            }
            if (parsed === null && legacyExists) {
                const legacy = world.getDynamicProperty(DP_KEYS.config);
                if (typeof legacy === "string" && legacy.length > 0) {
                    try {
                        parsed = JSON.parse(legacy);
                    }
                    catch (e) {
                        console.warn(`${DefaultConfig.System.prefix} §cLegacy config parse failed: ${e}`);
                    }
                }
            }
            if (parsed === null)
                parsed = {};
            currentConfig = deepMerge(JSON.parse(JSON.stringify(DefaultConfig)), parsed);
            this.migrateReachNotice(currentConfig);
            this.migrateTeleportSafeZones(currentConfig);
            this.migratePunishmentFields(currentConfig);
            this.updateSets();
            try {
                configStore.save(currentConfig);
                if (legacyExists) {
                    world.setDynamicProperty(DP_KEYS.config, undefined);
                }
            }
            catch (e) {
                console.warn(`${DefaultConfig.System.prefix} §cConfig persist failed: ${e}`);
            }
        }
        catch (e) {
            console.warn(`${DefaultConfig.System.prefix} §cConfig Load Error, using defaults: ${e}`);
            currentConfig = JSON.parse(JSON.stringify(DefaultConfig));
            this.updateSets();
        }
    }
    static saveConfig(newConfig) {
        currentConfig = newConfig;
        this.updateSets();
        try {
            configStore.save(newConfig);
            const verify = configStore.load(null);
            if (verify === null) {
                console.warn(`${DefaultConfig.System.prefix} §cConfig verification failed, keeping legacy.`);
                return;
            }
            if (world.getDynamicProperty(DP_KEYS.config) !== undefined) {
                world.setDynamicProperty(DP_KEYS.config, undefined);
            }
        }
        catch (e) {
            console.warn(`${DefaultConfig.System.prefix} §cConfig Save Error: ${e}`);
        }
    }
    static migrateReachNotice(cfg) {
        const raw = cfg.Reach;
        if (!raw)
            return;
        if (!raw.notice) {
            raw.hitPunishment = "none";
            raw.breakPunishment = "none";
            raw.placePunishment = "none";
        }
        delete raw.notice;
    }
    static migrateTeleportSafeZones(cfg) {
        const zones = cfg.Teleport?.safeZones;
        if (!Array.isArray(zones))
            return;
        for (let i = 0; i < zones.length; i++) {
            const raw = zones[i];
            if (typeof raw.x1 === "number")
                continue;
            if (typeof raw.radiusX !== "number")
                continue;
            const cx = Number(raw.x) || 0;
            const cy = Number(raw.y) || 0;
            const cz = Number(raw.z) || 0;
            const rx = Number(raw.radiusX) || 0;
            const ry = Number(raw.radiusY) || 0;
            const rz = Number(raw.radiusZ) || 0;
            zones[i] = {
                name: String(raw.name ?? ""),
                x1: cx - rx, y1: cy - ry, z1: cz - rz,
                x2: cx + rx, y2: cy + ry, z2: cz + rz,
                dim: String(raw.dim ?? "minecraft:overworld"),
            };
        }
    }
    static migratePunishmentFields(cfg) {
        const migratePair = (obj, field, secondsField, nestedField) => {
            if (!obj || typeof obj !== "object")
                return;
            const o = obj;
            if (o[field] !== undefined) {
                const seconds = typeof o[secondsField] === "number" ? o[secondsField] : 30;
                o[nestedField] = { type: o[field], seconds };
                delete o[field];
                delete o[secondsField];
            }
        };
        migratePair(cfg.Reach, "hitPunishment", "hitTempkickSeconds", "hit");
        migratePair(cfg.Reach, "breakPunishment", "breakTempkickSeconds", "break");
        migratePair(cfg.Reach, "placePunishment", "placeTempkickSeconds", "place");
        migratePair(cfg.Killaura, "sleepPunishment", "sleepTempkickSeconds", "sleep");
        migratePair(cfg.Killaura, "multiHitPunishment", "multiHitTempkickSeconds", "multiHit");
        migratePair(cfg.NoSwing, "hitPunishment", "hitTempkickSeconds", "hit");
        migratePair(cfg.NoSwing, "breakPunishment", "breakTempkickSeconds", "break");
        migratePair(cfg.NoSwing, "placePunishment", "placeTempkickSeconds", "place");
        migratePair(cfg.Speed, "punishment", "tempkickSeconds", "punish");
        migratePair(cfg.BDSFly, "punishment", "tempkickSeconds", "punish");
        migratePair(cfg.Step, "punishment", "tempkickSeconds", "punish");
        migratePair(cfg.NoClip, "punishment", "tempkickSeconds", "punish");
        migratePair(cfg.Phase, "punishment", "tempkickSeconds", "punish");
        migratePair(cfg.FastFall, "punishment", "tempkickSeconds", "punish");
        migratePair(cfg.NoSlow, "punishment", "tempkickSeconds", "punish");
        migratePair(cfg.AirSwim, "punishment", "tempkickSeconds", "punish");
        migratePair(cfg.Nuker, "punishment", "tempkickSeconds", "punish");
        migratePair(cfg.cps, "punishment", "tempkickSeconds", "punish");
        migratePair(cfg.InstaBreak, "punishment", "tempkickSeconds", "punish");
        migratePair(cfg.Scaffold, "punishment", "tempkickSeconds", "punish");
        migratePair(cfg.Nofall, "aBetaPunishment", "aBetaTempkickSeconds", "aBeta");
        migratePair(cfg.Nofall, "onGroSpfPunishment", "onGroSpfTempkickSeconds", "onGroSpf");
        migratePair(cfg.Nofall, "slowFallPunishment", "slowFallTempkickSeconds", "slowFall");
        migratePair(cfg.Nofall, "fallSpoofPunishment", "fallSpoofTempkickSeconds", "fallSpoof");
        migratePair(cfg.Contradiction, "sprintSneakPunishment", "sprintSneakTempkickSeconds", "sprintSneakPunish");
        migratePair(cfg.Contradiction, "groundFallPunishment", "groundFallTempkickSeconds", "groundFallPunish");
        migratePair(cfg.Contradiction, "fallDecelPunishment", "fallDecelTempkickSeconds", "fallDecelPunish");
        const migrateFlyVariant = (prefix) => {
            const fly = cfg.Fly;
            if (!fly)
                return;
            const punishField = `${prefix}Punishment`;
            const secondsField = `${prefix}TempkickSeconds`;
            const enabledField = `${prefix}Enabled`;
            const freezeField = `${prefix}FreezeTicks`;
            if (fly[punishField] !== undefined || fly[enabledField] !== undefined) {
                const current = fly[prefix] ?? undefined;
                const wasFlat = fly[punishField] !== undefined;
                fly[prefix] = {
                    enabled: fly[enabledField] ?? current?.enabled ?? true,
                    freezeTicks: fly[freezeField] ?? current?.freezeTicks ?? 200,
                    punish: wasFlat
                        ? { type: fly[punishField], seconds: fly[secondsField] ?? 30 }
                        : (current?.punish ?? { type: "freeze_setback", seconds: 30 }),
                };
                delete fly[enabledField];
                delete fly[freezeField];
                delete fly[punishField];
                delete fly[secondsField];
            }
        };
        migrateFlyVariant("flyA");
        migrateFlyVariant("flyC");
        migrateFlyVariant("flyG");
    }
    static updateSets() {
        illegalBlockSet = new Set(currentConfig.BlockPlace.illegalBlocks);
        resetBlockSet = new Set(currentConfig.BlockPlace.resetBlocks ?? []);
        IllegalItems = new Set(currentConfig.IllegalItem.customItems);
        illegalEntity = new Set(currentConfig.entity.IllegalEntities);
        noticeEntity = new Set(currentConfig.entity.NoticeEntities);
        resetEntity = new Set(currentConfig.entity.ResetEntities);
        illegalEggSet = new Set(currentConfig.SpawnEgg.illegalEggs ?? []);
        illegalInstaBreakSet = new Set(currentConfig.InstaBreak.illegalBlocks ?? []);
    }
}
export function patchConfig(key, patch) {
    ConfigManager.saveConfig({
        ...currentConfig,
        [key]: deepMerge(currentConfig[key], patch),
    });
}
class BanManagerImpl extends ExpiringListManager {
    constructor() {
        super(banStore, "bannedAt");
    }
    createEntry(name, persistentId, reason, durationMs, by) {
        return {
            name,
            persistentId,
            reason,
            bannedAt: Date.now(),
            expireAt: durationMs !== null ? Date.now() + durationMs : null,
            by,
        };
    }
}
const banManagerInstance = new BanManagerImpl();
banList = banManagerInstance.getList();
export class BanManager {
    static loadBanConfig() {
        banManagerInstance.load();
    }
    static saveBanList() {
        banManagerInstance.save();
    }
    static addBanList(name, persistentId, reason = "", durationMs = null, by = "System") {
        banManagerInstance.add(name, persistentId, reason, durationMs, by);
    }
    static removeBanList(persistentId, name) {
        if (name !== undefined) {
            banManagerInstance.removeMatching((b) => b.persistentId === persistentId && b.name === name);
        }
        else {
            banManagerInstance.removeMatching((b) => b.persistentId === persistentId);
        }
    }
    static isBanned(persistentId, name) {
        return banManagerInstance.isActive(persistentId, name);
    }
    static findByName(name) {
        return banManagerInstance.findByName(name);
    }
    static findByPersistentId(persistentId) {
        return banManagerInstance.findByPersistentId(persistentId);
    }
    static cleanExpired() {
        return banManagerInstance.cleanExpired();
    }
    static getStorageInfo() {
        return banManagerInstance.getStorageInfo();
    }
}
class MuteManagerImpl extends ExpiringListManager {
    constructor() {
        super(muteStore, "mutedAt");
    }
    createEntry(name, persistentId, reason, durationMs, by) {
        return {
            name,
            persistentId,
            reason,
            mutedAt: Date.now(),
            expireAt: durationMs !== null ? Date.now() + durationMs : null,
            by,
        };
    }
    shouldSkipAdd(persistentId, name) {
        return this.isActive(persistentId, name);
    }
    onAdded(entry) {
        for (const p of world.getPlayers()) {
            if (p.name === entry.name) {
                try {
                    p.addTag(TAG_KEYS.mute);
                }
                catch { /* noop */ }
            }
        }
    }
    onRemoved(entries) {
        if (entries.length === 0)
            return;
        const names = new Set(entries.map((e) => e.name));
        for (const p of world.getPlayers()) {
            if (names.has(p.name) && p.hasTag(TAG_KEYS.mute)) {
                try {
                    p.removeTag(TAG_KEYS.mute);
                }
                catch { /* noop */ }
            }
        }
    }
}
const muteManagerInstance = new MuteManagerImpl();
muteList = muteManagerInstance.getList();
export class MuteManager {
    static loadMuteConfig() {
        muteManagerInstance.load();
    }
    static saveMuteList() {
        muteManagerInstance.save();
    }
    static isMuted(name, persistentId) {
        if (muteManagerInstance.isActive(persistentId, name))
            return true;
        for (const p of world.getPlayers()) {
            if (p.name === name && p.hasTag(TAG_KEYS.mute))
                return true;
        }
        return false;
    }
    static getEntry(name) {
        return muteManagerInstance.findByName(name);
    }
    static mute(name, persistentId, reason = "", durationMs = null, by = "System") {
        return muteManagerInstance.add(name, persistentId, reason, durationMs, by);
    }
    static unmute(name) {
        let removed = muteManagerInstance.removeByName(name).length > 0;
        for (const p of world.getPlayers()) {
            if (p.name === name && p.hasTag(TAG_KEYS.mute)) {
                try {
                    p.removeTag(TAG_KEYS.mute);
                }
                catch { /* noop */ }
                removed = true;
            }
        }
        return removed;
    }
    static cleanExpired() {
        return muteManagerInstance.cleanExpired();
    }
    static getMutedPlayers() {
        return world.getPlayers().filter((p) => this.isMuted(p.name));
    }
    static getStorageInfo() {
        return muteManagerInstance.getStorageInfo();
    }
}
export class WhitelistManager {
    static isWhitelisted(name, persistentId) {
        if (!currentConfig.Whitelist?.enabled)
            return true;
        return currentConfig.Whitelist.players.some((p) => p.name === name || (persistentId && p.persistentId === persistentId));
    }
    static addWhitelist(name, persistentId) {
        if (!currentConfig.Whitelist)
            currentConfig.Whitelist = { enabled: false, players: [] };
        if (!this.isWhitelisted(name, persistentId)) {
            currentConfig.Whitelist.players.push({ name, persistentId });
            ConfigManager.saveConfig(currentConfig);
        }
    }
    static removeWhitelist(name) {
        if (!currentConfig.Whitelist)
            return;
        currentConfig.Whitelist.players = currentConfig.Whitelist.players.filter((p) => p.name !== name);
        ConfigManager.saveConfig(currentConfig);
    }
}
