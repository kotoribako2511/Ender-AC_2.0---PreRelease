import { Player, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { LogManager, AdminActionLogManager } from "../log.js";
import { currentConfig } from "../data/config.js";
import { formatDuration } from "../command/command.js";
import { t } from "../state.js";
import { formatRelativeTime, paginate, buildPaginationButtons, handlePaginationSelection, confirm } from "./helpers.js";

export class LogUI {
    public static showViolationLog(admin: Player): void {
        const logs = LogManager.logs.slice(0, 20);
        const body = logs.length === 0
            ? t("§7まだ検知履歴はありません。", "§7No detection history yet.")
            : logs.map((e) => {
                const sec = Math.max(0, Math.floor((system.currentTick - e.time) / 20));
                const label = sec < 60
                    ? t(`${sec}秒前`, `${sec}s ago`)
                    : t(`${Math.floor(sec / 60)}分前`, `${Math.floor(sec / 60)}m ago`);
                return `§7[${label}] §c${e.type} §7- §f${e.player}${e.message ? ` §8${e.message}` : ""}`;
            }).join("\n");

        new ActionFormData()
            .title(t("§5§l[Ender-AC] §r§l検知ログ", "§5§l[Ender-AC] §r§lDetection Log"))
            .body(body)
            .button(t("§l更新", "§lRefresh"))
            .button(t("§c§lログを消去", "§c§lClear Log"))
            .button(t("§l戻る", "§lBack"))
            .show(admin)
            .then(({ canceled, selection }) => {
                if (canceled || selection === undefined) {
                    return import("./main-menu.js").then((m) => m.MainMenuUI.showMainMenu(admin)).catch(() => { });
                }
                if (selection === 0) return this.showViolationLog(admin);
                if (selection === 1) {
                    LogManager.clearLog();
                    admin.sendMessage(`${currentConfig.System.prefix} ` + t("§a検知ログを消去しました。", "§aDetection log cleared."));
                    return this.showViolationLog(admin);
                }
                import("./main-menu.js").then((m) => m.MainMenuUI.showMainMenu(admin)).catch(() => { });
            });
    }
}

export class AdminActionLogUI {
    public static showLog(admin: Player, page = 0): void {
        const logs = AdminActionLogManager.logs;
        const { pageItems, currentPage, totalPages } = paginate(logs, page, 15);
        const body = logs.length === 0
            ? t("§7管理操作の記録はありません。", "§7No admin action records.")
            : pageItems.map((e) => {
                const dur = e.duration !== undefined
                    ? ` §8[${e.duration === null ? t("永久", "Permanent") : formatDuration(e.duration)}]`
                    : "";
                const reason = e.reason ? t(` §8理由: ${e.reason}`, ` §8Reason: ${e.reason}`) : "";
                return `§7[${formatRelativeTime(e.time)}] §e${e.admin} §7→ §f${e.target} §c<${e.action}>${dur}${reason}`;
            }).join("\n");
        const header = t(
            `§7総記録数: §e${logs.length}件 §7(ページ ${currentPage + 1} / ${totalPages})\n\n`,
            `§7Total: §e${logs.length} §7(page ${currentPage + 1} / ${totalPages})\n\n`,
        );
        const form = new ActionFormData()
            .title(t("§5§l[Ender-AC] §r§l管理操作ログ", "§5§l[Ender-AC] §r§lAdmin Action Log"))
            .body(header + body);
        buildPaginationButtons(form, currentPage, totalPages, [
            { label: t("§l更新", "§lRefresh") },
            { label: t("§c§lログ消去", "§c§lClear Log") },
            { label: t("§l戻る", "§lBack") },
        ]);
        form.show(admin).then(({ canceled, selection }) => {
            if (canceled || selection === undefined) {
                return import("./main-menu.js").then((m) => m.MainMenuUI.showMainMenu(admin)).catch(() => { });
            }
            handlePaginationSelection(
                selection, currentPage, totalPages,
                () => this.showLog(admin, currentPage - 1),
                () => this.showLog(admin, currentPage + 1),
                (idx) => {
                    if (idx === 0) this.showLog(admin, 0);
                    else if (idx === 1) this.confirmClear(admin);
                    else import("./main-menu.js").then((m) => m.MainMenuUI.showMainMenu(admin)).catch(() => { });
                },
                3,
            );
        });
    }

    private static confirmClear(admin: Player): void {
        confirm(admin, {
            title: t("§4§l管理操作ログの全消去", "§4§lClear Admin Action Log"),
            body: t("すべての管理操作ログを消去します。", "All admin action logs will be deleted."),
            yes: t("§4§lはい、消去する", "§4§lYes, delete"),
        }).then((ok) => {
            if (!ok) return this.showLog(admin);
            AdminActionLogManager.clearLogs();
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§a管理操作ログを消去しました。", "§aAdmin action log cleared."));
            this.showLog(admin);
        });
    }
}