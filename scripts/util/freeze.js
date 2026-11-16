import { InputPermissionCategory, system } from "@minecraft/server";
import { CommandInvoker } from "./command.js";
import { getPlayerData } from "./playerState.js";
export class FreezeCommand {
    constructor(player, time, lockDetection) {
        this.player = player;
        this.time = time;
        this.lockDetection = lockDetection;
    }
    execute() {
        const data = getPlayerData(this.player);
        if (this.lockDetection)
            data.Lock.Freeze_Detection = false;
        this.player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, false);
        system.runTimeout(() => {
            if (this.player.isValid)
                this.player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
            data.Lock.Freeze_Detection = true;
        }, this.time);
    }
}
export class PunishmentManager {
    static rollback(player, loc) {
        if (loc)
            player.teleport(loc);
    }
    static freeze(player, time, lockDetection) {
        CommandInvoker.execute(new FreezeCommand(player, time, lockDetection));
    }
}
export const Freeze = (player, time, lockDetection) => PunishmentManager.freeze(player, time, lockDetection);
