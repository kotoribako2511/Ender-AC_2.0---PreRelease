import { ACPlayer, FlagState } from "../../data/type.js";

export function decayFlag(state: FlagState, nowTick: number, decayTicks: number, decayAmount: number): void {
    if (state.vl <= 0) {
        state.vl = 0;
        return;
    }
    const ticks = Math.max(1, decayTicks);
    const amount = Math.max(1, decayAmount);
    const elapsed = nowTick - state.lastFlagTick;
    if (elapsed < ticks) return;
    const periods = Math.floor(elapsed / ticks);
    state.vl = Math.max(0, state.vl - periods * amount);
    if (state.vl > 0) {
        state.lastFlagTick = nowTick;
    } else {
        state.lastFlagTick = 0;
    }
}

export function addFlag(state: FlagState, nowTick: number): number {
    state.vl += 1;
    state.lastFlagTick = nowTick;
    return state.vl;
}

export function resetFlagState(state: FlagState): void {
    state.vl = 0;
    state.lastFlagTick = 0;
}

export function resetAllFlags(data: ACPlayer): void {
    resetFlagState(data.flyFlag);
    resetFlagState(data.slowfallFlag);
    resetFlagState(data.scaffold.flag);
    resetFlagState(data.BDSfly.bdsflyFlag);
}

export function resetMovementState(data: ACPlayer): void {
    data.moving.Speed = 0;
    data.moving.SpeedX = 0;
    data.moving.SpeedY = 0;
    data.moving.SpeedZ = 0;
    data.moving.LastSpeedY = 0;
    data.flyA.length = 0;
    data.flyAY.length = 0;
    data.BDSfly.BDSfly.length = 0;
    data.Nofall.isFallingFlag = false;
    data.Nofall.isslowFall.length = 0;
    data.Nofall.isChecking = false;
    data.Nofall.airTicks = 0;
    data.Nofall.consecutiveDownTicks = 0;
    data.Nofall.fallingTicks = 0;
    data.Nofall.serverIsFalling = false;
    data.Nofall.lastComputedTick = -1;
}