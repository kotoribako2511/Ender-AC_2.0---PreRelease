import { Player } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { currentConfig, ConfigManager } from "../data/config.js";
import { PlayerAccessLogManager } from "../log.js";
import { t } from "../state.js";
import { PlayerManagementUI } from "./player/player.js";

export class JoinManagementUI {
    public static showJoinMenu(admin: Player): void {
        new ActionFormData()
            .title(t("§l入出管理", "§lJoin Management"))
            .body(t(
                "入出ログの確認、または入出管理ACの設定を行います。",
                "View join logs or configure the Join check AC.",
            ))
            .button(t(`§b§lプレイヤー入出ログ §h(${PlayerAccessLogManager.logs.length}件)`,
                `§b§lPlayer Access Log §h(${PlayerAccessLogManager.logs.length})`))
            .button(t(`§l入出管理AC 設定 ${currentConfig.Join?.enabled ? "§a[ON]" : "§c[OFF]"}`,
                `§lJoin Check AC Settings ${currentConfig.Join?.enabled ? "§a[ON]" : "§c[OFF]"}`))
            .button(t("§l戻る", "§lBack"))
            .show(admin)
            .then(({ canceled, selection }) => {
                if (canceled || selection === undefined) {
                    return import("./main-menu.js").then((m) => m.MainMenuUI.showMainMenu(admin)).catch(() => { });
                }
                if (selection === 0) return PlayerManagementUI.showPlayerAccessLogs(admin);
                if (selection === 1) return this.showJoinSettings(admin);
                import("./main-menu.js").then((m) => m.MainMenuUI.showMainMenu(admin)).catch(() => { });
            });
    }

    public static showJoinSettings(admin: Player, back?: () => void): void {
        const returnBack = back ?? (() => this.showJoinMenu(admin));
        const joinCfg = currentConfig.Join ?? { enabled: true, kickMessage: "" };
        new ModalFormData()
            .title(t("§l入出管理AC 設定", "§lJoin Check AC Settings"))
            .toggle(t("入出時の不正チェックを有効化", "Enable join-time cheat checks"), { defaultValue: joinCfg.enabled })
            .textField(t("キック/切断時の追加メッセージ", "Extra message on kick/disconnect"),
                t("例: 異議申し立て用discord鯖", "e.g. Appeal Discord"),
                { defaultValue: joinCfg.kickMessage ?? "" })
            .slider(t("joinしてからspwanするまでの猶予Tick", "Grace ticks between join and spawn"),
                200, 800, { defaultValue: currentConfig.Join?.spawnTimeoutTick ?? 200 })
            .show(admin)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return returnBack();
                ConfigManager.saveConfig({
                    ...currentConfig,
                    Join: {
                        ...currentConfig.Join,
                        enabled: Boolean(formValues[0]),
                        kickMessage: String(formValues[1] ?? ""),
                        spawnTimeoutTick: Number(formValues[2] ?? 200),
                    },
                });
                admin.sendMessage(`${currentConfig.System.prefix} ` + t("§a入出管理設定を保存しました。", "§aJoin settings saved."));
                returnBack();
            });
    }
}