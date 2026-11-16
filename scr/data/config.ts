import { world, Player } from "@minecraft/server";
import { ACConfig, BanEntry, MuteEntry, PunishmentPair, FlyVariantConfig } from "./type.js";
import { deepMerge } from "../util/deepMerge.js";
import { ChunkedStorage } from "../util/storage.js";
import { TAG_KEYS, DP_KEYS } from "../util/constants.js";
import { ExpiringListManager } from "../util/listStore.js";
import { DefaultConfig } from "./lists/main_list.js";

export let currentConfig: ACConfig = JSON.parse(JSON.stringify(DefaultConfig));
export let illegalBlockSet = new Set<string>();
export let resetBlockSet = new Set<string>();
export let IllegalItems = new Set<string>();
export let illegalEntity = new Set<string>();
export let noticeEntity = new Set<string>();
export let resetEntity = new Set<string>();
export let illegalEggSet = new Set<string>();
export let illegalInstaBreakSet = new Set<string>();

export let banList: BanEntry[] = [];
export let muteList: MuteEntry[] = [];
export const SessionIdMap = new Map<string, string>();

const configStore = new ChunkedStorage<Partial<ACConfig> | null>(
    DP_KEYS.configPrefix,
    DP_KEYS.configChunks,
    DP_KEYS.config,
);
const banStore = new ChunkedStorage<BanEntry[]>(DP_KEYS.banPrefix, DP_KEYS.banChunks, DP_KEYS.banLegacy);
const muteStore = new ChunkedStorage<MuteEntry[]>(DP_KEYS.mutePrefix, DP_KEYS.muteChunks, DP_KEYS.muteList);

export class ConfigManager {
    public static loadConfig(): void {
        try {
            let parsed: unknown = null;
            const legacyExists = world.getDynamicProperty(DP_KEYS.config) !== undefined;
            const countRaw = world.getDynamicProperty(DP_KEYS.configChunks);
            const hasChunks = typeof countRaw === "number" && countRaw > 0;

            if (hasChunks) {
                const loaded = configStore.load(null);
                if (loaded !== null) parsed = loaded;
            }

            if (parsed === null && legacyExists) {
                const legacy = world.getDynamicProperty(DP_KEYS.config);
                if (typeof legacy === "string" && legacy.length > 0) {
                    try {
                        parsed = JSON.parse(legacy);
                    } catch (e) {
                        console.warn(`${DefaultConfig.System.prefix} §cLegacy config parse failed: ${e}`);
                    }
                }
            }

            if (parsed === null) parsed = {};

            currentConfig = deepMerge(
                JSON.parse(JSON.stringify(DefaultConfig)) as ACConfig,
                parsed,
            );
            this.migrateReachNotice(currentConfig);
            this.migrateTeleportSafeZones(currentConfig);
            this.migratePunishmentFields(currentConfig);
            this.updateSets();

            try {
                configStore.save(currentConfig);
                if (legacyExists) {
                    world.setDynamicProperty(DP_KEYS.config, undefined);
                }
            } catch (e) {
                console.warn(`${DefaultConfig.System.prefix} §cConfig persist failed: ${e}`);
            }
        } catch (e) {
            console.warn(`${DefaultConfig.System.prefix} §cConfig Load Error, using defaults: ${e}`);
            currentConfig = JSON.parse(JSON.stringify(DefaultConfig));
            this.updateSets();
        }
    }

