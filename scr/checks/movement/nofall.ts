import { Player, GameMode, Vector3, system, world, EntityRidingComponent } from "@minecraft/server";
import { currentConfig } from "../../data/config.js";
import { TPSCalculator, WorldUtils } from "../../util/util.js";
import { ACPlayer } from "../../data/type.js";
import { PermissionManager, DetectionType } from "../../permission.js";
import { addFlag } from "./flags.js";
import { executePunishment } from "../../util/punishment.js";
import { MC_AIR } from "../../util/constants.js";

const DOWNWARD_VY_THRESHOLD = -0.08;
const FALLING_VY_THRESHOLD = -0.15;
const GENERAL_FALLING_VY_THRESHOLD = -0.1;
const CONSECUTIVE_DOWN_TICKS_THRESHOLD = 2;
const SPEED_DELTA_THRESHOLD = 0.001;
const FALLING_VY_SPOOF_THRESHOLD = -0.2;
const AIR_TICKS_SPOOF_THRESHOLD = 10;
const SLOWFALL_VY_THRESHOLD = 0.4;
const SLOWFALL_BUFFER_SIZE = 5;
const SLOWFALL_BUFFER_KEEP = 4;
const SPOOF_SCORE_MAX = 100;
const SPOOF_SCORE_RESET_FACTOR = 0.5;
const SPOOF_SCORE_DECAY_SPECIAL = 5;
const NOFALL_CHECK_DELAY_TICKS = 20;
const SPOOF_PUNISH_COOLDOWN_TICKS = 40;

const lastSpoofPunishTick = new WeakMap<Player, number>();

//nofall beta version
function computeServerIsFalling(player: Player, data: ACPlayer): boolean {
    const n = data.Nofall;
    if (n.lastComputedTick === system.currentTick) return n.serverIsFalling;
    n.lastComputedTick = system.currentTick;

    const ridingComp = player.getComponent(EntityRidingComponent.componentId);
    const isRiding = ridingComp?.isValid ?? false;
    const isSpecial = isRiding || player.isClimbing || player.isFlying || player.isGliding || player.isInWater || player.isSwimming;

    const isOnGround = player.isOnGround;
    const speedY = data.moving.SpeedY;

    n.airTicks = isOnGround ? 0 : n.airTicks + 1;
    const isDownward = !isOnGround && speedY < DOWNWARD_VY_THRESHOLD && !isSpecial;
    n.consecutiveDownTicks = isDownward ? n.consecutiveDownTicks + 1 : 0;
    const definitelyFalling = n.consecutiveDownTicks >= CONSECUTIVE_DOWN_TICKS_THRESHOLD && speedY < FALLING_VY_THRESHOLD;
    n.fallingTicks = definitelyFalling ? n.fallingTicks + 1 : 0;

    n.serverIsFalling = definitelyFalling || (n.fallingTicks > 0 && !isOnGround);
    return n.serverIsFalling;
}

export function getEffectiveIsFalling(player: Player, data: ACPlayer): boolean {
    if (data.Nofall.spoofScore >= currentConfig.Nofall.fallSpoofScoreThreshold) {
        return computeServerIsFalling(player, data);
    }
    return player.isFalling;
}

