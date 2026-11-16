import { Player, Vector3 } from "@minecraft/server";
import { PunishmentConfig, PunishmentPair, PunishmentType } from "../data/type.js";
import { staffMessage, globalMessage, Freeze, PunishmentManager, getPlayerData, Console } from "./util.js";
import { kick, ban } from "../command/command.js";
import { safeCall } from "./safe.js";

export interface ExecutePunishmentOptions {
    player: Player;
    detection: string;
    punishment: PunishmentType;
    freezeTicks?: number;
    tempkickSeconds?: number;
    rollbackLocation?: Vector3;
    reason?: string;
    broadcast?: boolean;
    lockDetection?: boolean;
    onSetback?: () => void;
}

export function executePunishment(options: ExecutePunishmentOptions): void {
    const {
        player,
        detection,
        punishment,
        freezeTicks = 0,
        tempkickSeconds = 30,
        rollbackLocation,
        reason,
        broadcast = false,
        lockDetection = false,
        onSetback,
    } = options;

    if (!player || !player.isValid) return;
    if (punishment === "none") return;

    if (broadcast) {
        globalMessage(player, detection, reason ?? "");
    } else {
        staffMessage(player, detection, reason ?? "");
    }
    Console(player, detection, reason ?? "");

    switch (punishment) {
        case "notify":
            return;
        case "setback":
        case "freeze_setback": {
            if (onSetback) {
                safeCall(onSetback);
            } else {
                const data = getPlayerData(player);
                PunishmentManager.rollback(
                    player,
                    rollbackLocation ?? data.lastOnGround_loc ?? data.lastLocation,
                );
            }
            if (punishment === "setback") return;
            Freeze(player, freezeTicks > 0 ? freezeTicks : 100, lockDetection);
            return;
        }
        case "freeze":
            Freeze(player, freezeTicks > 0 ? freezeTicks : 100, lockDetection);
            return;
        case "kick":
            kick(player.name, `${detection}${reason ? `: ${reason}` : ""}`);
            return;
        case "ban":
            ban(player, `${detection}${reason ? `: ${reason}` : ""}`, null, "Ender-AC");
            return;
        case "tempkick":
            ban(player, `${detection}${reason ? `: ${reason}` : ""}`, (tempkickSeconds || 30) * 1000, "Ender-AC");
            return;
    }
}

export interface PunishKindOptions {
    player: Player;
    label: string;
    cfg: PunishmentConfig;
    kind: "hit" | "break" | "place" | "sleep" | "multiHit";
    loc?: Vector3;
    reason?: string;
    freezeTicks?: number;
    broadcast?: boolean;
    lockDetection?: boolean;
}

export function punishKind(options: PunishKindOptions): void {
    const { player, label, cfg, kind, loc, reason, freezeTicks, broadcast, lockDetection } = options;

    const pair: PunishmentPair | undefined = cfg[kind];
    const fallback: PunishmentPair | undefined = cfg.punish;
    const punishment: PunishmentType = pair?.type ?? fallback?.type ?? "notify";
    const seconds: number = pair?.seconds ?? fallback?.seconds ?? 30;
    const freeze: number = freezeTicks ?? cfg.freezeTicks ?? 0;

    executePunishment({
        player,
        detection: label,
        punishment,
        freezeTicks: freeze,
        tempkickSeconds: seconds,
        rollbackLocation: loc,
        reason,
        broadcast,
        lockDetection,
    });
}