    public static saveConfig(newConfig: ACConfig): void {
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
        } catch (e) {
            console.warn(`${DefaultConfig.System.prefix} §cConfig Save Error: ${e}`);
        }
    }

    private static migrateReachNotice(cfg: ACConfig): void {
        const raw = cfg.Reach as unknown as Record<string, unknown>;
        if (!raw) return;
        if (!raw.notice) {
            raw.hitPunishment = "none";
            raw.breakPunishment = "none";
            raw.placePunishment = "none";
        }
        delete raw.notice;
    }

    private static migrateTeleportSafeZones(cfg: ACConfig): void {
        const zones = cfg.Teleport?.safeZones;
        if (!Array.isArray(zones)) return;
        for (let i = 0; i < zones.length; i++) {
            const raw = zones[i] as unknown as Record<string, unknown>;
            if (typeof raw.x1 === "number") continue;
            if (typeof raw.radiusX !== "number") continue;
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

    private static migratePunishmentFields(cfg: ACConfig): void {
        const migratePair = (obj: unknown, field: string, secondsField: string, nestedField: string): void => {
            if (!obj || typeof obj !== "object") return;
            const o = obj as Record<string, unknown>;
            if (o[field] !== undefined) {
                const seconds = typeof o[secondsField] === "number" ? o[secondsField] as number : 30;
                o[nestedField] = { type: o[field], seconds } as PunishmentPair;
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

        const migrateFlyVariant = (prefix: string): void => {
            const fly = cfg.Fly as unknown as Record<string, unknown>;
            if (!fly) return;
            const punishField = `${prefix}Punishment`;
            const secondsField = `${prefix}TempkickSeconds`;
            const enabledField = `${prefix}Enabled`;
            const freezeField = `${prefix}FreezeTicks`;

            if (fly[punishField] !== undefined || fly[enabledField] !== undefined) {
                const current = (fly[prefix] as FlyVariantConfig | undefined) ?? undefined;
                const wasFlat = fly[punishField] !== undefined;
                fly[prefix] = {
                    enabled: (fly[enabledField] as boolean | undefined) ?? current?.enabled ?? true,
                    freezeTicks: (fly[freezeField] as number | undefined) ?? current?.freezeTicks ?? 200,
                    punish: wasFlat
                        ? { type: fly[punishField] as PunishmentPair["type"], seconds: (fly[secondsField] as number | undefined) ?? 30 }
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

    private static updateSets(): void {
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

export function patchConfig<K extends keyof ACConfig>(key: K, patch: Partial<ACConfig[K]>): void {
    ConfigManager.saveConfig({
        ...currentConfig,
        [key]: deepMerge(currentConfig[key], patch),
    } as ACConfig);
}

class BanManagerImpl extends ExpiringListManager<BanEntry> {
    constructor() {
        super(banStore, "bannedAt");
    }

    protected createEntry(
        name: string,
        persistentId: string,
        reason: string,
        durationMs: number | null,
        by: string,
    ): BanEntry {
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
    public static loadBanConfig(): void {
        banManagerInstance.load();
    }

    public static saveBanList(): void {
        banManagerInstance.save();
    }

    public static addBanList(
        name: string,
        persistentId: string,
        reason: string = "",
        durationMs: number | null = null,
        by: string = "System",
    ): void {
        banManagerInstance.add(name, persistentId, reason, durationMs, by);
    }

    public static removeBanList(persistentId: string, name?: string): void {
        if (name !== undefined) {
            banManagerInstance.removeMatching(
                (b) => b.persistentId === persistentId && b.name === name,
            );
        } else {
            banManagerInstance.removeMatching((b) => b.persistentId === persistentId);
        }
    }

    public static isBanned(persistentId: string | undefined, name?: string): boolean {
        return banManagerInstance.isActive(persistentId, name);
    }

    public static findByName(name: string): BanEntry | undefined {
        return banManagerInstance.findByName(name);
    }

    public static findByPersistentId(persistentId: string): BanEntry | undefined {
        return banManagerInstance.findByPersistentId(persistentId);
    }

    public static cleanExpired(): number {
        return banManagerInstance.cleanExpired();
    }

    public static getStorageInfo(): { count: number; bytes: number; maxBytes: number; percent: number } {
        return banManagerInstance.getStorageInfo();
    }
}

class MuteManagerImpl extends ExpiringListManager<MuteEntry> {
    constructor() {
        super(muteStore, "mutedAt");
    }

    protected createEntry(
        name: string,
        persistentId: string,
        reason: string,
        durationMs: number | null,
        by: string,
    ): MuteEntry {
        return {
            name,
            persistentId,
            reason,
            mutedAt: Date.now(),
            expireAt: durationMs !== null ? Date.now() + durationMs : null,
            by,
        };
    }

    protected shouldSkipAdd(persistentId: string, name: string): boolean {
        return this.isActive(persistentId, name);
    }

    protected onAdded(entry: MuteEntry): void {
        for (const p of world.getPlayers()) {
            if (p.name === entry.name) {
                try { p.addTag(TAG_KEYS.mute); } catch { /* noop */ }
            }
        }
    }

    protected onRemoved(entries: MuteEntry[]): void {
        if (entries.length === 0) return;
        const names = new Set(entries.map((e) => e.name));
        for (const p of world.getPlayers()) {
            if (names.has(p.name) && p.hasTag(TAG_KEYS.mute)) {
                try { p.removeTag(TAG_KEYS.mute); } catch { /* noop */ }
            }
        }
    }
}

const muteManagerInstance = new MuteManagerImpl();
muteList = muteManagerInstance.getList();

export class MuteManager {
    public static loadMuteConfig(): void {
        muteManagerInstance.load();
    }

    public static saveMuteList(): void {
        muteManagerInstance.save();
    }

    public static isMuted(name: string, persistentId?: string): boolean {
        if (muteManagerInstance.isActive(persistentId, name)) return true;
        for (const p of world.getPlayers()) {
            if (p.name === name && p.hasTag(TAG_KEYS.mute)) return true;
        }
        return false;
    }

    public static getEntry(name: string): MuteEntry | undefined {
        return muteManagerInstance.findByName(name);
    }

    public static mute(
        name: string,
        persistentId: string,
        reason: string = "",
        durationMs: number | null = null,
        by: string = "System",
    ): boolean {
        return muteManagerInstance.add(name, persistentId, reason, durationMs, by);
    }

    public static unmute(name: string): boolean {
        let removed = muteManagerInstance.removeByName(name).length > 0;
        for (const p of world.getPlayers()) {
            if (p.name === name && p.hasTag(TAG_KEYS.mute)) {
                try { p.removeTag(TAG_KEYS.mute); } catch { /* noop */ }
                removed = true;
            }
        }
        return removed;
    }

    public static cleanExpired(): number {
        return muteManagerInstance.cleanExpired();
    }

    public static getMutedPlayers(): Player[] {
        return world.getPlayers().filter((p) => this.isMuted(p.name));
    }

    public static getStorageInfo(): { count: number; bytes: number; maxBytes: number; percent: number } {
        return muteManagerInstance.getStorageInfo();
    }
}

export class WhitelistManager {
    public static isWhitelisted(name: string, persistentId?: string): boolean {
        if (!currentConfig.Whitelist?.enabled) return true;
        return currentConfig.Whitelist.players.some((p) => p.name === name || (persistentId && p.persistentId === persistentId));
    }

    public static addWhitelist(name: string, persistentId?: string): void {
        if (!currentConfig.Whitelist) currentConfig.Whitelist = { enabled: false, players: [] };
        if (!this.isWhitelisted(name, persistentId)) {
            currentConfig.Whitelist.players.push({ name, persistentId });
            ConfigManager.saveConfig(currentConfig);
        }
    }

    public static removeWhitelist(name: string): void {
        if (!currentConfig.Whitelist) return;
        currentConfig.Whitelist.players = currentConfig.Whitelist.players.filter((p) => p.name !== name);
        ConfigManager.saveConfig(currentConfig);
    }
}