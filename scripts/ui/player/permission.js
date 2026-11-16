import { ActionFormData } from "@minecraft/server-ui";
import { currentConfig } from "../../data/config.js";
import { personalMessage } from "../../util/util.js";
import { PermissionManager, PermissionLevel } from "../../permission.js";
import { isServerOwnerByPlayer, t } from "../../state.js";
export class PlayerPermissionUI {
    static show(admin, target, back) {
        if (!target.isValid) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cプレイヤーが見つかりません。", "§cPlayer not found."));
            return back();
        }
        const level = PermissionManager.getPermissionLevel(target);
        const isOwner = level === PermissionLevel.Owner;
        const isAdmin = level === PermissionLevel.Admin;
        const isTargetServerOwner = isServerOwnerByPlayer(target);
        const body = t(`§7対象: §f${target.name}\n\n§6Owner: ${isOwner ? "§a§lON" : "§c§lOFF"}\n§eAdmin: ${isAdmin ? "§a§lON" : "§c§lOFF"}\n\n§7※Owner と Admin は排他制御されています。`, `§7Target: §f${target.name}\n\n§6Owner: ${isOwner ? "§a§lON" : "§c§lOFF"}\n§eAdmin: ${isAdmin ? "§a§lON" : "§c§lOFF"}\n\n§7Owner and Admin are mutually exclusive.`);
        new ActionFormData()
            .title(t(`§l権限管理 - ${target.name}`, `§lPermission Management - ${target.name}`))
            .body(body + (isTargetServerOwner ? t("\n§c§lこのプレイヤーはサーバーオーナーです。", "\n§c§lThis player is the server owner.") : ""))
            .button(isOwner ? t("§6§lOwner §c[剥奪]", "§6§lOwner §c[Revoke]") : t("§6§lOwner §a[付与]", "§6§lOwner §a[Grant]"))
            .button(isAdmin ? t("§e§lAdmin §c[剥奪]", "§e§lAdmin §c[Revoke]") : t("§e§lAdmin §a[付与]", "§e§lAdmin §a[Grant]"))
            .button(t("§l戻る", "§lBack"))
            .show(admin)
            .then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return back();
            if (!target.isValid)
                return back();
            if (selection === 0) {
                if (isOwner) {
                    if (isTargetServerOwner) {
                        admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cサーバーオーナーの Owner 権限は剥奪できません。", "§cCannot revoke Owner from server owner."));
                        return this.show(admin, target, back);
                    }
                    PermissionManager.setPermission(target, PermissionLevel.Player);
                    admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§a${target.name} から Owner 権限を剥奪しました。`, `§aRevoked Owner from ${target.name}.`));
                    personalMessage(target, t("Owner権限が剥奪されました。", "Your Owner permission has been revoked."));
                }
                else {
                    PermissionManager.setPermission(target, PermissionLevel.Owner);
                    admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§a${target.name} に Owner 権限を付与しました。`, `§aGranted Owner to ${target.name}.`));
                    personalMessage(target, t("Owner権限が付与されました。", "You have been granted Owner permission."));
                }
                return this.show(admin, target, back);
            }
            if (selection === 1) {
                if (isAdmin) {
                    PermissionManager.setPermission(target, PermissionLevel.Player);
                    admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§a${target.name} から Admin 権限を剥奪しました。`, `§aRevoked Admin from ${target.name}.`));
                    personalMessage(target, t("Admin権限が剥奪されました。", "Your Admin permission has been revoked."));
                }
                else {
                    PermissionManager.setPermission(target, PermissionLevel.Admin);
                    admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§a${target.name} に Admin 権限を付与しました。`, `§aGranted Admin to ${target.name}.`));
                    personalMessage(target, t("Admin権限が付与されました。", "You have been granted Admin permission."));
                }
                return this.show(admin, target, back);
            }
            back();
        });
    }
}
