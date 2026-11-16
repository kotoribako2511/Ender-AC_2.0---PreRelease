import { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { currentConfig, MuteManager } from "../../data/config.js";
import { PermissionManager, PermissionLevel } from "../../permission.js";
import { isServerOwnerByPlayer, t } from "../../state.js";

export class PlayerInfoUI {
    public static show(admin: Player, target: Player, back: () => void): void {
        if (!target.isValid) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cプレイヤーが見つかりません。", "§cPlayer not found."));
            return back();
        }
        const loc = target.location;
        const head = target.getHeadLocation();
        const rot = target.getRotation();
        const vel = target.getVelocity();
        const hp = target.getComponent("minecraft:health")?.currentValue;
        const gm = target.getGameMode();
        const tags = target.getTags();
        const lvl = PermissionManager.getPermissionLevel(target);
        const roleStr = isServerOwnerByPlayer(target) ? "§cServerOwner"
            : lvl === PermissionLevel.Owner ? "§6Owner"
                : lvl === PermissionLevel.Admin ? "§eAdmin" : "§7Player";
        const muteStr = MuteManager.isMuted(target.name) ? "§cMuted" : "§aNot muted";
        const tagsStr = tags.length > 0 ? tags.join(", ") : t("なし", "none");
        new ActionFormData()
            .title(t("§lPlayer info", "§lPlayer Info"))
            .body(
                t(`§l§b--- Player infomation --- \n\n`, `§l§b--- Player Information --- \n\n`) +
                t(`§r§l名前: §f${target.name}\n`, `§r§lName: §f${target.name}\n`) +
                t(`§lID: §f${target.id}\n`, `§lID: §f${target.id}\n`) +
                t(`§lChatDisplayName: §f${target.chatDisplayName}\n`, `§lChatDisplayName: §f${target.chatDisplayName}\n`) +
                t(`§lPersistentID: §f${target.persistentId}\n`, `§lPersistentID: §f${target.persistentId}\n`) +
                t(`§l権限: ${roleStr}\n`, `§lRole: ${roleStr}\n`) +
                t(`§lOPレベル: §f${target.playerPermissionLevel}\n`, `§lOP Level: §f${target.playerPermissionLevel}\n`) +
                t(`§lミュート: ${muteStr}\n`, `§lMute: ${muteStr}\n`) +
                t(`\n§l§b--- Position --- \n`, `\n§l§b--- Position --- \n`) +
                t(`§l座標: §f[ x: ${loc.x.toFixed(2)}, y: ${loc.y.toFixed(2)}, z: ${loc.z.toFixed(2)} ]\n`, `§lLocation: §f[ x: ${loc.x.toFixed(2)}, y: ${loc.y.toFixed(2)}, z: ${loc.z.toFixed(2)} ]\n`) +
                t(`§l頭座標: §f[ x: ${head.x.toFixed(2)}, y: ${head.y.toFixed(2)}, z: ${head.z.toFixed(2)} ]\n`, `§lHead: §f[ x: ${head.x.toFixed(2)}, y: ${head.y.toFixed(2)}, z: ${head.z.toFixed(2)} ]\n`) +
                t(`§l回転: §f[ pitch: ${rot.x.toFixed(1)}, yaw: ${rot.y.toFixed(1)} ]\n`, `§lRotation: §f[ pitch: ${rot.x.toFixed(1)}, yaw: ${rot.y.toFixed(1)} ]\n`) +
                t(`§l速度: §f[ x: ${vel.x.toFixed(3)}, y: ${vel.y.toFixed(3)}, z: ${vel.z.toFixed(3)} ]\n`, `§lVelocity: §f[ x: ${vel.x.toFixed(3)}, y: ${vel.y.toFixed(3)}, z: ${vel.z.toFixed(3)} ]\n`) +
                t(`§lディメンション: §f${target.dimension.id}\n`, `§lDimension: §f${target.dimension.id}\n`) +
                t(`§lゲームモード: §f${gm}\n`, `§lGameMode: §f${gm}\n`) +
                t(`§lHP: §f${hp !== undefined ? hp.toFixed(1) : "不明"}\n`, `§lHP: §f${hp !== undefined ? hp.toFixed(1) : "N/A"}\n`) +
                t(`\n§l§b--- Tags --- \n`, `\n§l§b--- Tags --- \n`) +
                t(`§f[ ${tagsStr} ]`, `§f[ ${tagsStr} ]`),
            )
            .button(t("§l更新", "§lRefresh"))
            .show(admin)
            .then(({ canceled, selection }) => {
                if (canceled || selection === undefined) return back();
                if (selection === 0) return this.show(admin, target, back);
            });
    }
}

function currentConfigPrefix(): string {
    return "§5§l[Ender-AC]";
}