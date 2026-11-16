import { system, GameMode } from "@minecraft/server";
import { currentConfig } from "../../data/config.js";
import { getPlayerData, TPSCalculator } from "../../util/util.js";
import { PermissionManager, DetectionType } from "../../permission.js";
import { executePunishment } from "../../util/punishment.js";
import { safeCall } from "../../util/safe.js";
const SCAFFOLD_CLEAR_WINDOW_MS = 5000;
const SCAFFOLD_PLACE_LOG_WINDOW_MS = 1000;
const SCAFFOLD_POTENTIAL_THRESHOLD = 4;
const SCAFFOLD_RIGHT_ANGLE_DEGREES = 90;
const SCAFFOLD_DIAGONAL_ANGLE_DEGREES = 45;
const SCAFFOLD_RAD_TO_DEG = 180 / Math.PI;
const SCAFFOLD_MOVE_EPSILON_SQ = 0.0001;
const SCAFFOLD_A_MIN_BPS = 12;
const SCAFFOLD_B_Y_OFFSET = 1;
const SCAFFOLD_B_YDIF_THRESHOLD = -1;
const SCAFFOLD_B_POTENTIAL_THRESHOLD = 2;
const SCAFFOLD_C_MIN_BPS = 12;
const SCAFFOLD_C_MIN_MDIFF = 10;
const SCAFFOLD_D_MIN_BPS = 9;
const SCAFFOLD_E_MIN_BPS = 11;
const SCAFFOLD_E_MIN_MDIFF = 15;
const SCAFFOLD_F_MIN_BPS = 6;
const SCAFFOLD_F_PITCH_THRESHOLD = -15;
const SCAFFOLD_F_PITCH_STRONG = -80;
const SCAFFOLD_G_SPEED_FACTOR = 8;
const SCAFFOLD_G_BPS_OFFSET = 5;
const SCAFFOLD_G_BPS_FACTOR = 0.4;
const SCAFFOLD_G_THRESHOLD = 20;
const SCAFFOLD_H_MIN_BPS = 5;
const SCAFFOLD_MIN_DECAY_TICKS = 1;
const SCAFFOLD_MIN_DECAY_AMOUNT = 1;
function clearRecentBlocks(data) {
    const now = Date.now();
    const log = data.scaffold.placeLog;
    for (const entry of log) {
        if (now - entry.at >= SCAFFOLD_CLEAR_WINDOW_MS)
            continue;
        safeCall(() => {
            const b = entry.block;
            if (b?.isValid && b.typeId === entry.blockId) {
                b.setType("minecraft:air");
            }
        }, undefined, "Scaffold.clearRecentBlocks");
    }
    log.length = 0;
}
export function onScaffoldPlace(player, block) {
    const cfg = currentConfig.Scaffold;
    if (!cfg?.enabled)
        return;
    if (PermissionManager.shouldSkipDetection(player, DetectionType.Scaffold))
        return;
    const gm = player.getGameMode();
    if (gm === GameMode.Creative || gm === GameMode.Spectator)
        return;
    const data = getPlayerData(player);
    const now = Date.now();
    const log = data.scaffold.placeLog;
    while (log.length && now - log[0].at > SCAFFOLD_PLACE_LOG_WINDOW_MS)
        log.shift();
    const bps = log.length;
    log.push({ at: now, blockId: block.typeId, block });
    runScaffoldDetections(player, data, block, bps);
    if (data.scaffold.potentialScaffold <= SCAFFOLD_POTENTIAL_THRESHOLD)
        return;
    const types = [...data.scaffold.types];
    data.scaffold.types.clear();
    data.scaffold.potentialScaffold = 0;
    const nowTick = system.currentTick;
    const flag = data.scaffold.flag;
    flag.vl += 1;
    flag.lastFlagTick = nowTick;
    if (flag.vl < TPSCalculator.scaleMultiply(cfg.flagThreshold))
        return;
    const vel = player.getVelocity();
    const speed = Math.hypot(vel.x, vel.y, vel.z);
    executePunishment({
        player,
        detection: "Scaffold",
        punishment: cfg.punish.type,
        freezeTicks: cfg.freezeTicks,
        tempkickSeconds: cfg.punish.seconds,
        reason: `[${types.join("/")}] VL: ${flag.vl} (bps: ${bps}, v: ${speed.toFixed(2)})`,
        broadcast: false,
        lockDetection: false,
        onSetback: () => {
            clearRecentBlocks(data);
            safeCall(() => player.teleport(player.location), undefined, "Scaffold.rollbackSelfTeleport");
        },
    });
    flag.vl = 0;
    flag.lastFlagTick = 0;
}
function runScaffoldDetections(player, data, block, bps) {
    const cfg = currentConfig.Scaffold;
    if (bps <= TPSCalculator.scaleDivide(cfg.minBPS))
        return;
    const loc = player.location;
    const vel = player.getVelocity();
    const speed = Math.hypot(vel.x, vel.y, vel.z);
    const isMoving = speed > TPSCalculator.scaleDivide(cfg.minSpeed);
    const dir = player.getViewDirection();
    const dDegrees = dir.x === 0
        ? SCAFFOLD_RIGHT_ANGLE_DEGREES * Math.sign(dir.z)
        : Math.atan(dir.z / dir.x) * SCAFFOLD_RAD_TO_DEG;
    const dDiff = Math.abs(Math.abs(dDegrees) - SCAFFOLD_DIAGONAL_ANGLE_DEGREES);
    const isDiagonalView = dDiff < TPSCalculator.scaleMultiply(cfg.dDiff);
    const lastLoc = data.scaffold.lastLocation;
    if (!lastLoc)
        return;
    const dx = loc.x - lastLoc.x;
    const dz = loc.z - lastLoc.z;
    if (dx * dx + dz * dz < SCAFFOLD_MOVE_EPSILON_SQ)
        return;
    const mDegrees = dx === 0
        ? SCAFFOLD_RIGHT_ANGLE_DEGREES * Math.sign(dz)
        : Math.atan(dz / dx) * SCAFFOLD_RAD_TO_DEG;
    const mDiff = Math.abs(Math.abs(mDegrees) - SCAFFOLD_DIAGONAL_ANGLE_DEGREES);
    const rot = player.getRotation();
    const isOnGround = player.isOnGround;
    const isSprinting = player.isSprinting;
    const isJumping = player.isJumping;
    if (cfg.A && bps >= SCAFFOLD_A_MIN_BPS && isMoving && isDiagonalView && isOnGround) {
        data.scaffold.types.add("A");
        data.scaffold.potentialScaffold++;
        return;
    }
    if (cfg.B)
        scaffoldB(player, data, block);
    if (cfg.C && bps >= SCAFFOLD_C_MIN_BPS && isMoving && isDiagonalView && mDiff < SCAFFOLD_C_MIN_MDIFF) {
        data.scaffold.types.add("C");
        data.scaffold.potentialScaffold++;
        return;
    }
    if (cfg.D && bps >= SCAFFOLD_D_MIN_BPS && Number.isInteger(rot.x) && (isSprinting || isJumping)) {
        data.scaffold.types.add("D");
        data.scaffold.potentialScaffold++;
        return;
    }
    if (cfg.E && bps >= SCAFFOLD_E_MIN_BPS && isMoving && mDiff < SCAFFOLD_E_MIN_MDIFF && isOnGround) {
        data.scaffold.types.add("E");
        data.scaffold.potentialScaffold++;
        return;
    }
    if (cfg.F && bps >= SCAFFOLD_F_MIN_BPS && rot.x < SCAFFOLD_F_PITCH_THRESHOLD && block.y < loc.y) {
        data.scaffold.types.add("F");
        data.scaffold.potentialScaffold++;
        if (rot.x < SCAFFOLD_F_PITCH_STRONG)
            data.scaffold.potentialScaffold++;
        return;
    }
    if (cfg.G && Math.sqrt(speed) * SCAFFOLD_G_SPEED_FACTOR + (bps - SCAFFOLD_G_BPS_OFFSET) * SCAFFOLD_G_BPS_FACTOR > SCAFFOLD_G_THRESHOLD) {
        data.scaffold.types.add("G");
        data.scaffold.potentialScaffold++;
        return;
    }
    if (cfg.H && bps >= SCAFFOLD_H_MIN_BPS && ((Number.isInteger(rot.x) && rot.x !== 0) || (Number.isInteger(rot.y) && rot.y !== 0))) {
        data.scaffold.types.add("H");
        data.scaffold.potentialScaffold++;
        return;
    }
}
function scaffoldB(player, data, block) {
    const yDiff = block.y - player.location.y + SCAFFOLD_B_Y_OFFSET;
    if (yDiff !== SCAFFOLD_B_YDIF_THRESHOLD)
        return;
    try {
        const above = block.above();
        if (above && above.isAir)
            return;
        const below = block.below();
        if (!below)
            return;
        const surroundings = [below.below(), below.north(), below.south(), below.east(), below.west()];
        if (!surroundings.every(b => b && (b.isAir || b.isLiquid)))
            return;
        data.scaffold.types.add("B");
        data.scaffold.potentialScaffold++;
        if (data.scaffold.potentialScaffold > SCAFFOLD_B_POTENTIAL_THRESHOLD || player.isSprinting) {
            try {
                block.setType("minecraft:air");
            }
            catch (e) {
                console.warn(`[Scaffold.scaffoldB.setType] ${e}`);
            }
        }
    }
    catch (e) {
        console.warn(`[Scaffold.scaffoldB] ${e}`);
    }
}
export function updateScaffoldLastLocation(player) {
    const data = getPlayerData(player);
    data.scaffold.lastLocation = player.location;
}
export function processScaffoldTick(player, nowTick) {
    const data = getPlayerData(player);
    const cfg = currentConfig.Scaffold;
    const state = data.scaffold.flag;
    if (state.vl <= 0) {
        state.vl = 0;
        return;
    }
    const ticks = Math.max(SCAFFOLD_MIN_DECAY_TICKS, cfg.flagDecayTicks);
    const amount = Math.max(SCAFFOLD_MIN_DECAY_AMOUNT, cfg.flagDecayAmount);
    const elapsed = nowTick - state.lastFlagTick;
    if (elapsed < ticks)
        return;
    const periods = Math.floor(elapsed / ticks);
    state.vl = Math.max(0, state.vl - periods * amount);
    if (state.vl > 0)
        state.lastFlagTick = nowTick;
    else
        state.lastFlagTick = 0;
}
export function resetScaffoldState(player) {
    const data = getPlayerData(player);
    data.scaffold.placeLog.length = 0;
    data.scaffold.types.clear();
    data.scaffold.potentialScaffold = 0;
    data.scaffold.flag.vl = 0;
    data.scaffold.flag.lastFlagTick = 0;
    data.scaffold.lastLocation = undefined;
}
