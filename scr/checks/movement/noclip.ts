import { Player, Vector3 } from "@minecraft/server";
import { currentConfig } from "../../data/config.js";
import { ACPlayer } from "../../data/type.js";
import { PermissionManager, DetectionType } from "../../permission.js";
import { safeGetBlock, isFullSolidBlock } from "./helpers.js";
import { executePunishment } from "../../util/punishment.js";
import { getEffectiveIsFalling } from "./nofall.js";

export function checkNoClip(player: Player, data: ACPlayer, loc: Vector3, isSpecialMovement: boolean, speedY: number, isOnGround: boolean): void {
    if (PermissionManager.shouldSkipDetection(player, DetectionType.NoClip)) return;
    const { NoClip } = currentConfig;
    const { x, y, z } = loc;

    if (!NoClip.enabled || isSpecialMovement || player.isInWater || isOnGround) return;
    if (!getEffectiveIsFalling(player, data)) return;
    if (speedY >= NoClip.speedY) return;

    const dim = player.dimension;
    const feet = safeGetBlock(dim, x, y, z);
    const headLoc = player.getHeadLocation();
    const head = safeGetBlock(dim, headLoc.x, headLoc.y, headLoc.z);

    if (!isFullSolidBlock(feet) && !isFullSolidBlock(head)) return;

    executePunishment({
        player,
        detection: "NoClip/A",
        punishment: NoClip.punish.type,
        tempkickSeconds: NoClip.punish.seconds,
        rollbackLocation: data.lastOnGround_loc,
        reason: `feet: "${feet?.typeId ?? "unknown"}", head: "${head?.typeId ?? "unknown"}"`,
    });
}

export function checkPhase(player: Player, loc: Vector3, movingSpeed: number, onBouncy: boolean, inSlow: boolean, isOnGround: boolean, isGliding: boolean): void {
    if (PermissionManager.shouldSkipDetection(player, DetectionType.Phase)) return;
    const { Phase } = currentConfig;
    const { x, y, z } = loc;

    if (!Phase.enabled || movingSpeed <= Phase.Speed) return;
    if (onBouncy || inSlow) return;
    if (player.isInWater || player.isSwimming || isGliding || player.isFlying || !isOnGround) return;

    const dim = player.dimension;
    const feet = safeGetBlock(dim, x, y, z);

    const feetSolid = isFullSolidBlock(feet);

    if (!feetSolid || !Number.isInteger(y)) return;

    const feetId = feet?.typeId ?? "unknown";

    executePunishment({
        player,
        detection: "Phase",
        punishment: Phase.punish.type,
        tempkickSeconds: Phase.punish.seconds,
        reason: `feet: "${feetId}", speed: ${movingSpeed.toFixed(2)}`,
    });
}