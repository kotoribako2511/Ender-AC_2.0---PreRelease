import { Entity, ItemStack, Player, world, PlayerPermissionLevel } from "@minecraft/server";
import { currentConfig, illegalEntity, noticeEntity, resetEntity, illegalEggSet } from "../data/config.js";
import { globalMessage } from "../util/util.js";
import { PermissionManager, DetectionType } from "../permission.js";
import { safeCall } from "../util/safe.js";

export const entitySet = new Set<string>();

export function processEntitySpawn(entity: Entity): void {
    const cfg = currentConfig.entity;
    if (!cfg.enabled) return;

    const id = entity.typeId;

    if (cfg.resetData && resetEntity.has(id)) {
        if (entity.nameTag) entity.nameTag = "";
        const inv = entity.getComponent("inventory");
        if (cfg.checkInvEnabled && inv?.container) {
            for (let i = 0; i < inv.container.size; i++) {
                inv.container.setItem(i, undefined);
            }
        }
    }

    if (illegalEntity.has(id)) {
        entity.remove();
    } else if (cfg.noticeEnabled && noticeEntity.has(id)) {
        world.sendMessage(`${currentConfig.System.prefix} §r§lEntity: Spawned "${id}" at x:${Math.floor(entity.location.x)} y:${Math.floor(entity.location.y)} z:${Math.floor(entity.location.z)} [${entity.dimension.id}]`);
    }

    if (!cfg.limitEnabled || id === "minecraft:player" || id === "minecraft:item") return;

    entitySet.add(entity.id);

    if (entitySet.size > cfg.limitCount) {
        entitySet.delete(entity.id);
        safeCall(() => {
            if (entity.isValid) entity.remove();
        });
    }
}

export function processEntityPlace(player: Player, itemStack: ItemStack | undefined): boolean {
    if (!itemStack) return false;
    if (PermissionManager.shouldSkipDetection(player, DetectionType.SpawnEgg)) return false;

    if (illegalEggSet.has(itemStack.typeId)) {

        if (currentConfig.SpawnEgg.notice) {
            globalMessage(player, "Unauthorized placement of spawn eggs", `\n(ID: ${itemStack.typeId}, name: ${itemStack.nameTag})`)
        }

        if (currentConfig.SpawnEgg.rejection) {
            return true;
        }

    }
    return false;
}

export function loadEntitySet(EntitySet: Set<string>) {
    EntitySet.clear();
    const dims = ["overworld", "nether", "the_end"];
    for (const dimName of dims) {
        safeCall(() => {
            const entities = world.getDimension(dimName).getEntities({ excludeTypes: ["minecraft:player", "minecraft:item"] });
            for (const entity of entities) {
                EntitySet.add(entity.id);
            }
        });
    }
}