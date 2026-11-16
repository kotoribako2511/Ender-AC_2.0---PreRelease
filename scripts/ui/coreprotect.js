import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { currentConfig, ConfigManager } from "../data/config.js";
import { BlockLogManager } from "../log.js";
import { t } from "../state.js";
import { formatRelativeTime, paginate, buildPaginationButtons, handlePaginationSelection, confirm } from "./helpers.js";
export class CoreProtectUI {
    static showMenu(player) {
        const info = BlockLogManager.getStorageInfo();
        const isInspect = BlockLogManager.isInspectMode(player);
        const inspectStatus = isInspect ? t("§a§l有効", "§a§lEnabled") : t("§c§l無効", "§c§lDisabled");
        new ActionFormData()
            .title(t("§5§l[BlockLog] §r§lブロックログ管理", "§5§l[BlockLog] §r§lBlock Log Manager"))
            .body(t(`§l§b--- ログ・ストレージ容量情報 ---\n` +
            `§r§l機能ステータス: ${currentConfig.CoreProtect?.enabled ? "§a有効" : "§c無効"}\n` +
            `§r§l調査モード: ${inspectStatus}\n` +
            `§r§l記録ブロック数: §e${info.count} §7/ §f${info.maxLogs}件\n` +
            `§r§lDP容量使用率: §e${info.bytes} §7/ §f${info.maxBytes} B (§e${info.percent}%§7)\n`, `§l§b--- Log / Storage Info ---\n` +
            `§r§lStatus: ${currentConfig.CoreProtect?.enabled ? "§aEnabled" : "§cDisabled"}\n` +
            `§r§lInspect Mode: ${inspectStatus}\n` +
            `§r§lRecorded Blocks: §e${info.count} §7/ §f${info.maxLogs}\n` +
            `§r§lDP Usage: §e${info.bytes} §7/ §f${info.maxBytes} B (§e${info.percent}%§7)\n`))
            .button(t(`§l調査モード切替 ${isInspect ? "§a[ON]" : "§c[OFF]"}`, `§lToggle Inspect Mode ${isInspect ? "§a[ON]" : "§c[OFF]"}`))
            .button(t("§l最近のブロック履歴", "§lRecent Block History"))
            .button(t("§lBlockLog 設定", "§lBlockLog Settings"))
            .button(t("§c§lブロックログ全消去", "§c§lClear All Block Logs"))
            .button(t("§l戻る", "§lBack"))
            .show(player)
            .then(({ canceled, selection }) => {
            if (canceled || selection === undefined) {
                return import("./main-menu.js").then((m) => m.MainMenuUI.showMainMenu(player)).catch(() => { });
            }
            switch (selection) {
                case 0: {
                    const now = BlockLogManager.toggleInspect(player);
                    player.sendMessage(`${currentConfig.System.prefix} ` + t(`§a調査モードを ${now ? "§a§l有効" : "§c§l無効"} §aに変更しました。`, `§aInspect mode ${now ? "§a§lENABLED" : "§c§lDISABLED"}§a.`));
                    return this.showMenu(player);
                }
                case 1: return void this.showRecentLogs(player);
                case 2: return this.showSettings(player);
                case 3: return this.confirmClearLogs(player);
                case 4: return void import("./main-menu.js").then((m) => m.MainMenuUI.showMainMenu(player)).catch(() => { });
            }
        });
    }
    static async showBlockHistory(player, loc, dim, page = 0) {
        const logs = await BlockLogManager.getLogsAtAsync(loc.x, loc.y, loc.z, dim);
        const { pageItems, currentPage, totalPages } = paginate(logs, page, 10);
        const body = logs.length === 0
            ? t("§7この座標のブロック変更履歴はありません。", "§7No block history at this location.")
            : pageItems.map((e) => `§7[${formatRelativeTime(e.time)}] ${e.action === "place" ? t("§a[設置]", "§a[Place]") : t("§c[破壊]", "§c[Break]")} §f${e.player} §7- §e${e.block}`).join("\n");
        const form = new ActionFormData()
            .title(t("§5§l[BlockLog] §r§lブロック履歴", "§5§l[BlockLog] §r§lBlock History"))
            .body(`§l座標: [${Math.floor(loc.x)}, ${Math.floor(loc.y)}, ${Math.floor(loc.z)}] (${dim})\n§7総履歴数: §e${logs.length}件\n\n${body}`);
        buildPaginationButtons(form, currentPage, totalPages, [{ label: t("§l閉じる", "§lClose") }]);
        form.show(player).then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return;
            handlePaginationSelection(selection, currentPage, totalPages, () => { void this.showBlockHistory(player, loc, dim, currentPage - 1); }, () => { void this.showBlockHistory(player, loc, dim, currentPage + 1); }, () => { }, 1);
        });
    }
    static async showRecentLogs(player, page = 0) {
        const maxFetch = currentConfig.CoreProtect?.maxLogs ?? 3000;
        const logs = await BlockLogManager.getRecentLogsAsync(maxFetch);
        const { pageItems, currentPage, totalPages } = paginate(logs, page, 15);
        const body = logs.length === 0
            ? t("§7ログ履歴はありません。", "§7No logs.")
            : pageItems.map((e) => `§7[${formatRelativeTime(e.time)}] §f${e.player} §7${e.action === "place" ? t("§a設置", "§aPlace") : t("§c破壊", "§cBreak")}: §e${e.block} §8(${e.x}, ${e.y}, ${e.z})`).join("\n");
        const form = new ActionFormData()
            .title(t("§5§l[BlockLog] §r§l最近のブロック履歴", "§5§l[BlockLog] §r§lRecent Block History"))
            .body(`§7総履歴数: §e${logs.length}件\n\n${body}`);
        buildPaginationButtons(form, currentPage, totalPages, [
            { label: t("§l更新", "§lRefresh") },
            { label: t("§l戻る", "§lBack") },
        ]);
        form.show(player).then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return this.showMenu(player);
            handlePaginationSelection(selection, currentPage, totalPages, () => { void this.showRecentLogs(player, currentPage - 1); }, () => { void this.showRecentLogs(player, currentPage + 1); }, (idx) => { if (idx === 0)
                void this.showRecentLogs(player, 0);
            else
                this.showMenu(player); }, 2);
        });
    }
    static showSettings(player) {
        const cfg = currentConfig.CoreProtect ?? { enabled: true, maxLogs: 3000 };
        const info = BlockLogManager.getStorageInfo();
        new ModalFormData()
            .title(t("§lBlockLog 設定", "§lBlockLog Settings"))
            .toggle(t("機能の有効化", "Enable Feature"), { defaultValue: cfg.enabled })
            .textField(t(`最大保存件数 (現在: ${info.count}/${cfg.maxLogs}件)`, `Max stored blocks (current: ${info.count}/${cfg.maxLogs})`), "3000", { defaultValue: cfg.maxLogs.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showMenu(player);
            const maxLogs = Math.min(50000, Math.max(50, Number(formValues[1]) || 3000));
            ConfigManager.saveConfig({ ...currentConfig, CoreProtect: { enabled: Boolean(formValues[0]), maxLogs } });
            BlockLogManager.saveLogs();
            player.sendMessage(`${currentConfig.System.prefix} ` + t("§aCoreProtect設定を保存しました。", "§aCoreProtect settings saved."));
            this.showMenu(player);
        });
    }
    static confirmClearLogs(player) {
        confirm(player, {
            title: t("§4§lブロックログの全消去", "§4§lClear All Block Logs"),
            body: t("すべてのブロックログを消去します。", "All block logs will be deleted."),
            yes: t("§4§lはい、消去する", "§4§lYes, delete"),
        }).then((ok) => {
            if (!ok)
                return this.showMenu(player);
            BlockLogManager.clearLogs();
            player.sendMessage(`${currentConfig.System.prefix} ` + t("§aブロックログをすべて消去しました。", "§aAll block logs have been deleted."));
            this.showMenu(player);
        });
    }
}
