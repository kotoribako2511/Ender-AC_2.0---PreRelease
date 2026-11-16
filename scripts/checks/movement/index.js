import { GameMode } from "@minecraft/server";
import { currentConfig } from "../../data/config.js";
import { decayFlag, resetMovementState } from "./flags.js";
import { checkContradictions } from "./contradiction.js";
import { checkFastFall, checkNoSlow, checkAirSwim, checkStep } from "./ground.js";
import { checkFlyA, checkFlyC, checkFlyG, checkBDSFly } from "./fly.js";
import { checkSpeed } from "./speed.js";
import { checkNofall } from "./nofall.js";
import { checkNoClip, checkPhase } from "./noclip.js";
import { checkTeleport } from "./teleport.js";
import { hasSpecialEffect, hasSpeedEffect, isKnockbackImmune, isOnIce, isOnBouncy, isInBubbleColumn, isInSpecialSlowBlock, hasElytraEquipped, } from "./helpers.js";
export function processMovementTick(player, data, loc, isSpecialMovement, nowTick, isRiding) {
    if (data.teleport.knockbackGraceActive) {
        if (data.teleport.knockbackWasInAir && player.isOnGround) {
            data.teleport.knockbackGraceActive = false;
            data.teleport.knockbackGraceUntil = 0;
            data.teleport.knockbackWasInAir = false;
        }
        else if (!player.isOnGround) {
            data.teleport.knockbackWasInAir = true;
        }
    }
    if (data.teleport.isDead || nowTick < data.teleport.allowedUntilTick) {
        return;
    }
    if (data.teleport.knockbackGraceActive && nowTick < data.teleport.knockbackGraceUntil) {
        return;
    }
    if (data.teleport.knockbackGraceActive) {
        data.teleport.knockbackGraceActive = false;
    }
    const gm = player.getGameMode();
    const isSurvival = gm !== GameMode.Creative && gm !== GameMode.Spectator;
    const isOnGround = player.isOnGround;
    const isGliding = player.isGliding;
    const Freeze_Detection = data.Lock.Freeze_Detection;
    const currentDim = player.dimension.id;
    if (data.lastDimension !== currentDim) {
        data.lastDimension = currentDim;
        resetMovementState(data);
        return;
    }
    const last = data.lastLocation ?? loc;
    const vx = loc.x - last.x;
    const vy = loc.y - last.y;
    const vz = loc.z - last.z;
    const vxzSq = vx * vx + vz * vz;
    const jumpSq = vxzSq + vy * vy;
    const movingSpeed = Math.sqrt(vxzSq);
    const speedY = vy;
    const prevVx = data.moving.SpeedX;
    const prevVy = data.moving.SpeedY;
    const prevVz = data.moving.SpeedZ;
    checkTeleport(player, data, loc, prevVx, prevVy, prevVz, nowTick, isSpecialMovement);
    if (jumpSq > 25 || data.teleport.justRolledBack) {
        resetMovementState(data);
        return;
    }
    data.moving.Speed = movingSpeed;
    data.moving.SpeedX = vx;
    data.moving.SpeedY = speedY;
    data.moving.SpeedZ = vz;
    if (data.joinBypass.enable && (vxzSq !== 0 || vy !== 0))
        data.joinBypass.enable = false;
    if (!isSurvival || !Freeze_Detection)
        return;
    decayFlag(data.flyFlag, nowTick, currentConfig.Fly.flagDecayTicks, currentConfig.Fly.flagDecayAmount);
    decayFlag(data.slowfallFlag, nowTick, currentConfig.Nofall.slowFallFlagDecayTicks, currentConfig.Nofall.slowFallFlagDecayAmount);
    checkContradictions(player, data, isOnGround, speedY, isSpecialMovement);
    checkFastFall(player, loc, isOnGround, speedY);
    checkNoSlow(player, data, loc, movingSpeed, nowTick);
    checkAirSwim(player, isOnGround);
    const hasEffect = hasSpecialEffect(player);
    const hasSpeed = hasSpeedEffect(player);
    const isImmune = isKnockbackImmune(player);
    const onIce = isOnIce(player, loc);
    const onBouncy = isOnBouncy(player, loc);
    const inBubble = isInBubbleColumn(player, loc);
    const inSlow = isInSpecialSlowBlock(player, loc);
    const elytra = hasElytraEquipped(player);
    checkFlyA(player, data, loc, isOnGround, isGliding, isSpecialMovement, speedY, hasEffect, elytra, nowTick);
    checkFlyC(player, data);
    checkFlyG(player, data, elytra);
    checkBDSFly(player, data, loc, isSpecialMovement, speedY, hasEffect);
    checkSpeed(player, data, isGliding, vxzSq, hasSpeed, onIce, isRiding, inBubble, isImmune);
    checkNofall(player, data, loc, isSpecialMovement, nowTick, gm, isOnGround, hasEffect);
    checkStep(player, data, loc, isSpecialMovement, movingSpeed, speedY, isOnGround);
    checkNoClip(player, data, loc, isSpecialMovement, speedY, isOnGround);
    checkPhase(player, loc, movingSpeed, onBouncy, inSlow, isOnGround, isGliding);
}
