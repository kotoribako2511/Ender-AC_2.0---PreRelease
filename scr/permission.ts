import { Player, PlayerLeaveAfterEvent, PlayerLeaveBeforeEvent, system, world } from "@minecraft/server";
import { currentConfig } from "./data/config.js";
import { isServerOwnerByName, isServerOwnerById, isDebugMode } from "./state.js";
import { safeCall, safeGet } from "./util/safe.js";
import {
    DP_KEYS, PERMISSION_CACHE_TTL_TICKS, PERMISSION_CACHE_EXPIRY_TICKS,
} from "./util/constants.js";

const DETECTION_DEFS = {
    Fly: "Fly",
    BDSFly: "AirJump (BDSFly)",
    Nofall: "IllegalFall",
    Step: "Step",
    NoClip: "NoClip",
    Phase: "Phase",
    Speed: "Speed",
    Reach: "Reach",
    Killaura: "Killaura",
    NoSwing: "NoSwing",
    CPS: "AutoClicker (CPS)",
    IllegalItem: "Illegal Item",
    AutoTotem: "AutoTotem",
    BlockPlace: "BlockPlace",
    Nuker: "Nuker",
    InstaBreak: "InstaBreak",
    Scaffold: "Scaffold",
    Chat: "Chat",
    IllegalEntity: "Illegal Entity",
    SpawnEgg: "SpawnEgg",
    AFK: "AFK Kick",
    System: "System / OP",
    Join: "Join Check",
    Teleport: "Teleport",
    FastFall: "FastFall",
    NoSlow: "NoSlow (Web)",
    AirSwim: "AirSwim",
    Contradiction: "Logic Contradiction",
} as const;

export type DetectionType = keyof typeof DETECTION_DEFS;

export const DetectionType = Object.fromEntries(
    Object.keys(DETECTION_DEFS).map((k) => [k, k]),
) as { readonly [K in DetectionType]: K };

export const ALL_DETECTION_TYPES: DetectionType[] = Object.keys(DETECTION_DEFS) as DetectionType[];

export const DETECTION_LABELS: Record<DetectionType, string> = DETECTION_DEFS;

export enum PermissionLevel {
    Player = 0,
    Admin = 1,
    Owner = 2,
}

interface CachedPermission {
    level: PermissionLevel;
    tick: number;
}

interface CachedNamePermission {
    level: PermissionLevel;
    tick: number;
}

export class PermissionManager {
    private static cache = new Map<string, CachedPermission>();
    private static nameCache = new Map<string, CachedNamePermission>();

    public static getPermissionLevel(player: Player | undefined | null): PermissionLevel {
        if (!player) return PermissionLevel.Player;

        const isValid = safeGet(() => player.isValid, false, "PermissionManager.getPermissionLevel.isValid");
        if (!isValid) return PermissionLevel.Player;

        const playerId = safeGet(() => player.id, undefined, "PermissionManager.getPermissionLevel.id");
        if (!playerId) return PermissionLevel.Player;

        try {
            if (isServerOwnerByName(player.name) || isServerOwnerById(playerId)) {
                return PermissionLevel.Owner;
            }
        } catch (e) {
            console.warn(`[PermissionManager] owner check failed: ${e}`);
        }

        const cached = this.cache.get(playerId);
        if (cached && (system.currentTick - cached.tick) < PERMISSION_CACHE_TTL_TICKS) {
            return cached.level;
        }

        let level = PermissionLevel.Player;
        try {
            const dp = player.getDynamicProperty(DP_KEYS.permission);
            if (dp === "owner") level = PermissionLevel.Owner;
            else if (dp === "admin") level = PermissionLevel.Admin;
        } catch (e) {
            console.warn(`[PermissionManager] getDynamicProperty failed for ${player.name}: ${e}`);
        }

        this.cache.set(playerId, { level, tick: system.currentTick });
        safeCall(
            () => this.nameCache.set(player.name, { level, tick: system.currentTick }),
            undefined,
            "PermissionManager.nameCache.set",
        );
        return level;
    }

