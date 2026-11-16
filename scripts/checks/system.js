import { PlayerPermissionLevel, system, world } from "@minecraft/server";
import { currentConfig } from "../data/config";
import { kick } from "../command/command";
import { LogManager } from "../log";
import { PermissionManager, PermissionLevel, DetectionType } from "../permission";
import { isServerOwnerByPlayer } from "../state";
import { staffMessage } from "../util/util.js";
import { deopPlayer, transferPlayer } from "@minecraft/server-admin";
export function ChangeGameMode(player, fromGameMode, toGameMode) {
    if (PermissionManager.shouldSkipDetection(player, DetectionType.System))
        return;
    if (!currentConfig.System.GMChangeNoticeEnabled)
        return;
    if (!player?.isValid || !player.nameTag)
        return;
    if (player.playerPermissionLevel === PlayerPermissionLevel.Operator)
        return;
    const cfg = currentConfig.System;
    const detail = `[ ${fromGameMode} => ${toGameMode} ]`;
    const msg = `${cfg.prefix} §r§l${player.name} §a§lGameModeChanged: ${detail}`;
    if (cfg.GMConsoleNotice)
        console.warn(msg);
    if (cfg.GMWorldNotice)
        world.sendMessage(msg + "  ");
    if (cfg.GMStaffNotice)
        staffMessage(player, "GameModeChange", detail);
}
export function AFKkick(data, AFK, nowTick, player) {
    if (PermissionManager.shouldSkipDetection(player, DetectionType.AFK))
        return false;
    if (AFK.enabled && data.lastActiveTick !== 0) {
        const afkTicks = nowTick - data.lastActiveTick;
        if (afkTicks > AFK.timeoutSeconds * 20) {
            transferPlayer(player, { hostname: "sg.hivebedrock.network", port: 19132 });
            return true;
        }
    }
    return false;
}
export function checkAutoDeop(player) {
    if (!currentConfig.System?.autoDeop)
        return;
    if (!player?.isValid)
        return;
    if (isServerOwnerByPlayer(player))
        return;
    const level = PermissionManager.getPermissionLevel(player);
    if (level >= PermissionLevel.Admin)
        return;
    if (PermissionManager.shouldSkipDetection(player, DetectionType.System))
        return;
    if (player.playerPermissionLevel !== PlayerPermissionLevel.Operator)
        return;
    try {
        world.sendMessage(`${currentConfig.System.prefix} §c§l${player.name} fraudulently obtained operator status.`);
        LogManager.pushLog(player, "Invalid operator status");
        deopPlayer(player);
        return;
    }
    catch (e) {
        system.run(() => {
            if (!player.isValid)
                return;
            if (player.playerPermissionLevel !== PlayerPermissionLevel.Operator)
                return;
            world.sendMessage(`${currentConfig.System.prefix} §c§lAn unauthorized acquisition of an operator by ${player.name} was detected, but it could not be deleted.`);
            LogManager.pushLog(player, "An invalid operator status was detected but could not be deleted.");
            kick(player.name, "An invalid operator status was detected but could not be deleted.");
        });
    }
}
