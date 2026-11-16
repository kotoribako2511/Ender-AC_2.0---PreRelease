import { system } from "@minecraft/server";
import { currentConfig } from "../../data/config.js";
import { TPSCalculator } from "../../util/util.js";
import { PermissionManager, DetectionType } from "../../permission.js";
import { executePunishment } from "../../util/punishment.js";
import { safeCall } from "../../util/safe.js";
export function checkNukerBefore(ev, data) {
    const cfg = currentConfig.Nuker;
    if (!cfg.enabled || ev.player.hasTag("nuker")) {
        if (ev.player.hasTag("nuker"))
            ev.cancel = true;
        return;
    }
    if (PermissionManager.shouldSkipDetection(ev.player, DetectionType.Nuker))
        return;
    data.Breakblock.unshift({ Block: ev.block, Time: system.currentTick, Permutation: ev.block.permutation });
    const limit = TPSCalculator.scaleMultiplyFor(ev.player, cfg.maxBlocks);
    if (data.Breakblock.length >= limit)
        ev.cancel = true;
}
export function processNukerTick(player, data, cfg, currentTick) {
    if (!cfg.enabled || data.Breakblock.length === 0)
        return;
    if (PermissionManager.shouldSkipDetection(player, DetectionType.Nuker)) {
        data.Breakblock = [];
        return;
    }
    const limit = TPSCalculator.scaleMultiplyFor(player, cfg.maxBlocks);
    if (data.Breakblock.length >= limit) {
        safeCall(() => player.addTag("nuker"));
        for (const entry of data.Breakblock) {
            safeCall(() => {
                const b = entry.Block;
                if (b.isValid)
                    b.setPermutation(entry.Permutation);
            });
        }
        executePunishment({
            player,
            detection: "Nuker/A",
            punishment: cfg.punish.type,
            tempkickSeconds: cfg.punish.seconds,
            reason: "Mining disabled.",
            broadcast: true,
        });
    }
    data.Breakblock = [];
}
