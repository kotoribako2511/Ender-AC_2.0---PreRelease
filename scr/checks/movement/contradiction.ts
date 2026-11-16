import { Player } from "@minecraft/server";
import { currentConfig } from "../../data/config.js";
import { ACPlayer } from "../../data/type.js";
import { PermissionManager, DetectionType } from "../../permission.js";
import { isInBubbleColumn, isInSpecialSlowBlock } from "./helpers.js";
import { executePunishment } from "../../util/punishment.js";
import { getEffectiveIsFalling } from "./nofall.js";

export function checkContradictions(player: Player, data: ACPlayer, isOnGround: boolean, speedY: number, isSpecialMovement: boolean): void {
    if (PermissionManager.shouldSkipDetection(player, DetectionType.Contradiction)) return;
    const c = currentConfig.Contradiction;
    if (!c?.enabled) return;

    if (c.sprintSneak) {
        try {
            if (player.isSprinting && player.isSneaking && !isSpecialMovement) {
                executePunishment({
                    player,
                    detection: "Contradiction/SprintSneak",
                    punishment: c.sprintSneakPunish.type,
                    tempkickSeconds: c.sprintSneakPunish.seconds,
                    reason: "isSprinting && isSneaking",
                });
                return;
            }
        } catch { }
    }

    if (c.groundFall) {
        try {
            if (isOnGround && getEffectiveIsFalling(player, data) && !data.Lock.Ride && !player.isClimbing) {
                executePunishment({
                    player,
                    detection: "Contradiction/GroundFall",
                    punishment: c.groundFallPunish.type,
                    tempkickSeconds: c.groundFallPunish.seconds,
                    reason: "isOnGround && isFalling",
                });
                return;
            }
        } catch { }
    }

    if (c.fallDecel) {
        if (!isOnGround && data.moving.SpeedY < -0.1 && speedY > data.moving.SpeedY + 0.05) {
            if (!player.isInWater && !player.isClimbing && !isInBubbleColumn(player, player.location) && !isInSpecialSlowBlock(player, player.location)) {
                executePunishment({
                    player,
                    detection: "Contradiction/FallDecel",
                    punishment: c.fallDecelPunish.type,
                    tempkickSeconds: c.fallDecelPunish.seconds,
                    reason: `prevY: ${data.moving.SpeedY.toFixed(3)}, nowY: ${speedY.toFixed(3)}`,
                });
                return;
            }
        }
    }
}