import { world, Entity, Player, EquipmentSlot, EntityEquippableComponent, Container, ItemStack } from "@minecraft/server";
import { currentConfig, IllegalItems } from "../../data/config.js";
import { globalMessage, staffMessage } from "../../util/util.js";
import { PermissionManager, DetectionType } from "../../permission.js";
export { AutoTotem, processAutoTotemTick } from "./autoTotem.js";

function checkIllegalItem(item: ItemStack, isEntityDrop: boolean = false): { isIllegal: boolean, reason?: string, details?: string } {
    const itemCfg = currentConfig.IllegalItem;

    if (itemCfg.checkEnchant) {
        for (const enchant of item.getComponent("enchantable")?.getEnchantments() ?? []) {
            if (enchant.level <= enchant.type.maxLevel) continue;
            return { isIllegal: true, reason: "Illegal enchantments", details: ` - ID: "${item.typeId}", Level: "${enchant.level}"` };
        }
    }

    if (itemCfg.checkAmount && item.amount > item.maxAmount) {
        return { isIllegal: true, reason: "Illegal amount", details: ` - ID: "${item.typeId}", Amount: "${item.amount}"` };
    }

    if ((itemCfg.checkIllegalId || isEntityDrop) && IllegalItems.has(item.typeId)) {
        return { isIllegal: true, reason: "Illegal item", details: `- ID: "${item.typeId}"` };
    }

    if (itemCfg.checkName && (item.nameTag?.length ?? 0) > 30) {
        return { isIllegal: true, reason: "Illegal Item Name", details: ` - ID: "${item.typeId}", Length: "${item.nameTag?.length}"` };
    }

    return { isIllegal: false };
}

export function scanAndClearContainer(cont: Container | undefined, player?: Player): string[] {
    if (!cont) return [];
    if (player && PermissionManager.shouldSkipDetection(player, DetectionType.IllegalItem)) return [];
    const illegalFound: string[] = [];

    for (let i = 0; i < cont.size; i++) {
        const item = cont.getItem(i);
        if (!item) continue;

        const check = checkIllegalItem(item);
        if (!check.isIllegal) continue;
        cont.setItem(i, undefined);
        if (player && check.reason && check.details) staffMessage(player, check.reason, check.details);
        illegalFound.push(item.typeId);
    }

    return illegalFound;
}

export function processItemEntityTick(entity: Entity, item: ItemStack | undefined): void {
    const conf = currentConfig.IllegalItem;
    if (!item || !conf.enabled) return;

    if (!conf.enabled || !conf.checkEntity) return;

    const check = checkIllegalItem(item, true);
    if (!check.isIllegal) return;
    const { x, y, z } = entity.location;
    entity.remove();
    world.sendMessage(`${currentConfig.System.prefix} §r§l${check.reason} detected and destroyed. \n§4ID( "${item.typeId}" ), \n(location: "x: ${x.toFixed(1)}, y: ${y.toFixed(1)}, z: ${z.toFixed(1)}" )`);
}

export function processItemTick(player: Player, now: number, equippable: EntityEquippableComponent | undefined): void {
    const itemCfg = currentConfig.IllegalItem;
    if (!itemCfg.enabled || now % Math.max(1, itemCfg.scanIntervalTick) !== 0) return;
    if (PermissionManager.shouldSkipDetection(player, DetectionType.IllegalItem)) return;

    const cont = player.getComponent('inventory')?.container;
    scanAndClearContainer(cont, player);

    if (!equippable) return;
    const slots = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet, EquipmentSlot.Offhand];
    for (const slot of slots) {
        const item = equippable.getEquipmentSlot(slot).getItem();
        if (!item) continue;
        const check = checkIllegalItem(item);
        if (!check.isIllegal) continue;
        equippable.setEquipment(slot, undefined);
        if (check.reason && check.details) {
            staffMessage(player, check.reason, check.details)
        }
    }
}