import { GameMode, EquipmentSlot, system } from "@minecraft/server";
import { currentConfig } from "../data/config.js";
import { getPlayerData, TPSCalculator, MathUtils } from "../util/util.js";
import { PermissionManager, DetectionType } from "../permission.js";
import { executePunishment, punishKind } from "../util/punishment.js";
export function checkReachBreak(ev) {
    const cfg = currentConfig.Reach;
    if (!cfg.enabled)
        return;
    const { player, block } = ev;
    if (PermissionManager.shouldSkipDetection(player, DetectionType.Reach))
        return;
    const dist = MathUtils.getBlockDistance(player.getHeadLocation(), block.location);
    const isCreative = player.getGameMode() === GameMode.Creative;
    const rawLimit = isCreative ? cfg.creative_breakThreshold : cfg.breakThreshold;
    const limit = TPSCalculator.scaleMultiplyFor(player, rawLimit);
    if (!ev.cancel && dist > limit) {
        punishKind({
            player,
            label: "Reach/Break",
            cfg,
            kind: "break",
            reason: `( value: ${dist.toFixed(2)} )`,
            broadcast: false,
        });
        ev.cancel = true;
    }
}
export function checkReachPlace(player, blockLoc) {
    const cfg = currentConfig.Reach;
    if (!cfg.enabled)
        return;
    if (PermissionManager.shouldSkipDetection(player, DetectionType.Reach))
        return;
    const dist = MathUtils.getBlockDistance(player.getHeadLocation(), blockLoc);
    const isCreative = player.getGameMode() === GameMode.Creative;
    const rawLimit = isCreative ? cfg.creative_placeThreshold : cfg.placeThreshold;
    if (!rawLimit)
        return;
    const limit = TPSCalculator.scaleMultiplyFor(player, rawLimit);
    if (dist > limit) {
        punishKind({
            player,
            label: "Reach/Place",
            cfg,
            kind: "place",
            reason: `( value: ${dist.toFixed(2)} )`,
            broadcast: false,
        });
    }
}
export function checkHit(ev) {
    if (ev.damagingEntity.typeId !== "minecraft:player")
        return;
    const player = ev.damagingEntity;
    const target = ev.hitEntity;
    const data = getPlayerData(player);
    const cfg = currentConfig;
    data.Noswing.hit_tick = system.currentTick;
    data.cps.unshift(system.currentTick);
    if (cfg.Reach.enabled && !PermissionManager.shouldSkipDetection(player, DetectionType.Reach) && target.typeId !== "minecraft:enderman") {
        const eye = player.getHeadLocation();
        const dist = MathUtils.getEntityDistance(eye, target);
        const isCreative = player.getGameMode() === GameMode.Creative;
        const rawLimit = isCreative ? cfg.Reach.creative_hitThreshold : cfg.Reach.hitThreshold;
        const limit = TPSCalculator.scaleMultiplyFor(player, rawLimit);
        if (dist > limit) {
            punishKind({
                player,
                label: "Reach/Hit",
                cfg: cfg.Reach,
                kind: "hit",
                reason: `( value: ${dist.toFixed(2)} ) (Entity: "${target.typeId}")`,
                broadcast: false,
            });
        }
    }
    const weapon = player.getComponent("equippable")?.getEquipmentSlot(EquipmentSlot.Mainhand).getItem();
    data.Nofall.isFallingFlag = weapon?.typeId !== "minecraft:mace";
    if (cfg.Killaura.enabled && !PermissionManager.shouldSkipDetection(player, DetectionType.Killaura)) {
        const nowTick = system.currentTick;
        if (data.killauraMultiHitTick !== nowTick) {
            data.killauraMultiHitTick = nowTick;
            data.killauraMultiEntities = [];
        }
        if (!data.killauraMultiEntities.includes(target.id)) {
            data.killauraMultiEntities.push(target.id);
        }
        data.killauraIgnoreHit = weapon?.typeId == "minecraft:mace" || weapon?.typeId == "minecraft:trident";
        const multiHitLimit = cfg.Killaura.multiHitThreshold ?? 2;
        if (data.killauraMultiEntities.length >= multiHitLimit && !data.killauraIgnoreHit) {
            executePunishment({
                player,
                detection: "Killaura/MultiHit",
                punishment: cfg.Killaura.multiHit.type,
                freezeTicks: cfg.Killaura.freezeTicks,
                tempkickSeconds: cfg.Killaura.multiHit.seconds,
                reason: `[ Multi-Hit: ${data.killauraMultiEntities.length} entities ]`,
                broadcast: false,
            });
            data.killauraMultiEntities = [];
        }
    }
}
export function processCombatTick(player, data, now) {
    const noSwing = currentConfig.NoSwing;
    const cpsCfg = currentConfig.cps;
    if (noSwing.enabled && !PermissionManager.shouldSkipDetection(player, DetectionType.NoSwing)) {
        const gm = player.getGameMode();
        const ns = data.Noswing;
        if (gm === GameMode.Creative || gm === GameMode.Spectator || data.joinBypass.enable || now < data.teleport.allowedUntilTick) {
            ns.hit_tick = undefined;
            ns.break_tick = undefined;
            ns.place_tick = undefined;
        }
        else {
            const preWindow = TPSCalculator.scaleTicksFor(player, 10);
            const postWindow = TPSCalculator.scaleTicksFor(player, Math.floor(noSwing.delayMs / 50) + 5);
            const settle = (actionTick, label, punishment, seconds) => {
                if (actionTick === undefined)
                    return undefined;
                if (now - actionTick < postWindow)
                    return actionTick;
                const st = ns.swing_tick;
                const violated = st === undefined || st < actionTick - preWindow || st > actionTick + postWindow;
                if (violated) {
                    executePunishment({ player, detection: label, punishment, tempkickSeconds: seconds, broadcast: false });
                }
                return undefined;
            };
            ns.hit_tick = settle(ns.hit_tick, "NoSwing/Hit", noSwing.hit.type, noSwing.hit.seconds);
            ns.break_tick = settle(ns.break_tick, "NoSwing/Break", noSwing.break.type, noSwing.break.seconds);
            ns.place_tick = settle(ns.place_tick, "NoSwing/Place", noSwing.place.type, noSwing.place.seconds);
        }
    }
    if (cpsCfg.enabled && now % Math.max(1, cpsCfg.scanIntervalTick) === 0 && !PermissionManager.shouldSkipDetection(player, DetectionType.CPS)) {
        data.cps = data.cps.filter((t) => now - t < 20);
        if (data.cps.length > TPSCalculator.scaleMultiplyFor(player, cpsCfg.cpsThreshold)) {
            executePunishment({
                player,
                detection: "AutoClicker",
                punishment: cpsCfg.punish.type,
                tempkickSeconds: cpsCfg.punish.seconds,
                reason: `cps: ${data.cps.length}`,
                broadcast: false,
            });
        }
    }
}
