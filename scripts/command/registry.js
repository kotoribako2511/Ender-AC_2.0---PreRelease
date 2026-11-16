import { CustomCommandStatus, Player, } from "@minecraft/server";
export function getPlayerContext(origin) {
    const src = origin.sourceEntity;
    const player = src instanceof Player ? src : undefined;
    return { origin, player, adminName: player?.name ?? "Console" };
}
export function failure(message) {
    return { status: CustomCommandStatus.Failure, message };
}
export function success(message) {
    return { status: CustomCommandStatus.Success, message };
}
