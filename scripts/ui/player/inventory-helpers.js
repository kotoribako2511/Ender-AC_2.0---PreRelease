import { EquipmentSlot } from "@minecraft/server";
export function getAllSlots(player) {
    const slots = [];
    const container = player.getComponent("minecraft:inventory")?.container;
    if (container) {
        for (let i = 0; i < container.size; i++)
            slots.push({ slot: container.getSlot(i), slotId: i });
    }
    const equipment = player.getComponent("minecraft:equippable");
    if (equipment) {
        for (const slotId of [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet, EquipmentSlot.Offhand]) {
            const slot = equipment.getEquipmentSlot(slotId);
            if (slot)
                slots.push({ slot, slotId });
        }
    }
    return slots;
}
