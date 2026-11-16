import { world, system, CommandPermissionLevel, CustomCommandStatus, ItemStack, CustomCommandParamType } from "@minecraft/server";
import { BanManager, MuteManager, currentConfig, SessionIdMap, ConfigManager } from "../data/config.js";
import { CommandInvoker, getPlayerData } from "../util/util.js";
import { AdminActionLogManager } from "../log.js";
import { PermissionManager, PermissionLevel } from "../permission.js";
import { ACState, hasServerOwner, isServerOwnerByName, isServerOwnerById, isServerOwnerByPlayer, saveServerOwner, reloadServerOwnerCache, isDebugMode, setDebugMode, t, } from "../state.js";
import { kickPlayer } from "@minecraft/server-admin";
import { getPlayerContext, failure, success } from "./registry.js";
import { DP_KEYS } from "../util/constants.js";
import { safeCall } from "../util/safe.js";
let settingOpener = null;
let instructionOpener = null;
export function registerSettingOpener(fn) { settingOpener = fn; }
export function registerInstructionOpener(fn) { instructionOpener = fn; }
export class KickCommand {
    constructor(playerName, reason = "") {
        this.playerName = playerName;
        this.reason = reason;
    }
    execute() {
        const target = world.getPlayers({ name: this.playerName })[0];
        let ok = false;
        if (target?.isValid) {
            safeCall(() => {
                ok = target.runCommand(`kick @s "${this.reason}"`).successCount > 0;
            }, () => { ok = false; });
        }
        if (!ok) {
            safeCall(() => {
                ok = world.getDimension("overworld").runCommand(`kick "${this.playerName}" "${this.reason}"`).successCount > 0;
            }, () => { ok = false; });
        }
        if (!ok && target) {
            safeCall(() => {
                kickPlayer(target, this.reason);
                ok = true;
            }, () => { ok = false; });
        }
        if (!ok && target) {
            safeCall(() => target.triggerEvent("ender:kick"));
            world.sendMessage(`${currentConfig.System.prefix} §c${this.playerName} を強制退出させました`);
        }
        if (ok)
            world.sendMessage(`${currentConfig.System.prefix} §c${this.playerName} をKickしました`);
    }
}
export class BanCommand {
    constructor(target, reason = "", durationMs = null, by = "System") {
        this.target = target;
        this.reason = reason;
        this.durationMs = durationMs;
        this.by = by;
    }
    execute() {
        const persistentId = SessionIdMap.get(this.target.name) ?? this.target.id;
        CommandInvoker.execute(new KickCommand(this.target.name, this.reason));
        BanManager.addBanList(this.target.name, persistentId, this.reason, this.durationMs, this.by);
        AdminActionLogManager.addLog({
            time: Date.now(), admin: this.by,
            action: this.durationMs === null ? "ban" : "tempban",
            target: this.target.name, targetId: persistentId,
            reason: this.reason, duration: this.durationMs,
        });
    }
}
export function kick(playerName, reason = "") { CommandInvoker.execute(new KickCommand(playerName, reason)); }
export const ban = (target, reason = "", durationMs = null, by = "System") => {
    CommandInvoker.execute(new BanCommand(target, reason, durationMs, by));
};
export function banOffline(name, persistentId, reason, durationMs, by) {
    for (const p of world.getPlayers())
        if (p.name === name)
            CommandInvoker.execute(new KickCommand(name, reason));
    BanManager.addBanList(name, persistentId, reason, durationMs, by);
    AdminActionLogManager.addLog({
        time: Date.now(), admin: by,
        action: durationMs === null ? "ban" : "tempban",
        target: name, targetId: persistentId, reason, duration: durationMs,
    });
}
export function unbanOffline(name, by) {
    const entry = BanManager.findByName(name);
    if (!entry)
        return false;
    BanManager.removeBanList(entry.persistentId, entry.name);
    AdminActionLogManager.addLog({ time: Date.now(), admin: by, action: "unban", target: name });
    return true;
}
export function muteOffline(name, persistentId, reason, durationMs, by) {
    if (!MuteManager.mute(name, persistentId, reason, durationMs, by))
        return false;
    AdminActionLogManager.addLog({
        time: Date.now(), admin: by,
        action: durationMs === null ? "mute" : "tempmute",
        target: name, targetId: persistentId, reason, duration: durationMs,
    });
    return true;
}
export function unmuteOffline(name, by) {
    if (!MuteManager.unmute(name))
        return false;
    AdminActionLogManager.addLog({ time: Date.now(), admin: by, action: "unmute", target: name });
    return true;
}
export function parseDuration(str) {
    if (!str)
        return undefined;
    const lower = str.toLowerCase().trim();
    if (lower === "perm" || lower === "permanent" || lower === "0" || lower === "永久")
        return null;
    const match = lower.match(/^(\d+)\s*([smhd])$/i);
    if (!match)
        return undefined;
    const value = parseInt(match[1], 10);
    if (isNaN(value) || value <= 0)
        return undefined;
    const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const unit = match[2].toLowerCase();
    return value * (unitMs[unit] ?? 0) || undefined;
}
export function formatDuration(ms) {
    if (ms === null)
        return "永久";
    const sec = Math.floor(ms / 1000);
    if (sec < 60)
        return `${sec}秒`;
    const min = Math.floor(sec / 60);
    if (min < 60)
        return `${min}分`;
    const hr = Math.floor(min / 60);
    if (hr < 24)
        return `${hr}時間`;
    return `${Math.floor(hr / 24)}日`;
}
export function formatRemaining(expireAt) {
    if (expireAt === null)
        return "§c永久";
    const remain = expireAt - Date.now();
    if (remain <= 0)
        return "§a期限切れ";
    return `§e${formatDuration(remain)}`;
}
function setTeleportGrace(player, ticks) {
    safeCall(() => {
        const data = getPlayerData(player);
        data.teleport.allowedUntilTick = Math.max(data.teleport.allowedUntilTick, system.currentTick + ticks);
    });
}
function normalizeLanguageCode(input) {
    if (!input)
        return undefined;
    const v = input.toLowerCase().trim();
    if (["ja", "jp", "japanese", "日本語", "jp_jp"].includes(v))
        return "ja";
    if (["en", "english", "en_us", "en_gb", "英語"].includes(v))
        return "en";
    return undefined;
}
const STRING = CustomCommandParamType.String;
const PLAYER_SELECTOR = CustomCommandParamType.PlayerSelector;
const commands = [
    {
        name: "eac:start",
        description: "Enable Ender-AC and grant owner permission to the executor",
        permissionLevel: CommandPermissionLevel.Any,
        handler: (ctx) => {
            const src = ctx.player;
            if (!src)
                return failure("Player only");
            const name = src.name;
            const id = src.id;
            const existing = hasServerOwner();
            const isOwner = isServerOwnerByName(name) || isServerOwnerById(id);
            if (existing && !isOwner)
                return failure("Only the server owner can run this command.");
            if (!existing)
                saveServerOwner(name, id);
            const wasEnabled = ACState.enabled;
            ACState.enabled = true;
            system.run(() => {
                safeCall(() => {
                    const target = world.getPlayers({ name })[0];
                    if (!target?.isValid) {
                        world.sendMessage(`${currentConfig.System.prefix} §cAC有効化に失敗しました (Owner付与)`);
                        return;
                    }
                    PermissionManager.setPermission(target, PermissionLevel.Owner);
                    world.sendMessage(`${currentConfig.System.prefix} §a${wasEnabled ? "Owner権限を再付与しました" : "ACを有効化し、Owner権限を付与しました"} (${name})`);
                    target.getComponent("minecraft:inventory")?.container.addItem(new ItemStack("ender:admin_tool", 1));
                }, (e) => {
                    console.warn(`${currentConfig.System.prefix} §ceac:start: ${e}`);
                }, "eac:start.system.run");
            });
            return success();
        },
    },
    {
        name: "eac:op",
        description: "Grant Admin permission to a player",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        params: [{ name: "target", type: PLAYER_SELECTOR }],
        permission: (ctx) => PermissionManager.getPermissionLevel(ctx.player) >= PermissionLevel.Owner
            ? true : { error: "Only Server Owner or Owner can use this." },
        handler: (ctx, [targets]) => {
            const target = targets[0];
            if (!target)
                return failure("Target not found");
            if (target.id === ctx.player?.id)
                return failure("You cannot grant permission to yourself.");
            PermissionManager.setPermission(target, PermissionLevel.Admin);
            world.sendMessage(`${currentConfig.System.prefix} §a${target.name} に Admin 権限を付与しました。`);
            return success();
        },
    },
    {
        name: "eac:owner",
        description: "Grant Owner permission to a player",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        params: [{ name: "target", type: PLAYER_SELECTOR }],
        permission: (ctx) => PermissionManager.getPermissionLevel(ctx.player) >= PermissionLevel.Owner
            ? true : { error: "Only Server Owner or Owner can use this." },
        handler: (ctx, [targets]) => {
            const target = targets[0];
            if (!target)
                return failure("Target not found");
            if (target.id === ctx.player?.id)
                return failure("You cannot grant permission to yourself.");
            PermissionManager.setPermission(target, PermissionLevel.Owner);
            world.sendMessage(`${currentConfig.System.prefix} §a${target.name} に Owner 権限を付与しました。`);
            return success();
        },
    },
    {
        name: "eac:deop",
        description: "Remove permission from a player",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        params: [{ name: "target", type: PLAYER_SELECTOR }],
        permission: (ctx) => PermissionManager.getPermissionLevel(ctx.player) >= PermissionLevel.Owner
            ? true : { error: "Only Server Owner or Owner can use this." },
        handler: (ctx, [targets]) => {
            const target = targets[0];
            if (!target)
                return failure("Target not found");
            if (target.id === ctx.player?.id)
                return failure("You cannot remove your own permission.");
            if (isServerOwnerByPlayer(target))
                return failure("Cannot remove Server Owner.");
            PermissionManager.setPermission(target, PermissionLevel.Player);
            world.sendMessage(`${currentConfig.System.prefix} §a${target.name} の権限を剥奪しました。`);
            return success();
        },
    },
    {
        name: "eac:tp",
        description: "Teleport command equivalent to vanilla /tp but bypasses AC detection",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        params: [
            { name: "a", type: STRING },
            { name: "b", type: STRING, optional: true },
            { name: "c", type: STRING, optional: true },
            { name: "d", type: STRING, optional: true },
            { name: "e", type: STRING, optional: true },
            { name: "f", type: STRING, optional: true },
        ],
        handler: (ctx, args) => {
            const argStr = args.filter((a) => a !== undefined && a !== null).join(" ");
            if (!argStr)
                return failure("Usage: /eac:tp <target> <destination>");
            system.run(() => {
                if (ctx.player)
                    setTeleportGrace(ctx.player, 20);
                for (const p of world.getPlayers())
                    if (argStr.includes(p.name))
                        setTeleportGrace(p, 20);
                safeCall(() => {
                    world.getDimension("overworld").runCommand(`tp ${argStr}`);
                }, (e) => {
                    ctx.player?.sendMessage(`${currentConfig.System.prefix} §cTeleport failed: ${e}`);
                });
            });
            return success();
        },
    },
    {
        name: "eac:debug",
        description: "Toggle AC debug mode (disables all bypasses)",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        permission: (ctx) => (PermissionManager.isOwner(ctx.player) || isServerOwnerByPlayer(ctx.player))
            ? true : { error: "You do not have permission." },
        handler: () => {
            const next = !isDebugMode();
            setDebugMode(next);
            world.sendMessage(`${currentConfig.System.prefix} §eDebug mode: ${next ? "§a§lENABLED" : "§c§lDISABLED"}`);
            return success();
        },
    },
    {
        name: "eac:ban",
        description: "Ban a player temporarily or permanently",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        params: [
            { name: "target", type: STRING },
            { name: "duration", type: STRING },
            { name: "reason", type: STRING, optional: true },
        ],
        handler: (ctx, [target, duration, reason]) => {
            const durationMs = parseDuration(String(duration));
            if (durationMs === undefined)
                return failure("Invalid duration. Use e.g. 10m, 1h, 1d, perm.");
            const name = String(target);
            const persistentId = SessionIdMap.get(name) ?? name;
            if (BanManager.isBanned(persistentId, name))
                return failure(`${name} is already banned.`);
            banOffline(name, persistentId, String(reason ?? ""), durationMs, ctx.adminName);
            world.sendMessage(`${currentConfig.System.prefix} §c${name} was banned by ${ctx.adminName} (${formatDuration(durationMs)})`);
            return success();
        },
    },
    {
        name: "eac:unban",
        description: "Unban a player",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        params: [{ name: "target", type: STRING }],
        handler: (ctx, [target]) => {
            if (!unbanOffline(String(target), ctx.adminName))
                return failure(`${target} is not banned.`);
            world.sendMessage(`${currentConfig.System.prefix} §a${target} was unbanned by ${ctx.adminName}`);
            return success();
        },
    },
    {
        name: "eac:mute",
        description: "Mute a player temporarily or permanently",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        params: [
            { name: "target", type: STRING },
            { name: "duration", type: STRING },
            { name: "reason", type: STRING, optional: true },
        ],
        handler: (ctx, [target, duration, reason]) => {
            const durationMs = parseDuration(String(duration));
            if (durationMs === undefined)
                return failure("Invalid duration. Use e.g. 10m, 1h, 1d, perm.");
            const name = String(target);
            const persistentId = SessionIdMap.get(name) ?? name;
            if (!muteOffline(name, persistentId, String(reason ?? ""), durationMs, ctx.adminName))
                return failure(`${name} is already muted.`);
            world.sendMessage(`${currentConfig.System.prefix} §c${name} was muted by ${ctx.adminName} (${formatDuration(durationMs)})`);
            return success();
        },
    },
    {
        name: "eac:unmute",
        description: "Unmute a player",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        params: [{ name: "target", type: STRING }],
        handler: (ctx, [target]) => {
            if (!unmuteOffline(String(target), ctx.adminName))
                return failure(`${target} is not muted.`);
            world.sendMessage(`${currentConfig.System.prefix} §a${target} was unmuted by ${ctx.adminName}`);
            return success();
        },
    },
    {
        name: "eac:setting",
        description: "Open Ender-AC settings panel",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        permission: (ctx) => (PermissionManager.isOwner(ctx.player) || isServerOwnerByPlayer(ctx.player))
            ? true : { error: "You do not have permission to open this panel." },
        handler: (ctx) => {
            system.run(() => {
                if (ctx.player && settingOpener)
                    settingOpener(ctx.player);
                else
                    ctx.player?.sendMessage(`${currentConfig.System.prefix} §cSetting opener not registered.`);
            });
            return success();
        },
    },
    {
        name: "eac:instruction",
        description: "Show Ender-AC instructions (optional: ja / en)",
        permissionLevel: CommandPermissionLevel.Any,
        params: [{ name: "language", type: STRING, optional: true }],
        handler: (ctx, [language]) => {
            let lang;
            if (language !== undefined && String(language).trim().length > 0) {
                lang = normalizeLanguageCode(String(language));
                if (!lang)
                    return failure("Invalid language. Use 'ja' or 'en'.");
            }
            system.run(() => {
                if (ctx.player && instructionOpener)
                    instructionOpener(ctx.player, lang);
                else
                    ctx.player?.sendMessage(`${currentConfig.System.prefix} §cInstruction opener not registered.`);
            });
            return success();
        },
    },
    {
        name: "eac:lang",
        description: "Set Ender-AC display language (ja / en)",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        params: [{ name: "language", type: STRING }],
        permission: (ctx) => (PermissionManager.isOwner(ctx.player) || isServerOwnerByPlayer(ctx.player))
            ? true : { error: "You do not have permission." },
        handler: (ctx, [language]) => {
            const lang = normalizeLanguageCode(String(language));
            if (!lang)
                return failure("Invalid language. Use 'ja' or 'en'.");
            system.run(() => {
                world.setDynamicProperty(DP_KEYS.language, lang);
                world.sendMessage(`${currentConfig.System.prefix} §aLanguage set to §e${lang === "ja" ? "日本語" : "English"}§a.`);
            });
            return success();
        },
    },
    {
        name: "eac:reload",
        description: "Reload Ender-AC config and data",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        handler: () => {
            try {
                ConfigManager.loadConfig();
                BanManager.loadBanConfig();
                MuteManager.loadMuteConfig();
                AdminActionLogManager.loadLogs();
                reloadServerOwnerCache();
                world.sendMessage(`${currentConfig.System.prefix} §aConfig and data reloaded.`);
                if (!ACState.enabled) {
                    world.sendMessage(t("§e[Ender-AC] §fACは現在停止しています。§a/eac:start §fを実行して起動してください。", "§e[Ender-AC] §fAC is currently stopped. Run §a/eac:start §fto enable it."));
                }
                return success();
            }
            catch (e) {
                return failure(`Reload failed: ${e}`);
            }
        },
    },
];
export function handleCommandRegistry(initEvent) {
    const registry = initEvent?.customCommandRegistry;
    if (!registry) {
        console.warn(`${currentConfig.System.prefix} §eCustomCommandRegistry not available. /eac commands disabled.`);
        return;
    }
    for (const def of commands) {
        safeCall(() => {
            const mandatory = [];
            const optional = [];
            if (def.params) {
                let optionalStarted = false;
                for (const p of def.params) {
                    const entry = { name: p.name, type: p.type };
                    if (p.optional) {
                        optional.push(entry);
                        optionalStarted = true;
                    }
                    else {
                        if (optionalStarted)
                            throw new Error(`Mandatory param after optional in ${def.name}`);
                        mandatory.push(entry);
                    }
                }
            }
            const callback = (origin, ...args) => {
                const ctx = getPlayerContext(origin);
                if (def.permission) {
                    const result = def.permission(ctx);
                    if (result !== true)
                        return { status: CustomCommandStatus.Failure, message: result.error };
                }
                return def.handler(ctx, args);
            };
            const customCommand = {
                name: def.name,
                description: def.description,
                permissionLevel: def.permissionLevel,
                mandatoryParameters: mandatory,
                optionalParameters: optional,
            };
            registry.registerCommand(customCommand, callback);
        }, (e) => {
            console.warn(`${currentConfig.System.prefix} §c[${def.name}] register failed: ${e}`);
        });
    }
}
