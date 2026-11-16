import { system, BlockPermutation } from "@minecraft/server";
import { currentConfig, illegalBlockSet, resetBlockSet } from "../../data/config.js";
import { Console, personalMessage, WorldUtils, staffMessage } from "../../util/util.js";
import { scanAndClearContainer } from "../item/index.js";
import { PermissionManager, DetectionType } from "../../permission.js";
export function checkBlockPlace(ev) {
    const blockcfg = currentConfig.BlockPlace;
    if (PermissionManager.shouldSkipDetection(ev.player, DetectionType.BlockPlace))
        return;
    const { player, block, permutationToPlace } = ev;
    const placedTypeId = permutationToPlace?.type.id ?? block.typeId;
    if (!blockcfg.enabled)
        return;
    if (blockcfg.illegalPlace && illegalBlockSet.has(placedTypeId)) {
        staffMessage(player, "Illegal block placement", ` - ID: "${placedTypeId}"`);
        ev.cancel = true;
        return;
    }
    const shouldReset = resetBlockSet.size > 0
        ? resetBlockSet.has(placedTypeId)
        : blockcfg.resetData;
    system.run(() => {
        if (!player.isValid)
            return;
        if (shouldReset) {
            const states = block.permutation.getAllStates();
            try {
                player.runCommand(`setblock ${block.x} ${block.y} ${block.z} ${placedTypeId}`);
            }
            catch (e) {
                console.warn(e);
                personalMessage(player, "Failed to reset the data.");
                block.setPermutation(BlockPermutation.resolve(placedTypeId, states));
            }
        }
        if (blockcfg.illegalcontainer) {
            const invComp = block.getComponent("inventory");
            if (invComp?.isValid) {
                const illegalFound = scanAndClearContainer(invComp.container, player);
                if (illegalFound.length > 0) {
                    staffMessage(player, "Illegal Item Container", ` - ID: "${placedTypeId}"`);
                    illegalFound.forEach(v => Console(player, "§l§4", v));
                    block.setType("minecraft:air");
                }
            }
        }
    });
}
export function checkAirPlace(ev) {
    if (!currentConfig.BlockPlace.airPlace.enabled)
        return;
    if (WorldUtils.getblock(WorldUtils.BlockPlaceWith(ev.face, ev.block.location))
        === "minecraft:air") {
        ev.cancel = true;
        staffMessage(ev.player, "AirPlace", ` - ID: ${ev.block.typeId}`);
    }
}