function updateSpoofScore(player: Player, data: ACPlayer, isOnGround: boolean): void {
    const cfg = currentConfig.Nofall;
    const endingSpeedY = -3.5
    if (!cfg.fallSpoofEnabled) return;
    const n = data.Nofall;
    let delta = 0;
    const moving = data.moving;

    const isTerminalVelocity = moving.SpeedY <= endingSpeedY;
    const isLongFall = n.isFallingFlag && (n.fallStartY - player.location.y) > 30;
    const TPS_LIMIT = 19.5
    if (n.serverIsFalling) {
        if (isTerminalVelocity || isLongFall) {
            delta -= 3;
        } else {
            if (!player.isFalling) delta += 2;
            const speedDelta = Math.abs(moving.SpeedY - moving.LastSpeedY);
            const isLagging = TPSCalculator.getTPS() < TPS_LIMIT;
            if (!isLagging && speedDelta < SPEED_DELTA_THRESHOLD && moving.SpeedY < FALLING_VY_SPOOF_THRESHOLD) {
                delta += 1;
            }
        }
    } else if (!isOnGround) {
        if (!isTerminalVelocity && !isLongFall) {
            delta -= 1;
        }
    } else {
        delta -= 3;
    }

    if (n.airTicks > AIR_TICKS_SPOOF_THRESHOLD && !n.serverIsFalling && !isTerminalVelocity && !isLongFall) {
        delta += 1;
    }

    n.spoofScore = Math.max(0, Math.min(SPOOF_SCORE_MAX, n.spoofScore + delta));

    if (n.spoofScore >= cfg.fallSpoofScoreThreshold) {
        const lastTick = lastSpoofPunishTick.get(player) ?? -Infinity;
        if (system.currentTick - lastTick >= SPOOF_PUNISH_COOLDOWN_TICKS) {
            executePunishment({
                player,
                detection: "FallSpoof",
                punishment: cfg.fallSpoof.type,
                tempkickSeconds: cfg.fallSpoof.seconds,
                rollbackLocation: data.lastOnGround_loc,
                reason: `[ score: ${n.spoofScore}, vy: ${data.moving.SpeedY.toFixed(2)}, fallTicks: ${n.fallingTicks} ]`,
            });
            lastSpoofPunishTick.set(player, system.currentTick);
        }
        n.spoofScore = Math.floor(cfg.fallSpoofScoreThreshold * SPOOF_SCORE_RESET_FACTOR);
    }
}

