import { Entity, Player, Container, EntityInventoryComponent, EntityEquippableComponent, EntityHealthComponent } from "@minecraft/server";

export function getInventory(entity: Entity): Container | undefined {
    const comp = entity.getComponent(EntityInventoryComponent.componentId) as EntityInventoryComponent | undefined;
    return comp?.container;
}

export function getEquippable(entity: Entity): EntityEquippableComponent | undefined {
    return entity.getComponent(EntityEquippableComponent.componentId) as EntityEquippableComponent | undefined;
}

export function getHealth(entity: Entity): EntityHealthComponent | undefined {
    return entity.getComponent(EntityHealthComponent.componentId) as EntityHealthComponent | undefined;
}