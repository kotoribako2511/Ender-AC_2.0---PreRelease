import { ActionFormData } from "@minecraft/server-ui";
import { currentConfig, ConfigManager } from "../data/config.js";
import { DefaultConfig } from "../data/lists/index.js";
import { getLanguage, t } from "../state.js";
import { confirm } from "./helpers.js";
export class SystemUI {
    static showQuickActions(player) {
        const isDynamic = currentConfig.System.dynamicTps;
        const dynamicLabel = isDynamic
            ? t("§lTPS自動緩和: §a有効", "§lTPS Auto Relax: §aON")
            : t("§lTPS自動緩和: §c無効", "§lTPS Auto Relax: §cOFF");
        new ActionFormData()
            .title(t("§5§l[Ender-AC] §r§lクイック操作", "§5§l[Ender-AC] §r§lQuick Actions"))
            .body(t("よく使う操作をワンタップで実行できます。", "Frequently used operations in one tap."))
            .button(t("§a§l全チェックを有効化", "§a§lEnable All Checks"))
            .button(t("§c§l全チェックを無効化", "§c§lDisable All Checks"))
            .button(`${dynamicLabel}\n§r${t("(TPS低下時に自動で誤検知を防止)", "(Prevents false positives on low TPS)")}`)
            .button(t("§4§l設定を初期化", "§4§lReset Config"))
            .show(player)
            .then(({ canceled, selection }) => {
            if (canceled || selection === undefined) {
                return import("./main-menu.js").then((m) => m.MainMenuUI.showMainMenu(player)).catch(() => { });
            }
            switch (selection) {
                case 0: return this.applyEnabledAll(player, true);
                case 1: return this.applyEnabledAll(player, false);
                case 2: return this.toggleDynamicTps(player);
                case 3: return this.confirmResetConfig(player);
            }
        });
    }
    static toggleDynamicTps(player) {
        const c = currentConfig;
        const next = !c.System.dynamicTps;
        ConfigManager.saveConfig({ ...c, System: { ...c.System, dynamicTps: next } });
        player.sendMessage(`${currentConfig.System.prefix} ` + (getLanguage() === "ja"
            ? `§aTPS連動自動緩和を ${next ? "§a§l有効" : "§c§l無効"} §aに変更しました。`
            : `§aTPS Auto Relax set to ${next ? "§a§lON" : "§c§lOFF"}§a.`));
        this.showQuickActions(player);
    }
    static applyEnabledAll(player, value) {
        const c = currentConfig;
        ConfigManager.saveConfig({
            ...c,
            Chat: { ...c.Chat, chatLimitEnabled: value },
            Mute: { ...c.Mute, enabled: value },
            Teleport: { ...c.Teleport, enabled: value },
            Reach: { ...c.Reach, enabled: value },
            Killaura: { ...c.Killaura, enabled: value },
            NoSwing: { ...c.NoSwing, enabled: value },
            Speed: { ...c.Speed, enabled: value },
            Fly: {
                ...c.Fly,
                flyA: { ...c.Fly.flyA, enabled: value },
                flyC: { ...c.Fly.flyC, enabled: value },
                flyG: { ...c.Fly.flyG, enabled: value },
            },
            BDSFly: { ...c.BDSFly, enabled: value },
            Nofall: { ...c.Nofall, NofallEnabled: value, slowFallEnabled: value, OnGroundSpoofEnabled: value },
            Step: { ...c.Step, enabled: value },
            NoClip: { ...c.NoClip, enabled: value },
            Phase: { ...c.Phase, enabled: value },
            FastFall: { ...c.FastFall, enabled: value },
            NoSlow: { ...c.NoSlow, enabled: value },
            AirSwim: { ...c.AirSwim, enabled: value },
            Contradiction: { ...c.Contradiction, enabled: value, sprintSneak: value, groundFall: value, fallDecel: value },
            InstaBreak: { ...c.InstaBreak, enabled: value, cancel: value },
            Scaffold: { ...c.Scaffold, enabled: value, A: value, B: value, C: value, D: value, E: value, F: value, G: value, H: value },
            Nuker: { ...c.Nuker, enabled: value },
            BlockPlace: { ...c.BlockPlace, enabled: value, illegalPlace: value, resetData: value, illegalcontainer: value },
            IllegalItem: { ...c.IllegalItem, enabled: value, checkAmount: value, checkEnchant: value, checkName: value, checkIllegalId: value, checkEntity: value },
            cps: { ...c.cps, enabled: value },
            AutoTotem: { ...c.AutoTotem, enabled: value },
            entity: { ...c.entity, enabled: value, checkInvEnabled: value, resetData: value, noticeEnabled: value, limitEnabled: value },
            SpawnEgg: { ...c.SpawnEgg, rejection: value, notice: value },
            CoreProtect: { ...c.CoreProtect, enabled: value },
            AFK: { ...c.AFK, enabled: value },
            Whitelist: { ...c.Whitelist, enabled: value },
            Join: { ...c.Join, enabled: value },
        });
        player.sendMessage(`${currentConfig.System.prefix} ` + (getLanguage() === "ja"
            ? `§a全チェックを${value ? "有効" : "無効"}にしました。`
            : `§aAll checks ${value ? "enabled" : "disabled"}.`));
        this.showQuickActions(player);
    }
    static confirmResetConfig(player) {
        confirm(player, {
            title: t("§4§l設定の初期化", "§4§lReset Config"),
            body: t("すべての設定をデフォルトに戻します。", "All settings will be restored to defaults."),
            yes: t("§4§lはい、初期化する", "§4§lYes, reset"),
        }).then((ok) => {
            if (!ok)
                return this.showQuickActions(player);
            ConfigManager.saveConfig(JSON.parse(JSON.stringify(DefaultConfig)));
            player.sendMessage(`${currentConfig.System.prefix} ` + t("§a設定をデフォルトに初期化しました。", "§aConfig reset to defaults."));
            this.showQuickActions(player);
        });
    }
}
