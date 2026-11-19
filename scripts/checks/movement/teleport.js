import { currentConfig } from "../../data/config.js";
import { staffMessage, TPSCalculator } from "../../util/util.js";
import { PermissionManager, DetectionType } from "../../permission.js";
import { safeCall, safeGet } from "../../util/safe.js";
import { getEffectiveIsFalling } from "./nofall.js";
import { isInBubbleColumn } from "./helpers.js";
import { ENDER_PEARL_GRACE_TICKS, } from "../../util/constants.js";
const TP_BYPASS_TAG = "eac:tpBypass";
const TELEPORT_ROLLBACK_GRACE_TICKS = 20;
const LIKELY_FALLING_VY_THRESHOLD = -0.08;
const LIKELY_FALLING_DY_THRESHOLD = -0.5;
const LIKELY_FALLING_DOWN_TICKS = 2;
const VERTICAL_DOMINANCE_FACTOR = 4.0;
const VERTICAL_MIN_ABS = 1.5;
const MAX_PHYSICAL_SPEED_PER_TICK = 4.5;
const MAX_STALLED_TICKS = 5;
const MAX_EXCEPTION_DIST_SQ = 225.0;
const CHORUS_MAX_GRACE_MULTIPLIER = 2;
const CHORUS_MAX_WAIT_TICKS = 50;
const RIPTIDE_MIN_MOVED_DIST_SQ = 4;
const RIPTIDE_MAX_FLIGHT_TICKS = 120;
const RIPTIDE_MAX_DISTANCE = 50;
const RIPTIDE_GROUND_CONFIRM_TICKS = 3;
const RIPTIDE_STARTUP_PROTECT_TICKS = 10;
let cachedZones = [];
let cachedZonesRef = null;
const stalledTicksMap = new WeakMap();
export function isRiptideItem(item) {
    if (item?.typeId !== "minecraft:trident")
        return false;
    return safeGet(() => {
        return (item.getComponent("enchantable")?.getEnchantments() ?? []).some((e) => {
            const id = e.type.id;
            return id === "minecraft:riptide" || id === "riptide";
        });
    }, false, "teleport.isRiptideItem");
}
export function isRiptideEnvironment(player) {
    if (player.isInWater)
        return true;
    if (player.isSwimming)
        return true;
    const loc = player.location;
    const dim = player.dimension;
    const feet = safeGet(() => dim.getBlock({ x: Math.floor(loc.x), y: Math.floor(loc.y + 0.1), z: Math.floor(loc.z) }), undefined, "teleport.isRiptideEnvironment.feet");
    if (feet?.isLiquid)
        return true;
    const body = safeGet(() => dim.getBlock({ x: Math.floor(loc.x), y: Math.floor(loc.y + 0.9), z: Math.floor(loc.z) }), undefined, "teleport.isRiptideEnvironment.body");
    if (body?.isLiquid)
        return true;
    return false;
}
function getSafeZones() {
    const tp = currentConfig.Teleport;
    const zones = tp?.safeZones;
    if (!zones)
        return [];
    if (zones === cachedZonesRef)
        return cachedZones;
    cachedZonesRef = zones;
    cachedZones = zones;
    return cachedZones;
}
function isInSafeZone(loc, dimId) {
    const zones = getSafeZones();
    const len = zones.length;
    if (len === 0)
        return false;
    for (let i = 0; i < len; i++) {
        const z = zones[i];
        if (z.dim !== dimId)
            continue;
        const minX = Math.min(z.x1, z.x2);
        const maxX = Math.max(z.x1, z.x2);
        const minY = Math.min(z.y1, z.y2);
        const maxY = Math.max(z.y1, z.y2);
        const minZ = Math.min(z.z1, z.z2);
        const maxZ = Math.max(z.z1, z.z2);
        if (loc.x < minX || loc.x > maxX)
            continue;
        if (loc.y < minY || loc.y > maxY)
            continue;
        if (loc.z < minZ || loc.z > maxZ)
            continue;
        return true;
    }
    return false;
}
function updatePearlGrace(data, loc, nowTick) {
    const t = data.teleport;
    if (t.pearlsInFlight > 0 && data.lastLocation) {
        const dx = loc.x - data.lastLocation.x;
        const dy = loc.y - data.lastLocation.y;
        const dz = loc.z - data.lastLocation.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDistCfg = currentConfig.Teleport?.minimumDistance ?? 5.0;
        const thresholdSq = minDistCfg * minDistCfg;
        if (distSq > thresholdSq) {
            t.pearlsInFlight--;
            const newExpiry = Math.max(t.allowedUntilTick, nowTick + ENDER_PEARL_GRACE_TICKS);
            t.allowedUntilTick = Math.min(newExpiry, t.pearlGraceCapTick);
        }
    }
    if (nowTick >= t.allowedUntilTick) {
        t.pearlGraceActive = false;
        t.pearlsInFlight = 0;
        t.pearlGraceCapTick = 0;
    }
}
function updateRiptideState(player, data, loc, nowTick) {
    const t = data.teleport;
    if (!t.riptideActive)
        return false;
    const elapsed = nowTick - t.riptideStartTick;
    let forceEnd = false;
    if (elapsed > RIPTIDE_MAX_FLIGHT_TICKS)
        forceEnd = true;
    if (!forceEnd && t.riptideStartLoc) {
        const dx0 = loc.x - t.riptideStartLoc.x;
        const dy0 = loc.y - t.riptideStartLoc.y;
        const dz0 = loc.z - t.riptideStartLoc.z;
        if (dx0 * dx0 + dy0 * dy0 + dz0 * dz0 > RIPTIDE_MAX_DISTANCE * RIPTIDE_MAX_DISTANCE)
            forceEnd = true;
    }
    if (!forceEnd && elapsed > RIPTIDE_STARTUP_PROTECT_TICKS) {
        const normalState = player.isOnGround || player.isFalling || player.isInWater || player.isSwimming || player.isFlying || player.isGliding;
        if (normalState) {
            let movedEnough = true;
            if (t.riptideStartLoc) {
                const dx0 = loc.x - t.riptideStartLoc.x;
                const dy0 = loc.y - t.riptideStartLoc.y;
                const dz0 = loc.z - t.riptideStartLoc.z;
                movedEnough = dx0 * dx0 + dy0 * dy0 + dz0 * dz0 >= RIPTIDE_MIN_MOVED_DIST_SQ;
            }
            if (movedEnough) {
                t.riptideGroundTicks++;
                if (t.riptideGroundTicks >= RIPTIDE_GROUND_CONFIRM_TICKS)
                    forceEnd = true;
            }
            else {
                t.riptideGroundTicks = 0;
            }
        }
        else {
            t.riptideGroundTicks = 0;
        }
    }
    if (forceEnd) {
        t.riptideActive = false;
        t.riptideStartLoc = undefined;
        t.riptideGroundTicks = 0;
        return false;
    }
    return true;
}
function updateChorusState(player, data, loc, nowTick) {
    const t = data.teleport;
    if (!t.chorusActive)
        return false;
    if (data.lastLocation) {
        const dx = loc.x - data.lastLocation.x;
        const dy = loc.y - data.lastLocation.y;
        const dz = loc.z - data.lastLocation.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq > 25 && !player.isFalling) {
            t.chorusActive = false;
            return true;
        }
    }
    const graceTicks = Math.min(TPSCalculator.scaleTicksFor(player, CHORUS_MAX_WAIT_TICKS), CHORUS_MAX_WAIT_TICKS * CHORUS_MAX_GRACE_MULTIPLIER);
    const elapsed = nowTick - t.chorusStartTick;
    if (elapsed > graceTicks) {
        t.chorusActive = false;
        return false;
    }
    return true;
}
function isLikelyFalling(player, data, dy, actualDistSq) {
    if (actualDistSq > MAX_EXCEPTION_DIST_SQ)
        return false;
    if (getEffectiveIsFalling(player, data))
        return true;
    if (data.Nofall.serverIsFalling)
        return true;
    if (dy < LIKELY_FALLING_DY_THRESHOLD)
        return true;
    if (data.moving.SpeedY < LIKELY_FALLING_VY_THRESHOLD && data.Nofall.consecutiveDownTicks >= LIKELY_FALLING_DOWN_TICKS)
        return true;
    return false;
}
function isPhysicsImpulse(player, data, dy, prevVy, actualDistSq) {
    if (actualDistSq > MAX_EXCEPTION_DIST_SQ)
        return false;
    if (isInBubbleColumn(player, player.location))
        return true;
    if ((player.isInWater || player.isSwimming) && dy > 0)
        return true;
    if (dy < 0 && prevVy > 0)
        return true;
    if (dy > 0) {
        if (player.isJumping || prevVy > 0.1)
            return true;
        if (player.getEffect("jump_boost")?.isValid || player.getEffect("levitation")?.isValid)
            return true;
    }
    return false;
}
export function checkTeleport(player, data, loc, prevVx, prevVy, prevVz, nowTick, isSpecialMovement) {
    const cfg = currentConfig.Teleport;
    if (!cfg?.enabled) {
        data.lastDimension = player.dimension.id;
        return;
    }
    if (data.teleport.isDead)
        return;
    const currentDim = player.dimension.id;
    if (data.lastDimension !== currentDim) {
        data.lastDimension = currentDim;
        stalledTicksMap.delete(player);
        return;
    }
    if (player.hasTag(TP_BYPASS_TAG))
        return;
    if (PermissionManager.shouldSkipDetection(player, DetectionType.Teleport))
        return;
    if (isSpecialMovement && !(player.isInWater || player.isSwimming))
        return;
    if (!data.lastLocation)
        return;
    if (data.teleport.pearlGraceActive)
        updatePearlGrace(data, loc, nowTick);
    if (nowTick < data.teleport.allowedUntilTick)
        return;
    if (data.teleport.knockbackGraceActive && nowTick < data.teleport.knockbackGraceUntil)
        return;
    if (updateRiptideState(player, data, loc, nowTick))
        return;
    if (updateChorusState(player, data, loc, nowTick))
        return;
    const lastLocation = data.lastLocation;
    const dx = loc.x - lastLocation.x;
    const dy = loc.y - lastLocation.y;
    const dz = loc.z - lastLocation.z;
    const actualDistSq = dx * dx + dy * dy + dz * dz;
    const engineVel = player.getVelocity();
    const isMovingIntent = (engineVel.x * engineVel.x + engineVel.y * engineVel.y + engineVel.z * engineVel.z) > 0.0025;
    if (actualDistSq < 0.0001) {
        if (isMovingIntent) {
            const currentStalled = stalledTicksMap.get(player) ?? 0;
            stalledTicksMap.set(player, Math.min(MAX_STALLED_TICKS, currentStalled + 1));
        }
        else {
            stalledTicksMap.set(player, 0);
        }
        return;
    }
    const stalledTicks = stalledTicksMap.get(player) ?? 0;
    stalledTicksMap.set(player, 0);
    const tickDelta = Math.max(1, stalledTicks + 1);
    const actualDist = Math.sqrt(actualDistSq);
    const horizSq = dx * dx + dz * dz;
    const vertSq = dy * dy;
    if (dy < 0 && Math.abs(dy) > VERTICAL_MIN_ABS && vertSq > horizSq * VERTICAL_DOMINANCE_FACTOR)
        return;
    const lagScale = TPSCalculator.getCombinedRelaxationScale(player);
    const prevVelSq = prevVx * prevVx + prevVy * prevVy + prevVz * prevVz;
    const velocityBudgetSq = prevVelSq * ((cfg.speedMultiplier ?? 3.0) * tickDelta) ** 2;
    const minDist = TPSCalculator.scaleMultiplyFor(player, cfg.minimumDistance ?? 5.0);
    const minimumBudgetSq = (minDist * tickDelta) ** 2;
    const physicalLimitDist = (MAX_PHYSICAL_SPEED_PER_TICK * tickDelta) + 2.0;
    const physicalLimitSq = physicalLimitDist ** 2;
    const allowedDistSq = Math.max(velocityBudgetSq, minimumBudgetSq, physicalLimitSq) * (lagScale ** 2);
    if (actualDistSq <= allowedDistSq)
        return;
    if (isLikelyFalling(player, data, dy, actualDistSq))
        return;
    if (isPhysicsImpulse(player, data, dy, prevVy, actualDistSq))
        return;
    if (isInSafeZone(loc, currentDim))
        return;
    if (isInSafeZone(lastLocation, currentDim))
        return;
    staffMessage(player, "Teleport", `dist²: ${actualDistSq.toFixed(2)}, allowed²: ${allowedDistSq.toFixed(2)}, delta: ${tickDelta}t, pos: ${actualDist.toFixed(3)}`);
    safeCall(() => {
        player.teleport(lastLocation, { dimension: player.dimension });
        data.teleport.justRolledBack = true;
        data.teleport.allowedUntilTick = nowTick + TELEPORT_ROLLBACK_GRACE_TICKS;
        data.moving.SpeedX = 0;
        data.moving.SpeedY = 0;
        data.moving.SpeedZ = 0;
        data.Nofall.isFallingFlag = false;
        data.Nofall.fallStartY = player.location.y;
        data.Nofall.tookFallDamage = false;
    }, undefined, "Teleport.rollback");
}