    public static setPermission(player: Player, level: PermissionLevel): void {
        if (!player || !player.isValid) return;
        try {
            if (level === PermissionLevel.Player) {
                player.setDynamicProperty(DP_KEYS.permission, undefined);
            } else if (level === PermissionLevel.Owner) {
                player.setDynamicProperty(DP_KEYS.permission, "owner");
            } else if (level === PermissionLevel.Admin) {
                player.setDynamicProperty(DP_KEYS.permission, "admin");
            }
        } catch (e) {
            console.warn(`[PermissionManager] setPermission failed: ${e}`);
        }
        this.invalidatePlayer(player);
    }

    public static getPermissionLevelByName(name: string | undefined | null): PermissionLevel {
        if (!name) return PermissionLevel.Player;
        if (isServerOwnerByName(name)) return PermissionLevel.Owner;
        const entry = this.nameCache.get(name);
        if (!entry) return PermissionLevel.Player;
        if (system.currentTick - entry.tick > PERMISSION_CACHE_EXPIRY_TICKS) {
            this.nameCache.delete(name);
            return PermissionLevel.Player;
        }
        return entry.level;
    }

    public static isOwner(player: Player | undefined | null): boolean {
        return this.getPermissionLevel(player) === PermissionLevel.Owner;
    }

    public static isAdmin(player: Player | undefined | null): boolean {
        return this.getPermissionLevel(player) === PermissionLevel.Admin;
    }

    public static isAtLeastAdmin(player: Player | undefined | null): boolean {
        return this.getPermissionLevel(player) >= PermissionLevel.Admin;
    }

    public static hasBypass(player: Player | undefined | null, detection: DetectionType): boolean {
        return this.evaluateBypass(this.getPermissionLevel(player), detection);
    }

    public static hasBypassByName(name: string | undefined | null, detection: DetectionType): boolean {
        return this.evaluateBypass(this.getPermissionLevelByName(name), detection);
    }

    private static evaluateBypass(level: PermissionLevel, detection: DetectionType): boolean {
        if (isDebugMode()) return false;
        if (level === PermissionLevel.Player) return false;

        const bypass = currentConfig.Permissions?.bypass?.[detection];
        if (!bypass) {
            return level === PermissionLevel.Owner;
        }

        if (level === PermissionLevel.Owner) return bypass.owner;
        if (level === PermissionLevel.Admin) return bypass.admin;
        return false;
    }

    public static shouldSkipDetection(player: Player | undefined | null, detection: DetectionType): boolean {
        return this.hasBypass(player, detection);
    }

    public static shouldSkipPenalty(player: Player | undefined | null): boolean {
        return this.getPermissionLevel(player) === PermissionLevel.Owner;
    }

    public static clearCache(playerId?: string): void {
        if (playerId) {
            this.cache.delete(playerId);
        } else {
            this.cache.clear();
        }
    }

    public static invalidatePlayer(player: Player | undefined | null): void {
        if (!player) return;
        safeCall(() => {
            if (player.isValid) {
                this.cache.delete(player.id);
                this.nameCache.delete(player.name);
            }
        }, undefined, "PermissionManager.invalidatePlayer");
    }

    public static updateNameCache(player: Player | undefined | null): void {
        if (!player) return;
        safeCall(() => {
            if (player.isValid) {
                this.nameCache.set(player.name, {
                    level: this.getPermissionLevel(player),
                    tick: system.currentTick,
                });
            }
        }, undefined, "PermissionManager.updateNameCache");
    }

    public static cleanExpiredCache(): void {
        const now = system.currentTick;
        const toDelete: string[] = [];
        for (const [id, entry] of this.cache.entries()) {
            if (now - entry.tick > PERMISSION_CACHE_EXPIRY_TICKS) toDelete.push(id);
        }
        for (const id of toDelete) this.cache.delete(id);

        const toDeleteNames: string[] = [];
        for (const [name, entry] of this.nameCache.entries()) {
            if (now - entry.tick > PERMISSION_CACHE_EXPIRY_TICKS) toDeleteNames.push(name);
        }
        for (const name of toDeleteNames) this.nameCache.delete(name);
    }
}

export function handlePermissionPlayerLeave(ev: PlayerLeaveBeforeEvent): void {
    safeCall(() => PermissionManager.clearCache(ev.player.id), undefined, "handlePermissionPlayerLeave");
}

export function cleanPermissionCache(): void {
    PermissionManager.cleanExpiredCache();
}