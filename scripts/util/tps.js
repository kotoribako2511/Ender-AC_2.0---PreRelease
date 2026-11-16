import { system } from "@minecraft/server";
import { currentConfig } from "../data/config.js";
import { safeGet } from "./safe.js";
import { TPS_SAMPLE_SIZE } from "./constants.js";
import { PlayerStateManager } from "./playerState.js";
export class TPSCalculator {
    static update() {
        const now = Date.now();
        this.tickTimestamps.push(now);
        if (this.tickTimestamps.length > this.sampleSize + 1) {
            this.tickTimestamps.shift();
        }
        if (this.tickTimestamps.length > 1) {
            const oldest = this.tickTimestamps[0];
            const delta = (now - oldest) / 1000;
            const ticksElapsed = this.tickTimestamps.length - 1;
            if (delta > 0) {
                const rawTps = ticksElapsed / delta;
                this.currentTps = Math.min(this.TPS_MAX, Math.round(rawTps * this.TPS_ROUND_PRECISION) / this.TPS_ROUND_PRECISION);
            }
        }
    }
    static getTPS() {
        return this.currentTps;
    }
    static getRelaxationScale() {
        if (!currentConfig.System.dynamicTps)
            return 1.0;
        const tps = this.currentTps;
        return tps >= this.TPS_MIN_THRESHOLD
            ? 1.0
            : Math.min(this.RELAX_MAX, Math.max(1.0, 1.0 + (this.TPS_MAX - tps) * this.RELAX_RATE));
    }
    static scaleMultiply(value) {
        return value * this.getRelaxationScale();
    }
    static scaleDivide(value) {
        return value / this.getRelaxationScale();
    }
    static scaleTicks(ticks) {
        return Math.ceil(ticks * this.getRelaxationScale());
    }
    static getSamplePing(player) {
        const now = system.currentTick;
        if (this.pingCacheTick !== now) {
            this.pingCacheTick = now;
            this.pingCache.clear();
        }
        const cached = this.pingCache.get(player);
        if (cached !== undefined)
            return cached;
        const val = safeGet(() => {
            const p = player;
            const v = typeof p.getPing === "function" ? p.getPing() : 0;
            return typeof v === "number" && isFinite(v) && v > 0 ? v : 0;
        }, 0, "TPSCalculator.getSamplePing");
        this.pingCache.set(player, val);
        return val;
    }
    static updatePing(player, nowTick) {
        if (nowTick % this.PING_SAMPLE_INTERVAL !== 0)
            return;
        const ping = this.getSamplePing(player);
        if (ping <= 0)
            return;
        const data = PlayerStateManager.getPlayerData(player);
        data.pingEma += this.PING_EMA_ALPHA * (ping - data.pingEma);
    }
    static getPingRelaxationScale(player) {
        if (!player)
            return 1.0;
        if (!currentConfig.System.dynamicTps)
            return 1.0;
        const data = safeGet(() => PlayerStateManager.getPlayerData(player), undefined, "TPSCalculator.getPingRelaxationScale");
        if (!data)
            return 1.0;
        const instant = this.getSamplePing(player);
        let ping = data.pingEma;
        if (instant > ping)
            ping = instant;
        if (ping <= this.PING_BASE_MS)
            return 1.0;
        return Math.min(this.MAX_PING_SCALE, 1.0 + (ping - this.PING_BASE_MS) / this.PING_SLOPE_DIVISOR);
    }
    static getCombinedRelaxationScale(player) {
        const tpsScale = this.getRelaxationScale();
        const pingScale = this.getPingRelaxationScale(player);
        return Math.min(this.MAX_COMBINED_SCALE, Math.max(tpsScale, pingScale));
    }
    static scaleMultiplyFor(player, value) {
        return value * this.getCombinedRelaxationScale(player);
    }
    static scaleDivideFor(player, value) {
        return value / this.getCombinedRelaxationScale(player);
    }
    static scaleTicksFor(player, ticks) {
        return Math.ceil(ticks * this.getCombinedRelaxationScale(player));
    }
}
TPSCalculator.sampleSize = TPS_SAMPLE_SIZE;
TPSCalculator.tickTimestamps = [];
TPSCalculator.currentTps = 20.0;
TPSCalculator.PING_EMA_ALPHA = 0.25;
TPSCalculator.PING_SAMPLE_INTERVAL = 10;
TPSCalculator.PING_BASE_MS = 20;
TPSCalculator.MAX_PING_SCALE = 4.0;
TPSCalculator.MAX_COMBINED_SCALE = 5.0;
TPSCalculator.PING_SLOPE_DIVISOR = 100;
TPSCalculator.TPS_MIN_THRESHOLD = 19.5;
TPSCalculator.TPS_MAX = 20.0;
TPSCalculator.RELAX_RATE = 0.15;
TPSCalculator.RELAX_MAX = 4.0;
TPSCalculator.TPS_ROUND_PRECISION = 10;
TPSCalculator.pingCacheTick = -1;
TPSCalculator.pingCache = new Map();
