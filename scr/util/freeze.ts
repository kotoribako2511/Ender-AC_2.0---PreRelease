import { Player, Vector3, InputPermissionCategory, system } from "@minecraft/server";
import { ICommand, CommandInvoker } from "./command.js";
import { getPlayerData } from "./playerState.js";

export class FreezeCommand implements ICommand {
    constructor(private player: Player, private time: number, private lockDetection: boolean) {}

    execute(): void {
        const data = getPlayerData(this.player);
        if (this.lockDetection) data.Lock.Freeze_Detection = false;
        this.player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, false);
        system.runTimeout(() => {
            if (this.player.isValid) this.player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
            data.Lock.Freeze_Detection = true;
        }, this.time);
    }
}

export class PunishmentManager {
    public static rollback(player: Player, loc?: Vector3): void {
        if (loc) player.teleport(loc);
    }

    public static freeze(player: Player, time: number, lockDetection: boolean): void {
        CommandInvoker.execute(new FreezeCommand(player, time, lockDetection));
    }
}

export const Freeze = (player: Player, time: number, lockDetection: boolean) =>
    PunishmentManager.freeze(player, time, lockDetection);