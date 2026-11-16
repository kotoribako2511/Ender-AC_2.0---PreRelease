import { world, Player, PlayerPermissionLevel } from "@minecraft/server";
import { currentConfig } from "../data/config.js";
import { PermissionManager, PermissionLevel } from "../permission.js";
import { LogManager } from "../log.js";
import { safeCall } from "./safe.js";

export class NoticeManager {
    public static worldNotice(player: Player, type: string, message: string = ""): void {
        const msg = message ? ` ${message}` : "";
        world.sendMessage(`${currentConfig.System.prefix} §r§lIt is possible that §4"${player.name}"§r§l used cheats. §4Type[ "${type}" ]${msg}`);
        LogManager.pushLog(player, type, message);
    }

    public static personalNotice(player: Player, type: string, message: string = ""): void {
        player.sendMessage(`${currentConfig.System.prefix} §r§l${type}${message ? ` ${message}` : ""}`);
    }

    public static consoleNotice(player: Player, type: string, message: string = ""): void {
        console.warn(`${currentConfig.System.prefix} §r§l${player.name}§r§l => ${type}${message ? ` ${message}` : ""}`);
    }

    public static staffNotice(player: Player, type: string, message: string = ""): void {
        const msg = message ? ` ${message}` : "";

        safeCall(() => {
            player.sendMessage(`${currentConfig.System.prefix} §r§l"Your movement is not allowed." - §4${type}`);
        }, undefined, "NoticeManager.staffNotice.self");

        for (const p of world.getPlayers()) {
            if (p.id === player.id) continue;
            safeCall(() => {
                const lvl = PermissionManager.getPermissionLevel(p);
                const isOp = p.playerPermissionLevel === PlayerPermissionLevel.Operator;
                if (lvl >= PermissionLevel.Admin || isOp) {
                    p.sendMessage(`${currentConfig.System.prefix} §r§l"Unauthorized movement detected from ${player.name}" - §4${type} §r§l/ ${msg}`);
                }
            }, undefined, "NoticeManager.staffNotice.loop");
        }

        LogManager.pushLog(player, type, message);
    }
}

export const globalMessage = (player: Player, type: string, message: string = "") => NoticeManager.worldNotice(player, type, message);
export const staffMessage = (player: Player, type: string, message: string = "") => NoticeManager.staffNotice(player, type, message);
export const personalMessage = (player: Player, type: string, message: string = "") => NoticeManager.personalNotice(player, type, message);
export const Console = (player: Player, type: string, message: string = "") => NoticeManager.consoleNotice(player, type, message);

export function notify(player: Player, message: string): void {
    player.sendMessage(`${currentConfig.System.prefix} ${message}`);
}

export function broadcast(message: string): void {
    world.sendMessage(`${currentConfig.System.prefix} ${message}`);
}

export function getStaffPlayers(): Player[] {
    const result: Player[] = [];
    for (const p of world.getPlayers()) {
        try {
            const lvl = PermissionManager.getPermissionLevel(p);
            if (lvl >= PermissionLevel.Admin || p.playerPermissionLevel === PlayerPermissionLevel.Operator) {
                result.push(p);
            }
        } catch { }
    }
    return result;
}