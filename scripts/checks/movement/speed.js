import { currentConfig } from "../../data/config.js";
import { TPSCalculator } from "../../util/util.js";
import { PermissionManager, DetectionType } from "../../permission.js";
import { executePunishment } from "../../util/punishment.js";
export function checkSpeed(player, data, isGliding, vxzSq, hasSpeed, onIce, isRiding, inBubble, isImmune) {
    if (PermissionManager.shouldSkipDetection(player, DetectionType.Speed))
        return;
    const { Speed } = currentConfig;
    if (!Speed.enabled || !data.Lock.Ride || !data.lastLocation)
        return;
    if (player.isClimbing || player.isFlying || isGliding)
        return;
    if (isRiding || inBubble || isImmune || onIce || hasSpeed)
        return;
    const scaled = TPSCalculator.scaleMultiplyFor(player, Speed.limit);
    if (vxzSq > scaled * scaled) {
        executePunishment({
            player,
            detection: "Speed/A",
            punishment: Speed.punish.type,
            freezeTicks: Speed.freezeTicks,
            tempkickSeconds: Speed.punish.seconds,
            rollbackLocation: data.lastLocation,
        });
    }
}
