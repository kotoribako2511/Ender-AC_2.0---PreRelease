import { system } from "@minecraft/server";
import { currentConfig } from "./data/config.js";
import { isServerOwnerByName, isServerOwnerById, isDebugMode } from "./state.js";
import { safeCall, safeGet } from "./util/safe.js";
import { DP_KEYS, PERMISSION_CACHE_TTL_TICKS, PERMISSION_CACHE_EXPIRY_TICKS, } from "./util/constants.js";
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
};
export const DetectionType = Object.fromEntries(Object.keys(DETECTION_DEFS).map((k) => [k, k]));
export const ALL_DETECTION_TYPES = Object.keys(DETECTION_DEFS);
export const DETECTION_LABELS = DETECTION_DEFS;
export var PermissionLevel;
(function (PermissionLevel) {
    PermissionLevel[PermissionLevel["Player"] = 0] = "Player";
    PermissionLevel[PermissionLevel["Admin"] = 1] = "Admin";
    PermissionLevel[PermissionLevel["Owner"] = 2] = "Owner";
})(PermissionLevel || (PermissionLevel = {}));
export class PermissionManager {
    static getPermissionLevel(player) {
        if (!player)
            return PermissionLevel.Player;
        const isValid = safeGet(() => player.isValid, false, "PermissionManager.getPermissionLevel.isValid");
        if (!isValid)
            return PermissionLevel.Player;
        const playerId = safeGet(() => player.id, undefined, "PermissionManager.getPermissionLevel.id");
        if (!playerId)
            return PermissionLevel.Player;
        try {
            if (isServerOwnerByName(player.name) || isServerOwnerById(playerId)) {
                return PermissionLevel.Owner;
            }
        }
        catch (e) {
            console.warn(`[PermissionManager] owner check failed: ${e}`);
        }
        const cached = this.cache.get(playerId);
        if (cached && (system.currentTick - cached.tick) < PERMISSION_CACHE_TTL_TICKS) {
            return cached.level;
        }
        let level = PermissionLevel.Player;
        try {
            const dp = player.getDynamicProperty(DP_KEYS.permission);
            if (dp === "owner")
                level = PermissionLevel.Owner;
            else if (dp === "admin")
                level = PermissionLevel.Admin;
        }
        catch (e) {
            console.warn(`[PermissionManager] getDynamicProperty failed for ${player.name}: ${e}`);
        }
        this.cache.set(playerId, { level, tick: system.currentTick });
        safeCall(() => this.nameCache.set(player.name, { level, tick: system.currentTick }), undefined, "PermissionManager.nameCache.set");
        return level;
    }
    static setPermission(player, level) {
        if (!player || !player.isValid)
            return;
        try {
            if (level === PermissionLevel.Player) {
                player.setDynamicProperty(DP_KEYS.permission, undefined);
            }
            else if (level === PermissionLevel.Owner) {
                player.setDynamicProperty(DP_KEYS.permission, "owner");
            }
            else if (level === PermissionLevel.Admin) {
                player.setDynamicProperty(DP_KEYS.permission, "admin");
            }
        }
        catch (e) {
            console.warn(`[PermissionManager] setPermission failed: ${e}`);
        }
        this.invalidatePlayer(player);
    }
    static getPermissionLevelByName(name) {
        if (!name)
            return PermissionLevel.Player;
        if (isServerOwnerByName(name))
            return PermissionLevel.Owner;
        const entry = this.nameCache.get(name);
        if (!entry)
            return PermissionLevel.Player;
        if (system.currentTick - entry.tick > PERMISSION_CACHE_EXPIRY_TICKS) {
            this.nameCache.delete(name);
            return PermissionLevel.Player;
        }
        return entry.level;
    }
    static isOwner(player) {
        return this.getPermissionLevel(player) === PermissionLevel.Owner;
    }
    static isAdmin(player) {
        return this.getPermissionLevel(player) === PermissionLevel.Admin;
    }
    static isAtLeastAdmin(player) {
        return this.getPermissionLevel(player) >= PermissionLevel.Admin;
    }
    static hasBypass(player, detection) {
        return this.evaluateBypass(this.getPermissionLevel(player), detection);
    }
    static hasBypassByName(name, detection) {
        return this.evaluateBypass(this.getPermissionLevelByName(name), detection);
    }
    static evaluateBypass(level, detection) {
        if (isDebugMode())
            return false;
        if (level === PermissionLevel.Player)
            return false;
        const bypass = currentConfig.Permissions?.bypass?.[detection];
        if (!bypass) {
            return level === PermissionLevel.Owner;
        }
        if (level === PermissionLevel.Owner)
            return bypass.owner;
        if (level === PermissionLevel.Admin)
            return bypass.admin;
        return false;
    }
    static shouldSkipDetection(player, detection) {
        return this.hasBypass(player, detection);
    }
    static shouldSkipPenalty(player) {
        return this.getPermissionLevel(player) === PermissionLevel.Owner;
    }
    static clearCache(playerId) {
        if (playerId) {
            this.cache.delete(playerId);
        }
        else {
            this.cache.clear();
        }
    }
    static invalidatePlayer(player) {
        if (!player)
            return;
        safeCall(() => {
            if (player.isValid) {
                this.cache.delete(player.id);
                this.nameCache.delete(player.name);
            }
        }, undefined, "PermissionManager.invalidatePlayer");
    }
    static updateNameCache(player) {
        if (!player)
            return;
        safeCall(() => {
            if (player.isValid) {
                this.nameCache.set(player.name, {
                    level: this.getPermissionLevel(player),
                    tick: system.currentTick,
                });
            }
        }, undefined, "PermissionManager.updateNameCache");
    }
    static cleanExpiredCache() {
        const now = system.currentTick;
        const toDelete = [];
        for (const [id, entry] of this.cache.entries()) {
            if (now - entry.tick > PERMISSION_CACHE_EXPIRY_TICKS)
                toDelete.push(id);
        }
        for (const id of toDelete)
            this.cache.delete(id);
        const toDeleteNames = [];
        for (const [name, entry] of this.nameCache.entries()) {
            if (now - entry.tick > PERMISSION_CACHE_EXPIRY_TICKS)
                toDeleteNames.push(name);
        }
        for (const name of toDeleteNames)
            this.nameCache.delete(name);
    }
}
PermissionManager.cache = new Map();
PermissionManager.nameCache = new Map();
export function handlePermissionPlayerLeave(ev) {
    safeCall(() => PermissionManager.clearCache(ev.player.id), undefined, "handlePermissionPlayerLeave");
}
export function cleanPermissionCache() {
    PermissionManager.cleanExpiredCache();
}
