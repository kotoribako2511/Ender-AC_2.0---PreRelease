import { world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { currentConfig } from "../data/config.js";
import { TPSCalculator } from "../util/util.js";
import { LogManager, PlayerAccessLogManager } from "../log.js";
import { getLanguage, toggleLanguage, t } from "../state.js";
export class MainMenuUI {
    static countEnabledChecks() {
        const c = currentConfig;
        const flags = [
            c.Reach.enabled, c.Killaura.enabled, c.NoSwing.enabled, c.Speed.enabled,
            c.Fly.flyA.enabled, c.Fly.flyC.enabled, c.Fly.flyG.enabled, c.BDSFly.enabled,
            c.Nofall.NofallEnabled, c.Nofall.OnGroundSpoofEnabled, c.Nofall.slowFallEnabled, c.Step.enabled, c.NoClip.enabled, c.Phase.enabled,
            c.Nuker.enabled, c.Chat.chatLimitEnabled, c.BlockPlace.enabled,
            c.IllegalItem.enabled, c.cps.enabled, c.AutoTotem.enabled,
            c.entity.enabled, c.SpawnEgg.rejection || c.SpawnEgg.notice, c.CoreProtect?.enabled, c.AFK.enabled,
            c.InstaBreak.enabled, c.Whitelist?.enabled, c.Join?.enabled, c.Mute?.enabled,
            c.Teleport?.enabled, c.FastFall?.enabled,
            c.NoSlow?.enabled, c.AirSwim?.enabled, c.Contradiction?.enabled, c.Scaffold?.enabled,
        ];
        return { enabled: flags.filter(Boolean).length, total: flags.length };
    }
    static showMainMenu(player) {
        const { enabled, total } = this.countEnabledChecks();
        const tps = TPSCalculator.getTPS();
        const tpsColor = tps >= 18 ? "§a" : tps >= 12 ? "§e" : "§c";
        const langLabel = getLanguage() === "ja"
            ? "§l言語 / Language: §a日本語"
            : "§lLanguage / 言語: §aEnglish";
        new ActionFormData()
            .title(t("§5§l[Ender-AC] §r§lメインメニュー", "§5§l[Ender-AC] §r§lMain Menu"))
            .body(t(`§l§b--- world infomation --- \n` +
            `§r§lサーバーTPS: ${tpsColor}${tps} §7/ 20.0\n` +
            `§r§lプレイヤー人数: §e${world.getPlayers().length}\n` +
            `§r§l日数: §e${world.getDay()}\n` +
            `§r§l有効な検知機能: ${enabled === total ? "§a" : "§e"}${enabled}§7/§f${total}\n` +
            `§l検知ログ: §e${LogManager.logs.length}§7件\n` +
            `§r§lTPSに応じた閾値の自動変更: ${currentConfig.System.dynamicTps ? "§a有効" : "§c無効"}\n\n` +
            `§r操作したい項目を選択してください。\n`, `§l§b--- world information --- \n` +
            `§r§lServer TPS: ${tpsColor}${tps} §7/ 20.0\n` +
            `§r§lPlayers: §e${world.getPlayers().length}\n` +
            `§r§lDay: §e${world.getDay()}\n` +
            `§r§lActive Checks: ${enabled === total ? "§a" : "§e"}${enabled}§7/§f${total}\n` +
            `§lDetection Logs: §e${LogManager.logs.length}\n` +
            `§r§lTPS Dynamic Threshold: ${currentConfig.System.dynamicTps ? "§aON" : "§cOFF"}\n\n` +
            `§rSelect an item to operate.\n`))
            .button(t("§lプレイヤー管理", "§lPlayer Management"), "textures/ui/dressing_room_skins")
            .button(t("§lモブ管理", "§lMob Management"), "textures/ui/icon_llama")
            .button(t("§lAC 詳細設定", "§lAC Settings"), "textures/ui/automation_glyph_color")
            .button(t("§l検知ログ", "§lDetection Log"), "textures/ui/achievements_pause_menu_icon")
            .button(t(`§b§l入出管理 (ログ/設定) §h(${PlayerAccessLogManager.logs.length}件)`, `§b§lJoin Management (Logs/Settings) §h(${PlayerAccessLogManager.logs.length})`), "textures/ui/portalBg")
            .button(t("§lBlockLog (ブロック調査)", "§lBlockLog (Block Inspector)"), "textures/ui/icon_recipe_nature")
            .button(t("§lクイック操作", "§lQuick Actions"), "textures/ui/settings_pause_menu_icon")
            .button(langLabel, "textures/ui/gear")
            .button(t("§l取扱説明書", "§lInstructions"), "textures/ui/icon_book_writable")
            .show(player)
            .then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return;
            const handlers = [
                (p) => import("./player/player.js").then((m) => m.PlayerManagementUI.PlayerCategory(p)).catch(() => { }),
                (p) => import("./mob.js").then((m) => m.MobManagementUI.showMobManagement(p)).catch(() => { }),
                (p) => import("./ac-settings/index.js").then((m) => m.ACSettingsUI.showACSettingsMenu(p)).catch(() => { }),
                (p) => import("./logs.js").then((m) => m.LogUI.showViolationLog(p)).catch(() => { }),
                (p) => import("./join.js").then((m) => m.JoinManagementUI.showJoinMenu(p)).catch(() => { }),
                (p) => import("./coreprotect.js").then((m) => m.CoreProtectUI.showMenu(p)).catch(() => { }),
                (p) => import("./system.js").then((m) => m.SystemUI.showQuickActions(p)).catch(() => { }),
                (p) => this.toggleLang(p),
                (p) => import("./manual.js").then((m) => m.ManualUI.showManual(p)).catch(() => { }),
            ];
            handlers[selection]?.(player);
        });
    }
    static toggleLang(player) {
        const next = toggleLanguage();
        player.sendMessage(`${currentConfig.System.prefix} ` + (next === "ja"
            ? "§a言語を §a§l日本語 §aに変更しました。"
            : "§aLanguage changed to §a§lEnglish§a."));
        this.showMainMenu(player);
    }
}
