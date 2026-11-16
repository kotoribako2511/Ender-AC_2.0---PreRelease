import { Player, EquipmentSlot, Vector3, Block, Dimension } from "@minecraft/server";
import { PunishmentManager } from "../../util/util.js";
import { NON_FULL_BLOCK } from "../../data/info.js";
import { safeGet } from "../../util/safe.js";
import { getCachedBlock } from "../../util/blockCache.js";

export const rollback = (player: Player, loc?: Vector3) => PunishmentManager.rollback(player, loc);

export function safeGetBlock(dim: Dimension, x: number, y: number, z: number): Block | undefined {
    return getCachedBlock(dim, x, y, z);
}

export function isNonEmptyBlock(block: Block | undefined): boolean {
    if (!block?.isValid) return false;
    try {
        if (block.isAir) return false;
        if (block.isLiquid) return false;
        return true;
    } catch (e) {
        console.warn(`[movement.helpers.isNonEmptyBlock] ${e}`);
        return false;
    }
}

export function isFullSolidBlock(block: Block | undefined): boolean {
    if (!block?.isValid) return false;
    try {
        if (block.isAir) return false;
        if (block.isLiquid) return false;
        if (!block.isSolid) return false;
        if (NON_FULL_BLOCK.has(block.typeId)) return false;
        return true;
    } catch (e) {
        console.warn(`[movement.helpers.isFullSolidBlock] ${e}`);
        return false;
    }
}

export function hasSupport(player: Player, loc: Vector3): boolean {
    const dim = player.dimension;
    for (const dy of [0.05, 0.5, 1.0, 1.5]) {
        if (isNonEmptyBlock(safeGetBlock(dim, loc.x, loc.y - dy, loc.z))) return true;
    }
    return false;
}

export function isSlowBlockId(id: string | undefined): boolean {
    if (!id) return false;
    return id === "minecraft:web"
        || id === "minecraft:powder_snow"
        || id === "minecraft:mud"
        || id === "minecraft:honey_block";
}

export function isInSpecialSlowBlock(player: Player, loc: Vector3): boolean {
    const dim = player.dimension;
    const feetBlock = safeGetBlock(dim, loc.x, loc.y, loc.z);
    if (isSlowBlockId(feetBlock?.typeId)) return true;

    const headLoc = player.getHeadLocation();
    const headBlock = safeGetBlock(dim, headLoc.x, headLoc.y, headLoc.z);
    if (isSlowBlockId(headBlock?.typeId)) return true;

    return false;
}

export function isInSlowBlockColumn(player: Player, loc: Vector3): boolean {
    const dim = player.dimension;
    const x = Math.floor(loc.x);
    const z = Math.floor(loc.z);
    const yBase = Math.floor(loc.y);
    for (let y = yBase - 2; y <= yBase + 5; y++) {
        const b = safeGetBlock(dim, x, y, z);
        if (isSlowBlockId(b?.typeId)) return true;
    }
    return false;
}

export function isOnIce(player: Player, loc: Vector3): boolean {
    const b = safeGetBlock(player.dimension, loc.x, loc.y - 0.5, loc.z);
    if (!b?.isValid) return false;
    const id = b.typeId;
    return id === "minecraft:ice"
        || id === "minecraft:blue_ice"
        || id === "minecraft:frosted_ice"
        || id === "minecraft:packed_ice";
}

export function isOnBouncy(player: Player, loc: Vector3): boolean {
    const b = safeGetBlock(player.dimension, loc.x, loc.y - 0.5, loc.z);
    if (!b?.isValid) return false;
    const id = b.typeId;
    return id === "minecraft:slime" || id === "minecraft:honey_block";
}

export function isInBubbleColumn(player: Player, loc: Vector3): boolean {
    const b = safeGetBlock(player.dimension, loc.x, loc.y, loc.z);
    return b?.isValid === true && b.typeId === "minecraft:bubble_column";
}

export function hasSpecialEffect(player: Player): boolean {
    return safeGet(() => {
        return player.getEffect("levitation")?.isValid === true
            || player.getEffect("slow_falling")?.isValid === true
            || player.getEffect("jump_boost")?.isValid === true;
    }, false, "movement.helpers.hasSpecialEffect");
}

export function hasSpeedEffect(player: Player): boolean {
    return safeGet(() => player.getEffect("speed")?.isValid === true, false, "movement.helpers.hasSpeedEffect");
}

export function isKnockbackImmune(player: Player): boolean {
    return safeGet(() => player.getEffect("resistance")?.isValid === true, false, "movement.helpers.isKnockbackImmune");
}

export function hasElytraEquipped(player: Player): boolean {
    return safeGet(
        () => player.getComponent("equippable")?.getEquipmentSlot(EquipmentSlot.Chest)?.getItem()?.typeId === "minecraft:elytra",
        false,
        "movement.helpers.hasElytraEquipped",
    );
}