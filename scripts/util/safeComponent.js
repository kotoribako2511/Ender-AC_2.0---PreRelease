import { EntityInventoryComponent, EntityEquippableComponent, EntityHealthComponent } from "@minecraft/server";
export function getInventory(entity) {
    const comp = entity.getComponent(EntityInventoryComponent.componentId);
    return comp?.container;
}
export function getEquippable(entity) {
    return entity.getComponent(EntityEquippableComponent.componentId);
}
export function getHealth(entity) {
    return entity.getComponent(EntityHealthComponent.componentId);
}
