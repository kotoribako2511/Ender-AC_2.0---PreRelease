import { world, system, EntityRidingComponent, InputPermissionCategory } from "@minecraft/server";
import { beforeEvents } from "@minecraft/server-admin";
import { getPlayerData, TPSCalculator, WorldUtils } from "./util/util.js";
import { currentConfig, BanManager, ConfigManager, MuteManager } from "./data/config.js";
import { BlockLogManager, PlayerAccessLogManager, AdminActionLogManager } from "./log.js";
import { checkBlockPlace, checkNukerBefore, processNukerTick, checkInstaBreak } from "./checks/block/index.js";
import { checkReachBreak, checkHit, processCombatTick, checkReachPlace } from "./checks/combat.js";
import { processMovementTick } from "./checks/movement/index.js";
import { onScaffoldPlace, updateScaffoldLastLocation, processScaffoldTick, resetScaffoldState } from "./checks/movement/scaffold.js";
import { processItemTick, AutoTotem, processAutoTotemTick, processItemEntityTick } from "./checks/item/index.js";
import { checkChat } from "./checks/chat.js";
import { processEntitySpawn, entitySet, loadEntitySet, processEntityPlace } from "./checks/entity.js";
import { CoreProtectUI, handleUIItemUse } from "./ui/ui.js";
import { AFKkick, ChangeGameMode, checkAutoDeop } from "./checks/system.js";
import { handleAsyncPlayerJoin, handlePlayerJoin, handlePlayerSpawn, handleJoinPlayerLeave, SpawnWaitTick } from "./checks/join.js";
import { handleCommandRegistry } from "./command/command.js";
import { PermissionManager, DetectionType, handlePermissionPlayerLeave, cleanPermissionCache } from "./permission.js";
import { resetAllFlags } from "./checks/movement/flags.js";
import { ACState } from "./state.js";
import { safeCall } from "./util/safe.js";
import { isRiptideEnvironment, isRiptideItem } from "./checks/movement/teleport.js";
import { MS_PER_TICK, ENDER_PEARL_GRACE_TICKS, FLUSH_INTERVAL_TICKS, BAN_MUTE_CLEAN_INTERVAL_TICKS, PERMISSION_CACHE_CLEAN_INTERVAL_TICKS, SWING_TICKS_BUFFER_SIZE, INSPECT_UI_COOLDOWN_TICKS, PEARL_MAX_GRACE_TICKS, EXPLOSION_KNOCKBACK_GRACE_TICKS, EXPLOSION_KNOCKBACK_GRACE_MAX_TICKS, RESPAWN_GRACE_TICKS, } from "./util/constants.js";
import { PlayerCameraUI } from "./ui/player/camera.js";
import { checkAirPlace } from "./checks/block/place.js";
import { LandProtectManager } from "./checks/landProtect.js";
class StrategyPipeline {
    constructor() {
        this.strategies = [];
    }
    add(strategy) {
        this.strategies.push(strategy);
        return this;
    }
    execute(context) {
        for (const strategy of this.strategies) {
            if (strategy(context) === false)
                break;
        }
    }
}
const inspectUiCooldown = new Set();
const blockPlacePipeline = new StrategyPipeline();
blockPlacePipeline.add(ev => {
    if (BlockLogManager.isInspectMode(ev.player)) {
        ev.cancel = true;
        if (inspectUiCooldown.has(ev.player.name))
            return false;
        inspectUiCooldown.add(ev.player.name);
        const loc = ev.block.location;
        const dim = ev.dimension.id;
        const pName = ev.player.name;
        system.run(() => {
            CoreProtectUI.showBlockHistory(ev.player, loc, dim).finally(() => {
                system.runTimeout(() => inspectUiCooldown.delete(pName), INSPECT_UI_COOLDOWN_TICKS);
            });
        });
        return false;
    }
})
    .add(ev => checkBlockPlace(ev))
    .add(ev => checkReachPlace(ev.player, ev.block.location))
    .add(ev => {
    if (currentConfig.CoreProtect?.enabled && !ev.cancel) {
        const placedBlockId = ev.permutationToPlace?.type.id ?? ev.block.typeId;
        BlockLogManager.addLog({
            x: Math.floor(ev.block.location.x),
            y: Math.floor(ev.block.location.y),
            z: Math.floor(ev.block.location.z),
            dim: ev.dimension.id,
            action: "place",
            player: ev.player.name,
            block: placedBlockId,
            time: Date.now()
        });
    }
})
    .add(ev => {
    checkAirPlace(ev);
})
    .add(ev => {
    if (ev.cancel)
        return;
    safeCall(() => { getPlayerData(ev.player).Noswing.place_tick = system.currentTick; });
})
    .add(ev => {
    if (!currentConfig.LandProtect?.enabled)
        return;
    const target = WorldUtils.BlockPlaceWith(ev.face, ev.block.location);
    if (!LandProtectManager.canPlace(ev.player, target, ev.dimension.id)) {
        ev.cancel = true;
        ev.player.sendMessage(`${currentConfig.System.prefix} §cこの土地ではブロックを設置できません。`);
        return false;
    }
});
const blockBreakPipeline = new StrategyPipeline();
blockBreakPipeline.add(ev => {
    if (BlockLogManager.isInspectMode(ev.player)) {
        ev.cancel = true;
        if (inspectUiCooldown.has(ev.player.name))
            return false;
        inspectUiCooldown.add(ev.player.name);
        const loc = ev.block.location;
        const dim = ev.dimension.id;
        const pName = ev.player.name;
        system.run(() => {
            CoreProtectUI.showBlockHistory(ev.player, loc, dim).finally(() => {
                system.runTimeout(() => inspectUiCooldown.delete(pName), INSPECT_UI_COOLDOWN_TICKS);
            });
        });
        return false;
    }
})
    .add(ev => checkInstaBreak(ev))
    .add(ev => {
    const data = getPlayerData(ev.player);
    checkNukerBefore(ev, data);
    checkReachBreak(ev);
})
    .add(ev => {
    if (currentConfig.CoreProtect?.enabled && !ev.cancel) {
        BlockLogManager.addLog({
            x: Math.floor(ev.block.location.x),
            y: Math.floor(ev.block.location.y),
            z: Math.floor(ev.block.location.z),
            dim: ev.dimension.id,
            action: "break",
            player: ev.player.name,
            block: ev.block.permutation.type.id,
            time: Date.now()
        });
    }
})
    .add(ev => {
    if (ev.cancel)
        return;
    safeCall(() => { getPlayerData(ev.player).Noswing.break_tick = system.currentTick; });
})
    .add(ev => {
    if (!currentConfig.LandProtect?.enabled)
        return;
    if (!LandProtectManager.canBreak(ev.player, ev.block.location, ev.dimension.id)) {
        ev.cancel = true;
        ev.player.sendMessage(`${currentConfig.System.prefix} §cこの土地ではブロックを破壊できません。`);
        return false;
    }
});
const playerTickPipeline = new StrategyPipeline();
playerTickPipeline
    .add(ctx => { TPSCalculator.updatePing(ctx.player, ctx.nowTick); })
    .add(ctx => {
    checkAutoDeop(ctx.player);
    const data = getPlayerData(ctx.player);
    if (AFKkick(data, currentConfig.AFK, ctx.nowTick, ctx.player))
        return false;
})
    .add(ctx => {
    const data = getPlayerData(ctx.player);
    const loc = ctx.player.location;
    const ridingComp = ctx.player.getComponent(EntityRidingComponent.componentId);
    const isRiding = ridingComp?.isValid ?? false;
    const isClimbing = ctx.player.isClimbing;
    const isSpecialMovement = isRiding || isClimbing || ctx.player.isFlying ||
        ctx.player.isGliding || ctx.player.isInWater || ctx.player.isSwimming;
    const equippable = ctx.player.getComponent("equippable");
    const currentRot = ctx.player.getRotation();
    if (!data.lastLocation || data.lastLocation.x !== loc.x || data.lastLocation.y !== loc.y || data.lastLocation.z !== loc.z ||
        !data.lastRotation || data.lastRotation.x !== currentRot.x || data.lastRotation.y !== currentRot.y) {
        data.lastActiveTick = ctx.nowTick;
        data.lastRotation = { x: currentRot.x, y: currentRot.y };
    }
    if (ctx.player.isOnGround)
        data.lastOnGround_loc = loc;
    if (isRiding) {
        data.Lock.Ride = false;
        system.runTimeout(() => {
            data.Lock.Ride = ctx.player.isValid && isRiding;
        }, Math.floor(currentConfig.System.lockTimeoutMs / MS_PER_TICK));
    }
    if (isClimbing) {
        data.Lock.Climb = false;
        system.runTimeout(() => {
            data.Lock.Climb = !ctx.player.isClimbing;
        }, Math.floor(currentConfig.System.lockTimeoutMs / MS_PER_TICK));
    }
    processMovementTick(ctx.player, data, loc, isSpecialMovement, ctx.nowTick, isRiding);
    processCombatTick(ctx.player, data, ctx.nowTick);
    processNukerTick(ctx.player, data, currentConfig.Nuker, ctx.nowTick);
    processItemTick(ctx.player, ctx.nowTick, equippable);
    processAutoTotemTick(ctx.player, data, ctx.nowTick, equippable);
    processScaffoldTick(ctx.player, ctx.nowTick);
    updateScaffoldLastLocation(ctx.player);
    data.moving.LastSpeedY = data.moving.SpeedY;
    if (data.teleport.justRolledBack) {
        data.teleport.justRolledBack = false;
    }
    else {
        data.lastLocation = loc;
    }
    PermissionManager.updateNameCache(ctx.player);
})
    .add(ctx => {
    if (!currentConfig.LandProtect?.enabled)
        return;
    const player = ctx.player;
    const loc = player.location;
    const dim = player.dimension.id;
    const data = getPlayerData(player);
    if (data.lastDimension !== dim) {
        data.lastLandProtectLoc = undefined;
    }
    if (!LandProtectManager.canEnter(player, loc, dim)) {
        const safeLoc = data.lastLandProtectLoc;
        if (safeLoc) {
            player.teleport(safeLoc, { dimension: player.dimension });
        }
        else if (data.lastLocation) {
            player.teleport(data.lastLocation, { dimension: player.dimension });
        }
        else {
            const spawn = world.getDefaultSpawnLocation();
            player.teleport(spawn, { dimension: world.getDimension("overworld") });
        }
        data.teleport.allowedUntilTick = Math.max(data.teleport.allowedUntilTick, ctx.nowTick + 20);
        player.sendMessage(`${currentConfig.System.prefix} §cこのエリアには侵入できません。`);
    }
    else {
        data.lastLandProtectLoc = loc;
    }
});
const ItemUsePipeline = new StrategyPipeline();
ItemUsePipeline
    .add(ev => {
    const player = ev.source;
    if (!player || !player?.isValid)
        return false;
    if (!isRiptideItem(ev.itemStack))
        return;
    if (!isRiptideEnvironment(player))
        return;
    safeCall(() => {
        const data = getPlayerData(player);
        data.teleport.riptideActive = true;
        data.teleport.riptideStartTick = system.currentTick;
        data.teleport.riptideStartLoc = { x: player.location.x, y: player.location.y, z: player.location.z };
        data.teleport.riptideGroundTicks = 0;
    }, undefined, "itemUse.riptide");
})
    .add(ev => {
    const { source, itemStack } = ev;
    if (ACState.enabled)
        handleUIItemUse(source, itemStack);
    const player = source;
    if (itemStack.typeId === "minecraft:ender_pearl") {
        safeCall(() => {
            const data = getPlayerData(player);
            const nowTick = system.currentTick;
            data.teleport.allowedUntilTick =
                Math.max(data.teleport.allowedUntilTick, nowTick) + ENDER_PEARL_GRACE_TICKS;
            data.teleport.pearlGraceActive = true;
            data.teleport.pearlsInFlight++;
            const newCap = nowTick + PEARL_MAX_GRACE_TICKS;
            if (newCap > data.teleport.pearlGraceCapTick) {
                data.teleport.pearlGraceCapTick = newCap;
            }
            if (data.teleport.allowedUntilTick > data.teleport.pearlGraceCapTick) {
                data.teleport.allowedUntilTick = data.teleport.pearlGraceCapTick;
            }
            data.Nofall.isFallingFlag = false;
            data.Nofall.fallStartY = player.location.y;
            data.Nofall.tookFallDamage = false;
        });
    }
    safeCall(() => {
        getPlayerData(player).Nofall.isFallingFlag = itemStack.typeId !== "minecraft:wind_charge";
    });
});
system.beforeEvents.startup.subscribe(handleCommandRegistry);
system.run(() => {
    beforeEvents.asyncPlayerJoin.subscribe(handleAsyncPlayerJoin);
});
world.afterEvents.playerJoin.subscribe(handlePlayerJoin);
world.afterEvents.playerSpawn.subscribe((ev) => {
    handlePlayerSpawn(ev);
    const player = ev.player;
    if (!player?.isValid)
        return;
    safeCall(() => { if (player.hasTag("nuker"))
        player.removeTag("nuker"); });
    const data = getPlayerData(player);
    data.lastLocation = undefined;
    data.lastLandProtectLoc = undefined;
    data.lastDimension = player.dimension.id;
    data.teleport.justRolledBack = false;
    data.Lock.Ride = true;
    data.Lock.Climb = true;
    data.Lock.Freeze_Detection = true;
    data.flyA.length = 0;
    data.flyAY.length = 0;
    data.BDSfly.BDSfly.length = 0;
    resetAllFlags(data);
    data.Nofall.isFallingFlag = false;
    data.Nofall.isslowFall.length = 0;
    data.Nofall.isChecking = false;
    data.Nofall.tookFallDamage = false;
    data.Nofall.spoofScore = 0;
    data.Nofall.lastComputedTick = -1;
    resetScaffoldState(player);
    data.teleport.isDead = false;
    const scaled = TPSCalculator.scaleTicksFor(player, RESPAWN_GRACE_TICKS);
    data.teleport.allowedUntilTick = Math.max(data.teleport.allowedUntilTick, system.currentTick + scaled);
});
world.beforeEvents.playerLeave.subscribe(ev => {
    handlePermissionPlayerLeave(ev);
    handleJoinPlayerLeave(ev);
    safeCall(() => inspectUiCooldown.delete(ev.player.name));
    safeCall(() => PlayerCameraUI.cleanupOnLeave(ev.player));
});
world.beforeEvents.playerPlaceBlock.subscribe(ev => {
    if (!ACState.enabled)
        return;
    blockPlacePipeline.execute(ev);
});
world.afterEvents.playerPlaceBlock.subscribe(ev => {
    if (!ACState.enabled)
        return;
    onScaffoldPlace(ev.player, ev.block);
});
world.beforeEvents.playerBreakBlock.subscribe(ev => {
    if (!ACState.enabled)
        return;
    blockBreakPipeline.execute(ev);
});
world.beforeEvents.chatSend.subscribe(ev => {
    if (!ACState.enabled)
        return;
    checkChat(ev);
});
world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
    if (!ACState.enabled)
        return;
    if (currentConfig.LandProtect?.enabled && !LandProtectManager.canInteract(ev.player, ev.block.location, ev.block.dimension.id)) {
        ev.cancel = true;
        ev.player.sendMessage(`${currentConfig.System.prefix} §cこの土地ではインタラクトできません。`);
        return;
    }
    if (processEntityPlace(ev.player, ev.itemStack))
        ev.cancel = true;
});
world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
    if (!ACState.enabled)
        return;
    if (currentConfig.LandProtect?.enabled && !LandProtectManager.canInteract(ev.player, ev.target.location, ev.target.dimension.id)) {
        ev.cancel = true;
        ev.player.sendMessage(`${currentConfig.System.prefix} §cこの土地ではエンティティとインタラクトできません。`);
    }
});
world.beforeEvents.itemUse.subscribe(ev => {
    if (!ACState.enabled)
        return;
    ItemUsePipeline.execute(ev);
});
world.afterEvents.itemReleaseUse.subscribe(({ itemStack, source }) => {
    if (!ACState.enabled)
        return;
    const player = source;
    if (!player?.isValid)
        return;
    if (!isRiptideItem(itemStack))
        return;
    if (!isRiptideEnvironment(player))
        return;
    safeCall(() => {
        const data = getPlayerData(player);
        data.teleport.riptideActive = true;
        data.teleport.riptideStartTick = system.currentTick;
        data.teleport.riptideStartLoc = { x: player.location.x, y: player.location.y, z: player.location.z };
        data.teleport.riptideGroundTicks = 0;
    }, undefined, "itemReleaseUse.riptide");
});
world.afterEvents.itemStartUse.subscribe(({ itemStack, source }) => {
    if (!ACState.enabled)
        return;
    const player = source;
    if (!player?.isValid)
        return;
    if (itemStack?.typeId !== "minecraft:chorus_fruit")
        return;
    safeCall(() => {
        const data = getPlayerData(player);
        data.teleport.chorusActive = true;
        data.teleport.chorusStartTick = system.currentTick;
    }, undefined, "itemStartUse.chorus");
});
world.afterEvents.itemCompleteUse.subscribe(({ itemStack, source }) => {
    if (!ACState.enabled)
        return;
    const player = source;
    if (!player?.isValid)
        return;
    if (itemStack?.typeId !== "minecraft:chorus_fruit")
        return;
    safeCall(() => {
        const data = getPlayerData(player);
        data.Nofall.isFallingFlag = false;
        data.Nofall.fallStartY = player.location.y;
        data.Nofall.tookFallDamage = false;
    }, undefined, "itemStartUse.chorus");
});
world.afterEvents.itemStopUse.subscribe(({ itemStack, source }) => {
    if (!ACState.enabled)
        return;
    const player = source;
    if (!player?.isValid)
        return;
    if (itemStack?.typeId === "minecraft:chorus_fruit") {
        safeCall(() => {
            getPlayerData(player).teleport.chorusActive = false;
        }, undefined, "itemStopUse.chorus");
        return;
    }
    if (!isRiptideItem(itemStack))
        return;
    safeCall(() => {
        const data = getPlayerData(player);
        data.teleport.riptideActive = false;
        data.teleport.riptideStartLoc = undefined;
        data.teleport.riptideGroundTicks = 0;
    }, undefined, "itemStopUse.riptide");
});
world.beforeEvents.playerGameModeChange.subscribe(({ player, fromGameMode, toGameMode }) => {
    if (!ACState.enabled)
        return;
    ChangeGameMode(player, fromGameMode, toGameMode);
});
world.afterEvents.entityHitEntity.subscribe(ev => {
    if (!ACState.enabled)
        return;
    checkHit(ev);
});
world.beforeEvents.entityHurt.subscribe(({ damageSource, hurtEntity }) => {
    if (!ACState.enabled)
        return;
    const fallCauses = ["fall", "anvil", "fallingBlock", "flyIntoWall", "stalagmite", "stalactite"];
    if (hurtEntity.typeId === "minecraft:player" && fallCauses.includes(damageSource.cause)) {
        getPlayerData(hurtEntity).Nofall.tookFallDamage = true;
    }
    if (hurtEntity.typeId !== "minecraft:player")
        return;
    const cause = damageSource.cause;
    const isKnockbackCause = cause === "entityExplosion" ||
        cause === "blockExplosion" ||
        cause === "entityAttack";
    if (!isKnockbackCause)
        return;
    const player = hurtEntity;
    safeCall(() => {
        const data = getPlayerData(player);
        const scaled = TPSCalculator.scaleTicksFor(player, EXPLOSION_KNOCKBACK_GRACE_TICKS * 2);
        const graceTicks = Math.min(scaled, EXPLOSION_KNOCKBACK_GRACE_MAX_TICKS);
        const until = system.currentTick + graceTicks;
        data.teleport.knockbackGraceActive = true;
        data.teleport.knockbackGraceUntil = Math.max(data.teleport.knockbackGraceUntil, until);
        data.teleport.knockbackWasInAir = false;
    }, undefined, "entityHurt.knockback");
});
world.beforeEvents.explosion.subscribe((ev) => {
    if (!ACState.enabled)
        return;
    const dim = ev.dimension;
    const source = ev.source;
    if (!source)
        return;
    safeCall(() => {
        if (!source.isValid)
            return;
        const loc = source.location;
        for (const player of world.getPlayers()) {
            if (player.dimension.id !== dim.id)
                continue;
            const dx = player.location.x - loc.x;
            const dy = player.location.y - loc.y;
            const dz = player.location.z - loc.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            if (distSq > 100)
                continue;
            const data = getPlayerData(player);
            const scaled = TPSCalculator.scaleTicksFor(player, EXPLOSION_KNOCKBACK_GRACE_TICKS * 2);
            const graceTicks = Math.min(scaled, EXPLOSION_KNOCKBACK_GRACE_MAX_TICKS);
            const until = system.currentTick + graceTicks;
            data.teleport.knockbackGraceActive = true;
            data.teleport.knockbackGraceUntil = Math.max(data.teleport.knockbackGraceUntil, until);
            data.teleport.knockbackWasInAir = false;
            data.teleport.allowedUntilTick = Math.max(data.teleport.allowedUntilTick, system.currentTick + graceTicks);
        }
    }, undefined, "explosion.knockback");
});
world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
    if (!ACState.enabled)
        return;
    if (!deadEntity.isValid)
        return;
    if (deadEntity.typeId !== "minecraft:player")
        return;
    const player = deadEntity;
    const data = getPlayerData(player);
    data.lastLocation = undefined;
    data.lastLandProtectLoc = undefined;
    data.Nofall.isFallingFlag = false;
    data.Nofall.isChecking = false;
    data.Nofall.tookFallDamage = true;
    data.flyA.length = 0;
    data.flyAY.length = 0;
    data.BDSfly.BDSfly.length = 0;
    resetAllFlags(data);
    resetScaffoldState(player);
    data.teleport.isDead = true;
});
world.afterEvents.playerSwingStart.subscribe(({ player }) => {
    if (!ACState.enabled)
        return;
    const data = getPlayerData(player);
    data.Noswing.swing = true;
    data.Noswing.swing_tick = system.currentTick;
    if (!currentConfig.cps.enabled)
        return;
    if (PermissionManager.shouldSkipDetection(player, DetectionType.CPS))
        return;
    data.swingTicks.unshift(system.currentTick);
    if (data.swingTicks.length > SWING_TICKS_BUFFER_SIZE)
        data.swingTicks.length = SWING_TICKS_BUFFER_SIZE;
});
world.afterEvents.effectAdd.subscribe(ev => {
    if (!ACState.enabled)
        return;
    AutoTotem(ev, system.currentTick);
});
world.afterEvents.entitySpawn.subscribe(({ entity, cause }) => {
    if (!ACState.enabled)
        return;
    if (!entity.isValid)
        return;
    if (entity.typeId === "minecraft:item") {
        const item = entity.getComponent('minecraft:item')?.itemStack;
        processItemEntityTick(entity, item);
        return;
    }
    processEntitySpawn(entity);
});
world.afterEvents.entityRemove.subscribe(({ removedEntityId }) => {
    entitySet.delete(removedEntityId);
});
system.runInterval(() => {
    safeCall(() => {
        TPSCalculator.update();
        if (!ACState.enabled)
            return;
        const nowTick = system.currentTick;
        for (const player of world.getPlayers()) {
            safeCall(() => playerTickPipeline.execute({ player, nowTick }), (e) => {
                console.warn(`${currentConfig.System.prefix} §c[${player.name}] Pipeline Error: ${e}`);
            }, "playerTickPipeline");
        }
        SpawnWaitTick();
    }, (e) => {
        world.sendMessage(`${currentConfig.System.prefix} §c${e}`);
    });
}, currentConfig.System.intervalTick);
system.runInterval(() => {
    safeCall(() => {
        BlockLogManager.flushIfDirty();
        PlayerAccessLogManager.flushIfDirty();
        AdminActionLogManager.flushIfDirty();
    });
}, FLUSH_INTERVAL_TICKS);
system.runInterval(() => {
    safeCall(() => {
        const bansRemoved = BanManager.cleanExpired();
        const mutesRemoved = MuteManager.cleanExpired();
        if (bansRemoved > 0) {
            world.sendMessage(`${currentConfig.System.prefix} §7${bansRemoved}件の期限切れBANを解除しました。`);
        }
        if (mutesRemoved > 0) {
            world.sendMessage(`${currentConfig.System.prefix} §7${mutesRemoved}件の期限切れミュートを解除しました。`);
        }
    });
}, BAN_MUTE_CLEAN_INTERVAL_TICKS);
system.runInterval(cleanPermissionCache, PERMISSION_CACHE_CLEAN_INTERVAL_TICKS);
console.warn(`${currentConfig.System.prefix} §r§lloaded.`);
system.run(() => {
    ConfigManager.loadConfig();
    BanManager.loadBanConfig();
    MuteManager.loadMuteConfig();
    BlockLogManager.loadLogs();
    PlayerAccessLogManager.loadLogs();
    AdminActionLogManager.loadLogs();
    for (const player of world.getPlayers()) {
        if (player.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement))
            continue;
        player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
        PermissionManager.updateNameCache(player);
    }
    loadEntitySet(entitySet);
    console.warn(`${currentConfig.System.prefix} §r§lconnected to the server.`);
    world.sendMessage(`${currentConfig.System.prefix} §r§lconnected to the server.`);
});
