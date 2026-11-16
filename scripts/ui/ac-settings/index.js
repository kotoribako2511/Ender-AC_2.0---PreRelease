import { ActionFormData } from "@minecraft/server-ui";
import { currentConfig } from "../../data/config.js";
import { acSettingButtons } from "../../data/info.js";
import { t } from "../../state.js";
import { backToMain } from "../helpers.js";
import { PunishmentUI } from "./punishment.js";
import { PermissionUI } from "./permission.js";
import { SystemSettingsUI } from "./system.js";
import { MuteSettingsUI } from "./mute.js";
import { TeleportUI } from "./teleport.js";
import { CombatCheckMenus } from "./checks/combat.js";
import { MovementCheckMenus } from "./checks/movement.js";
import { WorldCheckMenus } from "./checks/world.js";
import { ChatCheckMenus } from "./checks/chat.js";
export class ACSettingsUI {
    static getStatusText(mainEnabled, subFlags = []) {
        if (!mainEnabled)
            return t("§cOFF", "§cOFF");
        if (subFlags.length === 0)
            return t("§aON", "§aON");
        const enabledCount = subFlags.filter(Boolean).length;
        if (enabledCount === subFlags.length)
            return t("§a§lON", "§a§lON");
        if (enabledCount === 0)
            return t("§cOFF(part)", "§cOFF(part)");
        return t("§e§lPARTIAL", "§e§lPartially Enabled");
    }
    static showACSettingsMenu(player) {
        const c = currentConfig;
        const punishSummary = PunishmentUI.summarizeAll();
        const menuItems = [
            { name: acSettingButtons.Permission, status: "Owner/Admin", handler: (p) => PermissionUI.show(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.Punishment, status: punishSummary, handler: (p) => PunishmentUI.show(p, () => this.showACSettingsMenu(p)) },
            {
                name: acSettingButtons.System,
                status: this.getStatusText(c.System.autoDeop ?? false),
                handler: (p) => SystemSettingsUI.showSystemMenu(p, () => this.showACSettingsMenu(p)),
            },
            {
                name: acSettingButtons.GameMode,
                status: this.getStatusText(c.System.GMChangeNoticeEnabled ?? true, [c.System.GMConsoleNotice, c.System.GMWorldNotice, c.System.GMStaffNotice ?? false]),
                handler: (p) => SystemSettingsUI.showGameModeChangeMenu(p, () => this.showACSettingsMenu(p)),
            },
            { name: acSettingButtons.Mute, status: this.getStatusText(c.Mute?.enabled ?? false, [c.Mute?.adminCanSee ?? false, c.Mute?.ownerCanSee ?? false]), handler: (p) => MuteSettingsUI.show(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.Teleport, status: this.getStatusText(c.Teleport?.enabled ?? false), handler: (p) => TeleportUI.show(p, () => this.showACSettingsMenu(p), false) },
            { name: acSettingButtons.Reach, status: this.getStatusText(c.Reach.enabled), handler: (p) => CombatCheckMenus.showReachMenu(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.Killaura, status: this.getStatusText(c.Killaura.enabled), handler: (p) => CombatCheckMenus.showKillauraMenu(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.NoSwing, status: this.getStatusText(c.NoSwing.enabled), handler: (p) => CombatCheckMenus.showNoSwingMenu(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.Speed, status: this.getStatusText(c.Speed.enabled), handler: (p) => MovementCheckMenus.showSpeedMenu(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.Fly, status: this.getStatusText(c.Fly.flyA.enabled || c.Fly.flyC.enabled || c.Fly.flyG.enabled, [c.Fly.flyA.enabled, c.Fly.flyC.enabled, c.Fly.flyG.enabled]), handler: (p) => MovementCheckMenus.showFlyMenu(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.AirJump, status: this.getStatusText(c.BDSFly.enabled), handler: (p) => MovementCheckMenus.showBDSFlyMenu(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.Fall, status: this.getStatusText(c.Nofall.NofallEnabled || c.Nofall.OnGroundSpoofEnabled || c.Nofall.slowFallEnabled || (c.FastFall?.enabled ?? false), [c.Nofall.slowFallEnabled, c.Nofall.NofallEnabled, c.Nofall.OnGroundSpoofEnabled, c.FastFall?.enabled ?? false]), handler: (p) => MovementCheckMenus.showNofallMenu(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.Step, status: this.getStatusText(c.Step.enabled), handler: (p) => MovementCheckMenus.showStepMenu(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.NoClip, status: this.getStatusText(c.NoClip.enabled), handler: (p) => MovementCheckMenus.showNoClipMenu(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.Phase, status: this.getStatusText(c.Phase.enabled), handler: (p) => MovementCheckMenus.showPhaseMenu(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.Nuker, status: this.getStatusText(c.Nuker.enabled), handler: (p) => WorldCheckMenus.showNukerMenu(p, () => this.showACSettingsMenu(p)) },
            {
                name: acSettingButtons.Chat,
                status: this.getStatusText(c.Chat.chatLimitEnabled || !!(c.Chat.bannedWords && c.Chat.bannedWords.length > 0), [c.Chat.chatLimitEnabled, !!(c.Chat.bannedWords && c.Chat.bannedWords.length > 0)]),
                handler: (p) => ChatCheckMenus.showChatMenu(p, () => this.showACSettingsMenu(p)),
            },
            { name: acSettingButtons.BlockPlace, status: this.getStatusText(c.BlockPlace.enabled, [c.BlockPlace.resetData, (c.BlockPlace.illegalBlocks?.length > 0), c.BlockPlace.airPlace.enabled, c.BlockPlace.illegalcontainer, c.BlockPlace.illegalPlace]), handler: (p) => WorldCheckMenus.showBlockPlaceMenu(p, () => this.showACSettingsMenu(p)) },
            {
                name: acSettingButtons.IllegalItem,
                status: this.getStatusText(c.IllegalItem.enabled, [
                    c.IllegalItem.checkAmount, c.IllegalItem.checkEnchant, c.IllegalItem.checkName,
                    c.IllegalItem.checkIllegalId && (c.IllegalItem.customItems?.length > 0),
                    c.IllegalItem.checkEntity ?? true,
                ]),
                handler: (p) => WorldCheckMenus.showIllegalItemMenu(p, () => this.showACSettingsMenu(p)),
            },
            { name: acSettingButtons.AutoClicker, status: this.getStatusText(c.cps.enabled), handler: (p) => CombatCheckMenus.showCpsMenu(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.AutoTotem, status: this.getStatusText(c.AutoTotem.enabled), handler: (p) => CombatCheckMenus.showAutoTotemMenu(p, () => this.showACSettingsMenu(p)) },
            {
                name: acSettingButtons.IllegalEntity,
                status: this.getStatusText(c.entity.enabled, [
                    c.entity.noticeEnabled && (c.entity.NoticeEntities?.length > 0),
                    c.entity.limitEnabled ?? false,
                    c.entity.checkInvEnabled ?? true,
                    c.entity.resetData && (c.entity.ResetEntities?.length > 0),
                    (c.entity.IllegalEntities?.length > 0),
                ]),
                handler: (p) => WorldCheckMenus.showEntityMenu(p, () => this.showACSettingsMenu(p)),
            },
            { name: acSettingButtons.SpawnEgg, status: this.getStatusText(c.SpawnEgg.rejection || c.SpawnEgg.notice, [c.SpawnEgg.rejection, c.SpawnEgg.notice, (c.SpawnEgg.illegalEggs?.length > 0)]), handler: (p) => WorldCheckMenus.showSpawnEggMenu(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.AFK, status: this.getStatusText(c.AFK.enabled), handler: (p) => WorldCheckMenus.showAFKMenu(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.InstaBreak, status: this.getStatusText(c.InstaBreak?.enabled ?? false, [c.InstaBreak?.cancel ?? false, (c.InstaBreak?.illegalBlocks?.length > 0)]), handler: (p) => WorldCheckMenus.showInstaBreakMenu(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.NoSlow, status: this.getStatusText(c.NoSlow?.enabled ?? false), handler: (p) => MovementCheckMenus.showNoSlowMenu(p, () => this.showACSettingsMenu(p)) },
            { name: acSettingButtons.AirSwim, status: this.getStatusText(c.AirSwim?.enabled ?? false), handler: (p) => MovementCheckMenus.showAirSwimMenu(p, () => this.showACSettingsMenu(p)) },
            {
                name: acSettingButtons.Scaffold,
                status: this.getStatusText(c.Scaffold?.enabled ?? false, [
                    c.Scaffold?.A ?? false, c.Scaffold?.B ?? false, c.Scaffold?.C ?? false, c.Scaffold?.D ?? false,
                    c.Scaffold?.E ?? false, c.Scaffold?.F ?? false, c.Scaffold?.G ?? false, c.Scaffold?.H ?? false,
                ]),
                handler: (p) => MovementCheckMenus.showScaffoldMenu(p, () => this.showACSettingsMenu(p)),
            },
            {
                name: acSettingButtons.Contradiction,
                status: this.getStatusText(c.Contradiction?.enabled ?? false, [
                    c.Contradiction?.sprintSneak ?? false, c.Contradiction?.groundFall ?? false, c.Contradiction?.fallDecel ?? false,
                ]),
                handler: (p) => MovementCheckMenus.showContradictionMenu(p, () => this.showACSettingsMenu(p)),
            },
        ];
        const action = new ActionFormData()
            .title(t("§lAC 詳細設定", "§lAC Settings"))
            .body(t("設定を変更したい機能を選択してください。\n§7§4Punishment §7から検知ごとの罰則タイプを一括管理できます。", "Select a feature to configure.\n§7Use §4Punishment §7to bulk-manage punishment types per detection."));
        for (const item of menuItems)
            action.button(`§l${item.name} - ${item.status}`);
        action.show(player).then(({ canceled, selection }) => {
            if (canceled || selection === undefined) {
                return backToMain(player);
            }
            menuItems[selection]?.handler(player);
        });
    }
    static showTeleportSettingsMenu(player, backToPlayerManagement = false) {
        TeleportUI.show(player, () => this.showACSettingsMenu(player), backToPlayerManagement);
    }
}
