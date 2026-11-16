import { Player, EquipmentSlot, ContainerSlot } from "@minecraft/server";

export interface ItemInformation {
    slot: ContainerSlot;
    slotId: EquipmentSlot | number;
}

export function getAllSlots(player: Player): ItemInformation[] {
    const slots: ItemInformation[] = [];
    const container = player.getComponent("minecraft:inventory")?.container;
    if (container) {
        for (let i = 0; i < container.size; i++) slots.push({ slot: container.getSlot(i), slotId: i });
    }
    const equipment = player.getComponent("minecraft:equippable");
    if (equipment) {
        for (const slotId of [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet, EquipmentSlot.Offhand] as const) {
            const slot = equipment.getEquipmentSlot(slotId);
            if (slot) slots.push({ slot, slotId });
        }
    }
    return slots;
}