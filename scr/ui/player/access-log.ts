import { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { PlayerAccessLogManager } from "../../log.js";
import { currentConfig } from "../../data/config.js";
import { t } from "../../state.js";
import {
    formatRelativeTime, paginate, buildPaginationButtons,
    handlePaginationSelection, confirm,
} from "../helpers.js";

export class AccessLogUI {
    public static show(admin: Player, page: number, back: () => void): void {
        const logs = PlayerAccessLogManager.logs;
        const { pageItems, currentPage, totalPages } = paginate(logs, page, 15);
        const body = logs.length === 0
            ? t("§7入出ログはありません。", "§7No access logs.")
            : pageItems.map((e) => {
                const type = e.type === "join" ? t("§a[入室]", "§a[Join]")
                    : e.type === "leave" ? t("§e[退出]", "§e[Leave]")
                        : t(`§c[拒否: ${e.reason ?? "不明"}]`, `§c[Denied: ${e.reason ?? "unknown"}]`);
                return `§7[${formatRelativeTime(e.time)}] ${type} §f${e.name}`;
            }).join("\n");
        const header = t(
            `§7総ログ数: §e${logs.length}件 §7(ページ ${currentPage + 1} / ${totalPages})\n\n`,
            `§7Total: §e${logs.length} §7(page ${currentPage + 1} / ${totalPages})\n\n`,
        );
        const form = new ActionFormData()
            .title(t("§5§l[Ender-AC] §r§lプレイヤー入出ログ", "§5§l[Ender-AC] §r§lPlayer Access Log"))
            .body(header + body);
        buildPaginationButtons(form, currentPage, totalPages, [
            { label: t("§l更新", "§lRefresh") },
            { label: t("§c§lログ消去", "§c§lClear Log") },
            { label: t("§l戻る", "§lBack") },
        ]);
        form.show(admin).then(({ canceled, selection }) => {
            if (canceled || selection === undefined) {
                return back();
            }
            handlePaginationSelection(
                selection, currentPage, totalPages,
                () => this.show(admin, currentPage - 1, back),
                () => this.show(admin, currentPage + 1, back),
                (idx) => {
                    if (idx === 0) this.show(admin, 0, back);
                    else if (idx === 1) this.confirmClear(admin, back);
                    else back();
                }, 3,
            );
        });
    }

    private static confirmClear(admin: Player, back: () => void): void {
        confirm(admin, {
            title: t("§4§l入出ログの全消去", "§4§lClear Player Access Log"),
            body: t("すべての入出ログを消去します。", "All player access logs will be deleted."),
            yes: t("§4§lはい、消去する", "§4§lYes, delete"),
        }).then((ok) => {
            if (!ok) return this.show(admin, 0, back);
            PlayerAccessLogManager.clearLogs();
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§aプレイヤー入出ログを消去しました。", "§aPlayer access log cleared."));
            this.show(admin, 0, back);
        });
    }
}