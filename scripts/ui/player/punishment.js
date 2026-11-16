import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { currentConfig, ConfigManager, MuteManager } from "../../data/config.js";
import { Freeze, personalMessage } from "../../util/util.js";
import { AdminActionLogManager } from "../../log.js";
import { kick, ban, parseDuration, formatDuration, formatRemaining } from "../../command/command.js";
import { t } from "../../state.js";
export class PlayerPunishmentUI {
    static show(admin, target, back) {
        if (!target.isValid) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cプレイヤーが見つかりません。", "§cPlayer not found."));
            return back();
        }
        const isMuted = MuteManager.isMuted(target.name);
        const muteLabel = isMuted
            ? t("§7§lミュート管理 §a[ON]", "§7§lMute §a[ON]")
            : t("§7§lミュート管理 §c[OFF]", "§7§lMute §c[OFF]");
        new ActionFormData()
            .title(t("§l処罰メニュー", "§lPunishment Menu"))
            .body(t(`対象: §e${target.name}`, `Target: §e${target.name}`))
            .button(muteLabel, "textures/ui/mute_off")
            .button(t("§eフリーズ", "§eFreeze"))
            .button(t("§6キック", "§6Kick"))
            .button(t("§4BAN", "§4BAN"))
            .show(admin)
            .then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return back();
            if (selection === 0)
                return this.showMuteMenu(admin, target, back);
            if (selection === 1)
                return this.showFreezeModal(admin, target, back);
            if (selection === 2)
                return this.showKickModal(admin, target, back);
            if (selection === 3)
                return this.showBanModal(admin, target, back);
        });
    }
    static showMuteMenu(admin, target, back) {
        if (!target.isValid) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cプレイヤーが見つかりません。", "§cPlayer not found."));
            return this.show(admin, target, back);
        }
        const cfg = currentConfig.Mute;
        const isMuted = MuteManager.isMuted(target.name);
        const entry = MuteManager.getEntry(target.name);
        const status = isMuted ? t("§c§lミュート中", "§c§lMuted") : t("§a§lミュートされていない", "§a§lNot muted");
        const remain = entry ? t(`\n§7残り: ${formatRemaining(entry.expireAt)}`, `\n§7Remaining: ${formatRemaining(entry.expireAt)}`) : "";
        const reason = entry?.reason ? t(`\n§7理由: ${entry.reason}`, `\n§7Reason: ${entry.reason}`) : "";
        new ActionFormData()
            .title(t(`§7§lミュート管理 - ${target.name}`, `§7§lMute - ${target.name}`))
            .body(t(`§7対象: §f${target.name}\n§7状態: ${status}${remain}${reason}\n\n§7Owner: ${cfg.ownerCanSee ? "§a閲覧可" : "§c閲覧不可"}\n§7Admin: ${cfg.adminCanSee ? "§a閲覧可" : "§c閲覧不可"}`, `§7Target: §f${target.name}\n§7Status: ${status}${remain}${reason}\n\n§7Owner: ${cfg.ownerCanSee ? "§avisible" : "§chidden"}\n§7Admin: ${cfg.adminCanSee ? "§avisible" : "§chidden"}`))
            .button(isMuted ? t("§a§lミュート解除", "§a§lUnmute") : t("§c§lミュートする", "§c§lMute"))
            .button(t("§lミュート設定", "§lMute Settings"))
            .button(t("§l戻る", "§lBack"))
            .show(admin)
            .then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return this.show(admin, target, back);
            if (selection === 0) {
                if (!target.isValid)
                    return this.show(admin, target, back);
                if (isMuted) {
                    MuteManager.unmute(target.name);
                    AdminActionLogManager.addLog({ time: Date.now(), admin: admin.name, action: "unmute", target: target.name, targetId: target.id, reason: "Unmute via UI" });
                    admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§a${target.name} のミュートを解除しました。`, `§a${target.name} unmuted.`));
                    personalMessage(target, t("ミュートが解除されました。", "You have been unmuted."));
                    return this.showMuteMenu(admin, target, back);
                }
                return this.showMuteDurationModal(admin, target, back);
            }
            if (selection === 1)
                return this.showMuteSettings(admin, target, back);
            this.show(admin, target, back);
        });
    }
    static showMuteDurationModal(admin, target, back) {
        new ModalFormData()
            .title(t("§lミュート期間", "§lMute Duration"))
            .textField(t("期間 (例: 10m, 1h, 1d, perm)", "Duration (e.g. 10m, 1h, 1d, perm)"), "10m")
            .textField(t("理由", "Reason"), t("ルール違反", "Rule violation"))
            .show(admin)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues || !target.isValid)
                return this.showMuteMenu(admin, target, back);
            const durationStr = String(formValues[0] ?? "").trim() || "perm";
            const reason = String(formValues[1] ?? "").trim() || t("ルール違反", "Rule violation");
            const durationMs = parseDuration(durationStr);
            if (durationMs === undefined) {
                admin.sendMessage(`${currentConfig.System.prefix} ` + t("§c期間の形式が正しくありません", "§cInvalid duration format"));
                return this.showMuteDurationModal(admin, target, back);
            }
            MuteManager.mute(target.name, target.id, reason, durationMs, admin.name);
            AdminActionLogManager.addLog({ time: Date.now(), admin: admin.name, action: durationMs === null ? "mute" : "tempmute", target: target.name, targetId: target.id, reason, duration: durationMs });
            admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§c${target.name} をミュートしました。`, `§c${target.name} muted.`));
            personalMessage(target, t(`あなたはミュートされました (${formatDuration(durationMs)})。`, `You have been muted (${formatDuration(durationMs)}).`));
            this.showMuteMenu(admin, target, back);
        });
    }
    static showMuteSettings(admin, target, back) {
        const m = currentConfig.Mute;
        new ModalFormData()
            .title(t("§lミュート設定", "§lMute Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: m.enabled })
            .toggle(t("Admin 可視", "Admin visible"), { defaultValue: m.adminCanSee })
            .toggle(t("Owner 可視", "Owner visible"), { defaultValue: m.ownerCanSee })
            .toggle(t("スタッフ通知", "Notify staff"), { defaultValue: m.notifyToStaff })
            .textField(t("メッセージ", "Message"), "§cYou are muted.", { defaultValue: m.muteMessage })
            .show(admin)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showMuteMenu(admin, target, back);
            ConfigManager.saveConfig({
                ...currentConfig,
                Mute: {
                    enabled: Boolean(formValues[0]),
                    adminCanSee: Boolean(formValues[1]),
                    ownerCanSee: Boolean(formValues[2]),
                    notifyToStaff: Boolean(formValues[3]),
                    muteMessage: String(formValues[4] ?? "§cYou are muted."),
                },
            });
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§aミュート設定を保存しました。", "§aMute settings saved."));
            this.showMuteMenu(admin, target, back);
        });
    }
    static showFreezeModal(admin, target, back) {
        new ModalFormData()
            .title(t("§lフリーズ", "§lFreeze"))
            .slider(t("秒", "seconds"), 0, 300, { defaultValue: 10, valueStep: 5 })
            .show(admin)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues || !target.isValid)
                return this.show(admin, target, back);
            const seconds = Number(formValues[0]);
            if (seconds > 0) {
                Freeze(target, seconds * 20, false);
                AdminActionLogManager.addLog({ time: Date.now(), admin: admin.name, action: "freeze", target: target.name, targetId: target.id, duration: seconds * 1000 });
                admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§a${target.name} を ${seconds}秒フリーズしました。`, `§aFroze ${target.name} for ${seconds}s.`));
                personalMessage(target, t("あなたはフリーズされました。", "You have been frozen."));
            }
            back();
        });
    }
    static showKickModal(admin, target, back) {
        new ModalFormData()
            .title(t("§lキック", "§lKick"))
            .textField(t("理由", "Reason"), t("ルール違反", "Rule violation"))
            .show(admin)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.show(admin, target, back);
            const reason = String(formValues[0] ?? "").trim() || t("ルール違反", "Rule violation");
            this.confirmAndKick(admin, target, reason, back);
        });
    }
    static confirmAndKick(admin, target, reason, back) {
        new ActionFormData()
            .title(t("§6確認", "§6Confirm"))
            .body(t(`§e${target.name} §rをキックします。`, `Kick §e${target.name}§r?`))
            .button(t("§6§lキックする", "§6§lKick"))
            .button(t("§lキャンセル", "§lCancel"))
            .show(admin)
            .then(({ canceled, selection }) => {
            if (canceled || selection !== 0)
                return this.show(admin, target, back);
            const kickMsg = currentConfig.Join?.kickMessage ? `\n${currentConfig.Join.kickMessage}` : "";
            kick(target.name, reason + kickMsg);
            admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§cKicked ${target.name}.`, `§cKicked ${target.name}.`));
        });
    }
    static showBanModal(admin, target, back) {
        new ModalFormData()
            .title(t("§lBAN", "§lBAN"))
            .textField(t("理由", "Reason"), t("チート使用", "Cheating"))
            .textField(t("期間", "Duration"), "perm")
            .show(admin)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.show(admin, target, back);
            const reason = String(formValues[0] ?? "").trim() || t("チート使用", "Cheating");
            const durationStr = String(formValues[1] ?? "").trim() || "perm";
            const durationMs = parseDuration(durationStr);
            if (durationMs === undefined) {
                admin.sendMessage(`${currentConfig.System.prefix} ` + t("§c期間の形式が正しくありません", "§cInvalid duration format"));
                return this.showBanModal(admin, target, back);
            }
            this.confirmAndBan(admin, target, reason, durationMs, back);
        });
    }
    static confirmAndBan(admin, target, reason, durationMs, back) {
        const label = durationMs === null ? t("永久", "Permanent") : formatDuration(durationMs);
        new ActionFormData()
            .title(t("§4確認", "§4Confirm"))
            .body(t(`§c${target.name} §rをBANします。\n期間: §f${label}`, `Ban §c${target.name}§r?\nDuration: §f${label}`))
            .button(t("§4§lBANする", "§4§lBAN"))
            .button(t("§lキャンセル", "§lCancel"))
            .show(admin)
            .then(({ canceled, selection }) => {
            if (canceled || selection !== 0)
                return this.show(admin, target, back);
            const kickMsg = currentConfig.Join?.kickMessage ? `\n${currentConfig.Join.kickMessage}` : "";
            ban(target, reason + kickMsg, durationMs, admin.name);
            admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§cBanned ${target.name}.`, `§cBanned ${target.name}.`));
        });
    }
}
