import { currentConfig } from "../../data/config.js";
import { TPSCalculator } from "../../util/util.js";
import { PermissionManager, DetectionType } from "../../permission.js";
import { safeGetBlock, isFullSolidBlock, isInBubbleColumn } from "./helpers.js";
import { executePunishment } from "../../util/punishment.js";
export function checkFastFall(player, loc, isOnGround, speedY) {
    if (PermissionManager.shouldSkipDetection(player, DetectionType.FastFall))
        return;
    const cfg = currentConfig.FastFall;
    if (!cfg?.enabled)
        return;
    if (isOnGround)
        return;
    if (player.isGliding || player.isInWater || player.isSwimming || !player.isFalling)
        return;
    if (isInBubbleColumn(player, loc))
        return;
    if (speedY < cfg.threshold) {
        executePunishment({
            player,
            detection: "FastFall",
            punishment: cfg.punish.type,
            freezeTicks: cfg.freezeTicks,
            tempkickSeconds: cfg.punish.seconds,
            reason: `vy: ${speedY.toFixed(3)}`,
        });
    }
}
export function checkNoSlow(player, data, loc, movingSpeed, nowTick) {
    if (PermissionManager.shouldSkipDetection(player, DetectionType.NoSlow))
        return;
    const cfg = currentConfig.NoSlow;
    if (!cfg?.enabled)
        return;
    const swingGraceTicks = TPSCalculator.scaleTicks(20);
    if (data.Noswing.swing_tick !== undefined && data.Noswing.swing_tick > 0 && nowTick - data.Noswing.swing_tick < swingGraceTicks)
        return;
    const feetBlock = safeGetBlock(player.dimension, loc.x, loc.y, loc.z);
    if (!feetBlock?.isValid || feetBlock.typeId !== "minecraft:web")
        return;
    if (movingSpeed <= cfg.threshold)
        return;
    executePunishment({
        player,
        detection: "NoSlow",
        punishment: cfg.punish.type,
        freezeTicks: cfg.freezeTicks,
        tempkickSeconds: cfg.punish.seconds,
        reason: `speed: ${movingSpeed.toFixed(3)}`,
    });
}
export function checkAirSwim(player, isOnGround) {
    if (PermissionManager.shouldSkipDetection(player, DetectionType.AirSwim))
        return;
    const cfg = currentConfig.AirSwim;
    if (!cfg?.enabled)
        return;
    if (player.isInWater)
        return;
    if (!isOnGround)
        return;
    if (!player.isSwimming)
        return;
    if (player.isFlying || player.isGliding)
        return;
    executePunishment({
        player,
        detection: "AirSwim",
        punishment: cfg.punish.type,
        freezeTicks: cfg.freezeTicks,
        tempkickSeconds: cfg.punish.seconds,
    });
}
export function checkStep(player, data, loc, isSpecialMovement, movingSpeed, speedY, isOnGround) {
    if (PermissionManager.shouldSkipDetection(player, DetectionType.Step))
        return;
    const { Step } = currentConfig;
    if (!Step.enabled || !data.Lock.Ride || isSpecialMovement)
        return;
    if (!isOnGround)
        return;
    if (speedY > 0 && Number.isInteger(speedY) && movingSpeed > TPSCalculator.scaleMultiply(Step.minSpeed)) {
        const under = safeGetBlock(player.dimension, loc.x, loc.y - 0.5, loc.z);
        if (!under)
            return;
        if (isFullSolidBlock(under)) {
            executePunishment({
                player,
                detection: "step/A",
                punishment: Step.punish.type,
                tempkickSeconds: Step.punish.seconds,
                rollbackLocation: data.lastLocation,
                reason: `block: "${under.typeId}", speed: ${movingSpeed.toFixed(2)}`,
            });
        }
    }
}