export function checkNofall(
    player: Player,
    data: ACPlayer,
    loc: Vector3,
    isSpecialMovement: boolean,
    nowTick: number,
    gm: GameMode,
    isOnGround: boolean,
    hasEffect: boolean,
): void {
    if (PermissionManager.shouldSkipDetection(player, DetectionType.Nofall)) {
        data.Nofall.spoofScore = 0;
        return;
    }
    const { Nofall } = currentConfig;
    if (!Nofall.NofallEnabled || !world.gameRules.fallDamage) {
        data.Nofall.spoofScore = 0;
        return;
    }

    const dimId = player.dimension.id;
    const nofallData = data.Nofall;

    const feetBlock = WorldUtils.getblock({ x: loc.x, y: loc.y - 0.1, z: loc.z }, dimId);
    const isLiquid = feetBlock === "minecraft:water" || feetBlock === "minecraft:flowing_water" || feetBlock === "minecraft:lava" || feetBlock === "minecraft:flowing_lava";

    if (hasEffect || isSpecialMovement || player.isInWater || player.isSwimming || isLiquid) {
        nofallData.spoofScore = Math.max(0, nofallData.spoofScore - SPOOF_SCORE_DECAY_SPECIAL);
        nofallData.isFallingFlag = false;
        nofallData.isChecking = false;
        return;
    }

    computeServerIsFalling(player, data);
    updateSpoofScore(player, data, isOnGround);

    const isFalling = getEffectiveIsFalling(player, data);
    const isGeneralFalling = !isOnGround && data.moving.SpeedY < GENERAL_FALLING_VY_THRESHOLD;

    if (isGeneralFalling && !nofallData.isFallingFlag) {
        nofallData.isFallingFlag = true;
        nofallData.fallStartY = loc.y;
    }
    if (!isFalling && !isOnGround) {
        nofallData.isFallingFlag = false;
    }

    if (isOnGround && nofallData.isFallingFlag && !nofallData.isChecking) {
        if (nofallData.tookFallDamage) {
            nofallData.isFallingFlag = false;
            nofallData.tookFallDamage = false;
        } else {
            const fallDistance = nofallData.fallStartY - loc.y;
            if (fallDistance > TPSCalculator.scaleMultiplyFor(player, Nofall.distanceThreshold)
                && !WorldUtils.isStandingOnSafeBlock(loc, dimId) && !isLiquid) {

                nofallData.isChecking = true;
                const expectedFallStartY = nofallData.fallStartY;

                system.runTimeout(() => {
                    if (!player.isValid) {
                        nofallData.isChecking = false;
                        nofallData.isFallingFlag = false;
                        nofallData.tookFallDamage = false;
                        return;
                    }

                    const noNewFall = Math.abs(nofallData.fallStartY - expectedFallStartY) < 0.5;
                    const currentLoc = player.location;
                    const currentDimId = player.dimension.id;
                    const currentFeet = WorldUtils.getblock({ x: currentLoc.x, y: currentLoc.y - 0.1, z: currentLoc.z }, currentDimId);
                    const isNowLiquid = currentFeet === "minecraft:water" || currentFeet === "minecraft:flowing_water" || currentFeet === "minecraft:lava" || currentFeet === "flowing_lava";
                    const isNowSpecial = player.isFlying || player.isGliding || player.isInWater || player.isSwimming || player.isClimbing || player.getComponent("minecraft:riding")?.isValid;
                    const isNowSafe = (player.isOnGround && (WorldUtils.isStandingOnSafeBlock(currentLoc, currentDimId) || isNowLiquid)) || isNowSpecial;

                    if (gm !== GameMode.Creative && gm !== GameMode.Spectator
                        && !nofallData.tookFallDamage
                        && !hasEffect
                        && !isSpecialMovement
                        && !isNowSafe
                        && noNewFall) {
                        executePunishment({
                            player,
                            detection: "Nofall/A-beta",
                            punishment: Nofall.aBeta.type,
                            tempkickSeconds: Nofall.aBeta.seconds,
                            rollbackLocation: data.lastOnGround_loc,
                            reason: `[ Distance: ${fallDistance.toFixed(2)} ]`,
                        });
                    }

                    nofallData.isChecking = false;
                    nofallData.isFallingFlag = false;
                    nofallData.tookFallDamage = false;
                }, TPSCalculator.scaleTicksFor(player, NOFALL_CHECK_DELAY_TICKS));
            } else {
                nofallData.isFallingFlag = false;
            }
        }
    }

    let isFeetAir = false;
    let isChunkLoaded = true;
    try {
        const block = player.dimension.getBlock({ x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) });
        if (block) {
            isFeetAir = block.isAir;
        } else {
            isChunkLoaded = false;
        }
    } catch {
        isChunkLoaded = false;
    }

    const OnGroundSpoofCheck =
        Nofall.OnGroundSpoofEnabled &&
        nowTick % Math.max(1, Nofall.onGroSpfScanTick) === 0 &&
        isOnGround && isFalling &&
        isChunkLoaded && isFeetAir;

    if (OnGroundSpoofCheck) {
        executePunishment({
            player,
            detection: "Nofall/OnGroundSpoof",
            punishment: Nofall.onGroSpf.type,
            tempkickSeconds: Nofall.onGroSpf.seconds,
            rollbackLocation: data.lastOnGround_loc,
        });
    }

    if (Nofall.slowFallEnabled) {
        const slowFall = nofallData.isslowFall;
        slowFall.unshift(loc.y - (data.lastLocation?.y ?? loc.y));
        if (slowFall.length >= SLOWFALL_BUFFER_SIZE) {
            if (data.moving.SpeedY !== 0 && data.moving.SpeedY < SLOWFALL_VY_THRESHOLD
                && !isSpecialMovement && isFalling
                && slowFall.every(v => v === slowFall[0])) {

                const vl = addFlag(data.slowfallFlag, nowTick);
                if (vl >= Nofall.slowFallFlagThreshold) {
                    executePunishment({
                        player,
                        detection: "Nofall/SlowFall",
                        punishment: Nofall.slowFall.type,
                        tempkickSeconds: Nofall.slowFall.seconds,
                        rollbackLocation: data.lastOnGround_loc,
                        reason: `[ vy: ${data.moving.SpeedY.toFixed(3)} VL: ${vl} ]`,
                    });
                    data.slowfallFlag.vl = 0;
                    data.slowfallFlag.lastFlagTick = 0;
                }
            }
            slowFall.length = SLOWFALL_BUFFER_KEEP;
        }
    }
}