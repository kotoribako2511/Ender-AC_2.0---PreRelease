import { world, PlayerPermissionLevel } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { currentConfig, banList, BanManager, MuteManager, SessionIdMap } from "../../data/config.js";
import { AdminActionLogManager } from "../../log.js";
import { PermissionManager, PermissionLevel } from "../../permission.js";
import { isServerOwnerByPlayer, t } from "../../state.js";
import { WhitelistUI } from "./whitelist.js";
import { BanUI } from "./ban.js";
import { AccessLogUI } from "./access-log.js";
import { PlayerInfoUI } from "./info.js";
import { PlayerInventoryUI } from "./inventory.js";
import { PlayerPermissionUI } from "./permission.js";
import { PlayerTeleportUI } from "./teleport.js";
import { PlayerPunishmentUI } from "./punishment.js";
import { PlayerCameraUI } from "./camera.js";
import { banOffline, parseDuration, formatDuration } from "../../command/command.js";
function back(player) {
    import("../main-menu.js").then((m) => m.MainMenuUI.showMainMenu(player)).catch(() => { });
}
export class PlayerManagementUI {
    static PlayerCategory(admin) {
        const wlStatus = currentConfig.Whitelist?.enabled ? t("§a有効", "§aON") : t("§c無効", "§cOFF");
        const banInfo = BanManager.getStorageInfo();
        const mutedCount = MuteManager.getMutedPlayers().length;
        new ActionFormData()
            .title(t("§lプレイヤー管理", "§lPlayer Management"))
            .body(t(`§7BANリスト: §f${banList.length}人 §8(容量: ${banInfo.percent}%) §8| §7オンライン: §f${world.getPlayers().length}人\n§7ホワイトリスト: ${wlStatus}\n§7ミュート中: §f${mutedCount}人`, `§7Bans: §f${banList.length} §8(storage: ${banInfo.percent}%) §8| §7Online: §f${world.getPlayers().length}\n§7Whitelist: ${wlStatus}\n§7Muted: §f${mutedCount}`))
            .button(t(`§4§lban解除 §r§l- ${banList.length}人`, `§4§lUnban §r§l- ${banList.length}`))
            .button(t(`§c§l手動でBANする (オフライン含む)`, `§c§lManual BAN (including offline)`))
            .button(t(`§lPlayer 一覧 - ${world.getPlayers().length}人`, `§lPlayers - ${world.getPlayers().length}`))
            .button(t(`§a§lホワイトリスト管理 ${wlStatus} - ${currentConfig.Whitelist?.players.length ?? 0}人`, `§a§lWhitelist ${wlStatus} - ${currentConfig.Whitelist?.players.length ?? 0}`))
            .button(t(`§l管理操作ログ - ${AdminActionLogManager.logs.length}件`, `§lAdmin Action Log - ${AdminActionLogManager.logs.length}`))
            .button(t(`§lTeleport設定`, `§lTeleport Settings`))
            .show(admin)
            .then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return back(admin);
            if (selection === 0)
                return BanUI.showBanRemove(admin, () => PlayerManagementUI.PlayerCategory(admin));
            if (selection === 1)
                return this.showManualBanModal(admin);
            if (selection === 2)
                return this.Players(admin);
            if (selection === 3)
                return WhitelistUI.showWhitelistMenu(admin, () => PlayerManagementUI.PlayerCategory(admin));
            if (selection === 4)
                return import("../logs.js").then((m) => m.AdminActionLogUI.showLog(admin)).catch(() => { });
            if (selection === 5)
                return import("../ac-settings/index.js").then((m) => m.ACSettingsUI.showTeleportSettingsMenu(admin, true)).catch(() => { });
        });
    }
    static showWhitelistMenu(admin) {
        WhitelistUI.showWhitelistMenu(admin, () => PlayerManagementUI.PlayerCategory(admin));
    }
    static showPlayerAccessLogs(admin, page = 0) {
        AccessLogUI.show(admin, page, () => import("../join.js").then((m) => m.JoinManagementUI.showJoinMenu(admin)).catch(() => { }));
    }
    static showManualBanModal(admin) {
        new ModalFormData()
            .title(t("§l手動BAN (オフライン含む)", "§lManual BAN (including offline)"))
            .textField(t("プレイヤー名", "Player Name"), t("例: Steve", "e.g. Steve"))
            .textField(t("期間 (例: 1d, perm)", "Duration (e.g. 1d, perm)"), "perm")
            .textField(t("理由", "Reason"), t("チート使用", "Cheating"))
            .show(admin)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.PlayerCategory(admin);
            const name = String(formValues[0] ?? "").trim();
            const durationStr = String(formValues[1] ?? "").trim() || "perm";
            const reason = String(formValues[2] ?? "").trim() || t("チート使用", "Cheating");
            if (!name) {
                admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cプレイヤー名を入力してください。", "§cPlease enter a player name."));
                return this.showManualBanModal(admin);
            }
            const durationMs = parseDuration(durationStr);
            if (durationMs === undefined) {
                admin.sendMessage(`${currentConfig.System.prefix} ` + t("§c期間の形式が正しくありません。", "§cInvalid duration format."));
                return this.showManualBanModal(admin);
            }
            const persistentId = SessionIdMap.get(name) ?? name;
            if (BanManager.isBanned(persistentId, name)) {
                admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§c${name} は既にBANされています。`, `§c${name} is already banned.`));
                return this.PlayerCategory(admin);
            }
            banOffline(name, persistentId, reason, durationMs, admin.name);
            admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§a${name} をBANしました (${formatDuration(durationMs)})`, `§aBanned ${name} (${formatDuration(durationMs)})`));
            this.PlayerCategory(admin);
        });
    }
    static Players(admin) {
        const players = world.getPlayers();
        if (players.length === 0) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cオンラインのプレイヤーがいません。", "§cNo players online."));
            return back(admin);
        }
        const action = new ActionFormData()
            .title("§lPlayers")
            .body(t(`§7オンライン: ${players.length}人`, `§7Online: ${players.length}`));
        for (const p of players) {
            const hp = p.getComponent("minecraft:health")?.currentValue;
            const lvl = PermissionManager.getPermissionLevel(p);
            const isMuted = MuteManager.isMuted(p.name);
            const isServerOwner = isServerOwnerByPlayer(p);
            let icon = "textures/ui/permissions_member_star";
            switch (p.playerPermissionLevel) {
                case PlayerPermissionLevel.Operator:
                    icon = "textures/ui/permissions_op_crown";
                    break;
                case PlayerPermissionLevel.Visitor:
                    icon = "textures/ui/permissions_visitor_hand";
                    break;
                case PlayerPermissionLevel.Custom:
                    icon = "textures/ui/permissions_custom_dots";
                    break;
            }
            let roleTag = "";
            if (isServerOwner)
                roleTag = " §c[ServerOwner]";
            else if (lvl === PermissionLevel.Owner)
                roleTag = " §6[Owner]";
            else if (lvl === PermissionLevel.Admin)
                roleTag = " §e[Admin]";
            if (isMuted)
                roleTag += " §7[Muted]";
            action.button(`${p.name}${roleTag} §l§aHP:${hp !== undefined ? Math.ceil(hp) : "?"}`, `${icon}`);
        }
        action.show(admin).then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return back(admin);
            this.showPlayerMenu(admin, players[selection]);
        });
    }
    static showPlayerMenu(admin, target) {
        if (!target.isValid) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cプレイヤーが見つかりません。", "§cPlayer not found."));
            return back(admin);
        }
        const backToMenu = () => this.showPlayerMenu(admin, target);
        new ActionFormData()
            .title(`§l${target.name}`)
            .button(t("§lプレイヤー情報", "§lPlayer Info"), "textures/ui/icon_book_writable")
            .button(t("§lインベントリ", "§lInventory"), "textures/ui/icon_apple")
            .button(t("§l処罰", "§lPunish"), "textures/ui/blindness_effect")
            .button(t("§6§l権限管理", "§6§lPermission Management"), "textures/ui/permissions_op_crown")
            .button(t("§lこのプレイヤーにTPする", "§lTeleport to this player"))
            .button(t("§lこのプレイヤーをTPさせる", "§lTeleport this player"))
            .button(t("§b§l視点を観察", "§b§lObserve View"))
            .show(admin)
            .then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return back(admin);
            const handlers = [
                (a, tg) => PlayerInfoUI.show(a, tg, backToMenu),
                (a, tg) => PlayerInventoryUI.show(a, tg, backToMenu),
                (a, tg) => PlayerPunishmentUI.show(a, tg, backToMenu),
                (a, tg) => PlayerPermissionUI.show(a, tg, backToMenu),
                (a, tg) => PlayerTeleportUI.teleportAdminToTarget(a, tg, backToMenu),
                (a, tg) => PlayerTeleportUI.showMakeMenu(a, tg, backToMenu),
                (a, tg) => PlayerCameraUI.showObserveMenu(a, tg, backToMenu),
            ];
            handlers[selection]?.(admin, target);
        });
    }
}
