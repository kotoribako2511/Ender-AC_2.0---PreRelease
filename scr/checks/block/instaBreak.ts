import { PlayerBreakBlockBeforeEvent, GameMode } from "@minecraft/server";
import { currentConfig, illegalInstaBreakSet } from "../../data/config.js";
import { PermissionManager, DetectionType } from "../../permission.js";
import { executePunishment } from "../../util/punishment.js";

export function checkInstaBreak(ev: PlayerBreakBlockBeforeEvent): void {
    const cfg = currentConfig.InstaBreak;
    if (!cfg?.enabled) return;
    const { player, block } = ev;
    if (PermissionManager.shouldSkipDetection(player, DetectionType.InstaBreak)) return;

    const gm = player.getGameMode();
    if (gm === GameMode.Creative || gm === GameMode.Spectator) return;

    if (!illegalInstaBreakSet.has(block.typeId)) return;

    if (cfg.cancel) ev.cancel = true;
    executePunishment({
        player,
        detection: "InstaBreak",
        punishment: cfg.punish.type,
        tempkickSeconds: cfg.punish.seconds,
        reason: `block: "${block.typeId}"`,
        broadcast: false,
    });
}