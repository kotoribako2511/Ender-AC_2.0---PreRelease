import { GameMode, system } from "@minecraft/server";
import { currentConfig } from "../../data/config.js";
import { MathUtils, TPSCalculator, WorldUtils } from "../../util/util.js";
import { PermissionManager, DetectionType } from "../../permission.js";
import { addFlag, decayFlag } from "./flags.js";
import { executePunishment } from "../../util/punishment.js";
import { getEffectiveIsFalling } from "./nofall.js";
import { safeGetBlock } from "./helpers.js";
import { MC_AIR } from "../../util/constants.js";
//fly A
const FLY_A_BUFFER_SIZE = 8;
const FLY_A_NEAR_ZERO_VELOCITY = 0.02;
const FLY_A_HOVER_Y_RANGE = 0.05;
const FLY_A_CONSTANT_RISE_DELTA = 0.05;
const FLY_A_CONSTANT_RISE_Y_THRESHOLD = 0.5;
//AirJump
const BDSFLY_BUFFER_SIZE = 5;
export function checkFlyA(player, data, loc, isOnGround, isGliding, isSpecialMovement, speedY, hasEffect, elytra, nowTick) {
    if (PermissionManager.shouldSkipDetection(player, DetectionType.Fly)) {
        data.flyA.length = 0;
        data.flyAY.length = 0;
        return;
    }
    const { Fly } = currentConfig;
    if (!Fly.flyA.enabled || data.joinBypass.enable) {
        data.flyA.length = 0;
        data.flyAY.length = 0;
        return;
    }
    if (isOnGround || elytra || isSpecialMovement || hasEffect || isGliding) {
        data.flyA.length = 0;
        data.flyAY.length = 0;
        return;
    }
    data.flyA.unshift(speedY);
    if (data.flyA.length > FLY_A_BUFFER_SIZE)
        data.flyA.pop();
    data.flyAY.unshift(loc.y);
    if (data.flyAY.length > FLY_A_BUFFER_SIZE)
        data.flyAY.pop();
    if (data.flyA.length < FLY_A_BUFFER_SIZE)
        return;
    const velocityNearZero = data.flyA.every((v) => v > -FLY_A_NEAR_ZERO_VELOCITY && v < FLY_A_NEAR_ZERO_VELOCITY);
    let yMin = data.flyAY[0];
    let yMax = data.flyAY[0];
    for (let i = 1; i < data.flyAY.length; i++) {
        const v = data.flyAY[i];
        if (v < yMin)
            yMin = v;
        if (v > yMax)
            yMax = v;
    }
    const yRange = yMax - yMin;
    const isHovering = velocityNearZero && yRange < FLY_A_HOVER_Y_RANGE;
    const isConstantRise = data.flyA.every((v) => v > 0)
        && data.flyA.every((v, i, arr) => i === 0 || Math.abs(v - arr[i - 1]) < FLY_A_CONSTANT_RISE_DELTA);
    const yRising = data.flyAY[0] - data.flyAY[data.flyAY.length - 1] > FLY_A_CONSTANT_RISE_Y_THRESHOLD;
    const reallyConstantRise = isConstantRise && yRising;
    if (!isHovering && !reallyConstantRise)
        return;
    if (isHovering && !getEffectiveIsFalling(player, data))
        return;
    data.flyA.length = 0;
    data.flyAY.length = 0;
    const vl = addFlag(data.flyFlag, nowTick);
    if (vl < Fly.flagThreshold)
        return;
    const reason = isHovering ? "Hovering" : "Constant Rise";
    executePunishment({
        player,
        detection: "fly/A",
        punishment: Fly.flyA.punish.type,
        freezeTicks: Fly.flyA.freezeTicks,
        tempkickSeconds: Fly.flyA.punish.seconds,
        rollbackLocation: data.lastOnGround_loc,
        reason: `[${reason}] VL: ${vl}`,
        broadcast: false,
        lockDetection: true,
    });
    data.flyFlag.lastFlagTick = 0;
}
export function checkFlyC(player, data) {
    if (PermissionManager.shouldSkipDetection(player, DetectionType.Fly))
        return;
    const { Fly } = currentConfig;
    const isCreative = player.getGameMode() === GameMode.Creative;
    if (!Fly.flyC.enabled || !player.isFlying || isCreative)
        return;
    executePunishment({
        player,
        detection: "fly/Creative",
        punishment: Fly.flyC.punish.type,
        freezeTicks: Fly.flyC.freezeTicks,
        tempkickSeconds: Fly.flyC.punish.seconds,
        rollbackLocation: data.lastLocation,
        broadcast: false,
        lockDetection: true,
    });
}
export function checkFlyG(player, data, elytra) {
    if (PermissionManager.shouldSkipDetection(player, DetectionType.Fly))
        return;
    const { Fly } = currentConfig;
    if (!Fly.flyG.enabled || !player.isGliding || elytra)
        return;
    executePunishment({
        player,
        detection: "fly/Gliding",
        punishment: Fly.flyG.punish.type,
        freezeTicks: Fly.flyG.freezeTicks,
        tempkickSeconds: Fly.flyG.punish.seconds,
        rollbackLocation: data.lastLocation,
        broadcast: false,
        lockDetection: true,
    });
}
export function checkBDSFly(player, data, loc, isSpecialMovement, speedY, hasEffect) {
    const cfg = currentConfig.BDSFly;
    if (!cfg.enabled)
        return;
    const BDSFly = data.BDSfly;
    const nowTick = system.currentTick;
    decayFlag(BDSFly.bdsflyFlag, nowTick, cfg.flagDecayTicks, cfg.flagDecayAmount);
    const wasOnGround = BDSFly.lastOnGroundBDS;
    BDSFly.lastOnGroundBDS = player.isOnGround;
    if (PermissionManager.shouldSkipDetection(player, DetectionType.BDSFly)) {
        BDSFly.BDSfly.length = 0;
        return;
    }
    if (hasEffect) {
        BDSFly.BDSfly.length = 0;
        return;
    }
    BDSFly.BDSfly.unshift(speedY);
    if (BDSFly.BDSfly.length > BDSFLY_BUFFER_SIZE)
        BDSFly.BDSfly.length = BDSFLY_BUFFER_SIZE;
    if (BDSFly.BDSfly.length < BDSFLY_BUFFER_SIZE)
        return;
    const dim = player.dimension;
    const belowId = safeGetBlock(dim, loc.x, loc.y - 1, loc.z)?.typeId ?? MC_AIR;
    if (data.Lock.Climb && data.Lock.Freeze_Detection
        && player.isOnGround
        && !wasOnGround
        && !isSpecialMovement
        && belowId === MC_AIR) {
        const quad = MathUtils.isQuadratic(BDSFly.BDSfly);
        const notAllZero = !BDSFly.BDSfly.every((v) => v === 0);
        const isFloor = WorldUtils.isfloor(loc, dim.id);
        if (quad < TPSCalculator.scaleMultiply(cfg.threshold) && notAllZero && isFloor) {
            const vl = addFlag(BDSFly.bdsflyFlag, nowTick);
            if (vl < cfg.flagThreshold)
                return;
            executePunishment({
                player,
                detection: "fly/AirJump",
                punishment: cfg.punish.type,
                freezeTicks: cfg.freezeTicks,
                tempkickSeconds: cfg.punish.seconds,
                rollbackLocation: data.lastOnGround_loc ?? data.lastLocation,
                broadcast: false,
                lockDetection: true,
            });
            BDSFly.bdsflyFlag.vl = 0;
            BDSFly.bdsflyFlag.lastFlagTick = 0;
        }
    }
}
