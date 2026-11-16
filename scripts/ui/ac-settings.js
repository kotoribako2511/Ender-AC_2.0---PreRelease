import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { currentConfig, ConfigManager, patchConfig } from "../data/config.js";
import { TPSCalculator } from "../util/util.js";
import { acSettingButtons } from "../data/info.js";
import { ALL_DETECTION_TYPES, DETECTION_LABELS } from "../permission.js";
import { isDebugMode, setDebugMode, t } from "../state.js";
import { PlayerManagementUI } from "./player/player.js";
import { backToMain, addListEditFields, parseListEdit, saveAndBack } from "./helpers.js";
import { notify } from "../util/notify.js";
const PUNISHMENT_OPTIONS = [
    "notify", "none", "setback", "freeze", "freeze_setback", "kick", "tempkick", "ban"
];
function punishmentColor(p) {
    switch (p) {
        case "notify": return "§e";
        case "none": return "§7";
        case "setback": return "§b";
        case "freeze": return "§6";
        case "freeze_setback": return "§6";
        case "kick": return "§c";
        case "tempkick": return "§c";
        case "ban": return "§4";
    }
}
function punishmentLabel(p) {
    switch (p) {
        case "notify": return t("通知のみ", "Notify Only");
        case "none": return t("無効", "None");
        case "setback": return t("位置巻き戻し", "Setback");
        case "freeze": return t("フリーズ", "Freeze");
        case "freeze_setback": return t("フリーズ＋巻き戻し", "Freeze+Setback");
        case "kick": return t("キック", "Kick");
        case "tempkick": return t("一時BAN", "TempBan");
        case "ban": return t("永久BAN", "Perma BAN");
    }
}
function punishmentDescription(p) {
    switch (p) {
        case "notify": return t("スタッフへの通知のみ", "Notify staff only");
        case "none": return t("何もしない", "Do nothing");
        case "setback": return t("直前の安全地点に戻す", "Rollback to last safe position");
        case "freeze": return t("一定時間移動を封じる", "Freeze movement");
        case "freeze_setback": return t("フリーズ + 位置巻き戻し", "Freeze + rollback");
        case "kick": return t("即座にキック", "Immediate kick");
        case "tempkick": return t("指定秒数の一時BAN", "Temp ban with duration");
        case "ban": return t("永久BAN", "Permanent ban");
    }
}
function buildPunishmentCategories() {
    const c = currentConfig;
    const movement = [
        { label: "Fly A", get: () => ({ p: c.Fly.flyAPunishment, t: c.Fly.flyATempkickSeconds }), set: (p, tt) => { c.Fly.flyAPunishment = p; c.Fly.flyATempkickSeconds = tt; } },
        { label: "Fly C", get: () => ({ p: c.Fly.flyCPunishment, t: c.Fly.flyCTempkickSeconds }), set: (p, tt) => { c.Fly.flyCPunishment = p; c.Fly.flyCTempkickSeconds = tt; } },
        { label: "Fly G", get: () => ({ p: c.Fly.flyGPunishment, t: c.Fly.flyGTempkickSeconds }), set: (p, tt) => { c.Fly.flyGPunishment = p; c.Fly.flyGTempkickSeconds = tt; } },
        { label: "AirJump (BDSFly)", get: () => ({ p: c.BDSFly.punishment, t: c.BDSFly.tempkickSeconds }), set: (p, tt) => { c.BDSFly.punishment = p; c.BDSFly.tempkickSeconds = tt; } },
        { label: "Speed", get: () => ({ p: c.Speed.punishment, t: c.Speed.tempkickSeconds }), set: (p, tt) => { c.Speed.punishment = p; c.Speed.tempkickSeconds = tt; } },
        { label: "Scaffold", get: () => ({ p: c.Scaffold.punishment, t: c.Scaffold.tempkickSeconds }), set: (p, tt) => { c.Scaffold.punishment = p; c.Scaffold.tempkickSeconds = tt; } },
        { label: "Nofall A-beta", get: () => ({ p: c.Nofall.aBetaPunishment, t: c.Nofall.aBetaTempkickSeconds }), set: (p, tt) => { c.Nofall.aBetaPunishment = p; c.Nofall.aBetaTempkickSeconds = tt; } },
        { label: "Nofall OnGroundSpoof", get: () => ({ p: c.Nofall.onGroSpfPunishment, t: c.Nofall.onGroSpfTempkickSeconds }), set: (p, tt) => { c.Nofall.onGroSpfPunishment = p; c.Nofall.onGroSpfTempkickSeconds = tt; } },
        { label: "Nofall SlowFall", get: () => ({ p: c.Nofall.slowFallPunishment, t: c.Nofall.slowFallTempkickSeconds }), set: (p, tt) => { c.Nofall.slowFallPunishment = p; c.Nofall.slowFallTempkickSeconds = tt; } },
        { label: "Step", get: () => ({ p: c.Step.punishment, t: c.Step.tempkickSeconds }), set: (p, tt) => { c.Step.punishment = p; c.Step.tempkickSeconds = tt; } },
        { label: "NoClip", get: () => ({ p: c.NoClip.punishment, t: c.NoClip.tempkickSeconds }), set: (p, tt) => { c.NoClip.punishment = p; c.NoClip.tempkickSeconds = tt; } },
        { label: "Phase", get: () => ({ p: c.Phase.punishment, t: c.Phase.tempkickSeconds }), set: (p, tt) => { c.Phase.punishment = p; c.Phase.tempkickSeconds = tt; } },
        { label: "FastFall", get: () => ({ p: c.FastFall.punishment, t: c.FastFall.tempkickSeconds }), set: (p, tt) => { c.FastFall.punishment = p; c.FastFall.tempkickSeconds = tt; } },
        { label: "NoSlow", get: () => ({ p: c.NoSlow.punishment, t: c.NoSlow.tempkickSeconds }), set: (p, tt) => { c.NoSlow.punishment = p; c.NoSlow.tempkickSeconds = tt; } },
        { label: "AirSwim", get: () => ({ p: c.AirSwim.punishment, t: c.AirSwim.tempkickSeconds }), set: (p, tt) => { c.AirSwim.punishment = p; c.AirSwim.tempkickSeconds = tt; } },
        { label: "Contradiction SprintSneak", get: () => ({ p: c.Contradiction.sprintSneakPunishment, t: c.Contradiction.sprintSneakTempkickSeconds }), set: (p, tt) => { c.Contradiction.sprintSneakPunishment = p; c.Contradiction.sprintSneakTempkickSeconds = tt; } },
        { label: "Contradiction GroundFall", get: () => ({ p: c.Contradiction.groundFallPunishment, t: c.Contradiction.groundFallTempkickSeconds }), set: (p, tt) => { c.Contradiction.groundFallPunishment = p; c.Contradiction.groundFallTempkickSeconds = tt; } },
        { label: "Contradiction FallDecel", get: () => ({ p: c.Contradiction.fallDecelPunishment, t: c.Contradiction.fallDecelTempkickSeconds }), set: (p, tt) => { c.Contradiction.fallDecelPunishment = p; c.Contradiction.fallDecelTempkickSeconds = tt; } },
    ];
    const combat = [
        { label: "Reach Hit", get: () => ({ p: c.Reach.hitPunishment, t: c.Reach.hitTempkickSeconds }), set: (p, tt) => { c.Reach.hitPunishment = p; c.Reach.hitTempkickSeconds = tt; } },
        { label: "Reach Break", get: () => ({ p: c.Reach.breakPunishment, t: c.Reach.breakTempkickSeconds }), set: (p, tt) => { c.Reach.breakPunishment = p; c.Reach.breakTempkickSeconds = tt; } },
        { label: "Reach Place", get: () => ({ p: c.Reach.placePunishment, t: c.Reach.placeTempkickSeconds }), set: (p, tt) => { c.Reach.placePunishment = p; c.Reach.placeTempkickSeconds = tt; } },
        { label: "Killaura Sleep", get: () => ({ p: c.Killaura.sleepPunishment, t: c.Killaura.sleepTempkickSeconds }), set: (p, tt) => { c.Killaura.sleepPunishment = p; c.Killaura.sleepTempkickSeconds = tt; } },
        { label: "Killaura MultiHit", get: () => ({ p: c.Killaura.multiHitPunishment, t: c.Killaura.multiHitTempkickSeconds }), set: (p, tt) => { c.Killaura.multiHitPunishment = p; c.Killaura.multiHitTempkickSeconds = tt; } },
        { label: "NoSwing Hit", get: () => ({ p: c.NoSwing.hitPunishment, t: c.NoSwing.hitTempkickSeconds }), set: (p, tt) => { c.NoSwing.hitPunishment = p; c.NoSwing.hitTempkickSeconds = tt; } },
        { label: "NoSwing Break", get: () => ({ p: c.NoSwing.breakPunishment, t: c.NoSwing.breakTempkickSeconds }), set: (p, tt) => { c.NoSwing.breakPunishment = p; c.NoSwing.breakTempkickSeconds = tt; } },
        { label: "NoSwing Place", get: () => ({ p: c.NoSwing.placePunishment, t: c.NoSwing.placeTempkickSeconds }), set: (p, tt) => { c.NoSwing.placePunishment = p; c.NoSwing.placeTempkickSeconds = tt; } },
        { label: "AutoClicker (CPS)", get: () => ({ p: c.cps.punishment, t: c.cps.tempkickSeconds }), set: (p, tt) => { c.cps.punishment = p; c.cps.tempkickSeconds = tt; } },
    ];
    const world = [
        { label: "Nuker", get: () => ({ p: c.Nuker.punishment, t: c.Nuker.tempkickSeconds }), set: (p, tt) => { c.Nuker.punishment = p; c.Nuker.tempkickSeconds = tt; } },
        { label: "InstaBreak", get: () => ({ p: c.InstaBreak.punishment, t: c.InstaBreak.tempkickSeconds }), set: (p, tt) => { c.InstaBreak.punishment = p; c.InstaBreak.tempkickSeconds = tt; } },
    ];
    return [
        { name: t("§b§lMovement 系", "§b§lMovement"), items: movement },
        { name: t("§c§lCombat 系", "§c§lCombat"), items: combat },
        { name: t("§e§lWorld 系", "§e§lWorld"), items: world },
    ];
}
function summarize(categories) {
    const counts = {};
    for (const cat of categories) {
        for (const item of cat.items) {
            const p = item.get().p;
            counts[p] = (counts[p] ?? 0) + 1;
        }
    }
    const parts = [];
    for (const opt of PUNISHMENT_OPTIONS) {
        const n = counts[opt];
        if (!n)
            continue;
        parts.push(`${punishmentColor(opt)}${punishmentLabel(opt)}:§f${n}`);
    }
    return parts.join(" §7| ");
}
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
        const punishSummary = summarize(buildPunishmentCategories());
        const menuItems = [
            { name: "§6§lPermission", status: "Owner/Admin", handler: (p) => this.showPermissionBypassMenu(p) },
            { name: "§4§lPunishment", status: punishSummary, handler: (p) => this.showPunishmentMenu(p) },
            {
                name: "System",
                status: this.getStatusText(c.System.autoDeop ?? false),
                handler: (p) => this.showSystemMenu(p),
            },
            {
                name: t("GameMode", "GameMode"),
                status: this.getStatusText(c.System.GMChangeNoticeEnabled ?? true, [c.System.GMConsoleNotice, c.System.GMWorldNotice, c.System.GMStaffNotice ?? false]),
                handler: (p) => this.showGameModeChangeMenu(p),
            },
            { name: t("Mute", "Mute"), status: this.getStatusText(c.Mute?.enabled ?? false, [c.Mute?.adminCanSee ?? false, c.Mute?.ownerCanSee ?? false]), handler: (p) => this.showMuteSettingsMenu(p) },
            { name: t("Teleport", "Teleport"), status: this.getStatusText(c.Teleport?.enabled ?? false), handler: (p) => this.showTeleportSettingsMenu(p, false) },
            { name: acSettingButtons.Reach, status: this.getStatusText(c.Reach.enabled), handler: (p) => this.showReachMenu(p) },
            { name: acSettingButtons.Killaura, status: this.getStatusText(c.Killaura.enabled), handler: (p) => this.showKillauraMenu(p) },
            { name: acSettingButtons.NoSwing, status: this.getStatusText(c.NoSwing.enabled), handler: (p) => this.showNoSwingMenu(p) },
            { name: acSettingButtons.Speed, status: this.getStatusText(c.Speed.enabled), handler: (p) => this.showSpeedMenu(p) },
            { name: acSettingButtons.Fly, status: this.getStatusText(c.Fly.flyAEnabled || c.Fly.flyCEnabled || c.Fly.flyGEnabled, [c.Fly.flyAEnabled, c.Fly.flyCEnabled, c.Fly.flyGEnabled]), handler: (p) => this.showFlyMenu(p) },
            { name: acSettingButtons.AirJump, status: this.getStatusText(c.BDSFly.enabled), handler: (p) => this.showBDSFlyMenu(p) },
            { name: acSettingButtons.Fall, status: this.getStatusText(c.Nofall.NofallEnabled || c.Nofall.OnGroundSpoofEnabled || c.Nofall.slowFallEnabled || (c.FastFall?.enabled ?? false), [c.Nofall.slowFallEnabled, c.Nofall.NofallEnabled, c.Nofall.OnGroundSpoofEnabled, c.FastFall?.enabled ?? false]), handler: (p) => this.showNofallMenu(p) },
            { name: acSettingButtons.Step, status: this.getStatusText(c.Step.enabled), handler: (p) => this.showStepMenu(p) },
            { name: acSettingButtons.NoClip, status: this.getStatusText(c.NoClip.enabled), handler: (p) => this.showNoClipMenu(p) },
            { name: acSettingButtons.Phase, status: this.getStatusText(c.Phase.enabled), handler: (p) => this.showPhaseMenu(p) },
            { name: acSettingButtons.Nuker, status: this.getStatusText(c.Nuker.enabled), handler: (p) => this.showNukerMenu(p) },
            {
                name: acSettingButtons.Chat,
                status: this.getStatusText(c.Chat.chatLimitEnabled || !!(c.Chat.bannedWords && c.Chat.bannedWords.length > 0), [c.Chat.chatLimitEnabled, !!(c.Chat.bannedWords && c.Chat.bannedWords.length > 0)]),
                handler: (p) => this.showChatMenu(p),
            },
            { name: acSettingButtons.BlockPlace, status: this.getStatusText(c.BlockPlace.enabled, [c.BlockPlace.resetData, (c.BlockPlace.illegalBlocks?.length > 0), c.BlockPlace.illegalcontainer, c.BlockPlace.illegalPlace]), handler: (p) => this.showBlockPlaceMenu(p) },
            {
                name: acSettingButtons.IllegalItem,
                status: this.getStatusText(c.IllegalItem.enabled, [
                    c.IllegalItem.checkAmount, c.IllegalItem.checkEnchant, c.IllegalItem.checkName,
                    c.IllegalItem.checkIllegalId && (c.IllegalItem.customItems?.length > 0),
                    c.IllegalItem.checkEntity ?? true,
                ]),
                handler: (p) => this.showIllegalItemMenu(p),
            },
            { name: acSettingButtons.AutoClicker, status: this.getStatusText(c.cps.enabled), handler: (p) => this.showCpsMenu(p) },
            { name: acSettingButtons.AutoTotem, status: this.getStatusText(c.AutoTotem.enabled), handler: (p) => this.showAutoTotemMenu(p) },
            {
                name: acSettingButtons.IllegalEntity,
                status: this.getStatusText(c.entity.enabled, [
                    c.entity.noticeEnabled && (c.entity.NoticeEntities?.length > 0),
                    c.entity.limitEnabled ?? false,
                    c.entity.checkInvEnabled ?? true,
                    c.entity.resetData && (c.entity.ResetEntities?.length > 0),
                    (c.entity.IllegalEntities?.length > 0),
                ]),
                handler: (p) => this.showEntityMenu(p),
            },
            { name: acSettingButtons.SpawnEgg, status: this.getStatusText(c.SpawnEgg.rejection || c.SpawnEgg.notice, [c.SpawnEgg.rejection, c.SpawnEgg.notice, (c.SpawnEgg.illegalEggs?.length > 0)]), handler: (p) => this.showSpawnEggMenu(p) },
            { name: acSettingButtons.AFK, status: this.getStatusText(c.AFK.enabled), handler: (p) => this.showAFKMenu(p) },
            { name: acSettingButtons.InstaBreak, status: this.getStatusText(c.InstaBreak?.enabled ?? false, [c.InstaBreak?.cancel ?? false, (c.InstaBreak?.illegalBlocks?.length > 0)]), handler: (p) => this.showInstaBreakMenu(p) },
            { name: acSettingButtons.NoSlow, status: this.getStatusText(c.NoSlow?.enabled ?? false), handler: (p) => this.showNoSlowMenu(p) },
            { name: acSettingButtons.AirSwim, status: this.getStatusText(c.AirSwim?.enabled ?? false), handler: (p) => this.showAirSwimMenu(p) },
            {
                name: acSettingButtons.Scaffold,
                status: this.getStatusText(c.Scaffold?.enabled ?? false, [
                    c.Scaffold?.A ?? false, c.Scaffold?.B ?? false, c.Scaffold?.C ?? false, c.Scaffold?.D ?? false,
                    c.Scaffold?.E ?? false, c.Scaffold?.F ?? false, c.Scaffold?.G ?? false, c.Scaffold?.H ?? false,
                ]),
                handler: (p) => this.showScaffoldMenu(p),
            },
            {
                name: acSettingButtons.Contradiction,
                status: this.getStatusText(c.Contradiction?.enabled ?? false, [
                    c.Contradiction?.sprintSneak ?? false, c.Contradiction?.groundFall ?? false, c.Contradiction?.fallDecel ?? false,
                ]),
                handler: (p) => this.showContradictionMenu(p),
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
    static showPunishmentMenu(player) {
        const categories = buildPunishmentCategories();
        const summary = summarize(categories);
        const total = categories.reduce((n, c) => n + c.items.length, 0);
        const form = new ActionFormData()
            .title(t("§4§lPunishment 設定", "§4§lPunishment Config"))
            .body(t(`§l§b--- 現在の罰則分布 ---\n` +
            `${summary}\n\n` +
            `§7総検知数: §e${total}§7 項目\n` +
            `§7カテゴリを選択して個別編集するか、\n` +
            `§7プリセットから一括適用できます。\n\n` +
            `§l§b--- プリセット ---\n` +
            `§a推奨§7: 誤検知に配慮した安全寄り設定\n` +
            `§e全て通知のみ§7: 全検知を通知のみに\n` +
            `§c全てキック§7: 全検知を即キックに\n` +
            `§4全て一時BAN(30s)§7: 全検知を30秒BANに`, `§l§b--- Current Punishment Distribution ---\n` +
            `${summary}\n\n` +
            `§7Total: §e${total}§7 entries\n` +
            `§7Choose a category for individual editing,\n` +
            `§7or use a preset for bulk apply.\n\n` +
            `§l§b--- Presets ---\n` +
            `§aRecommended§7: Safe settings for false positives\n` +
            `§eAll Notify§7: Set every detection to notify\n` +
            `§cAll Kick§7: Set every detection to kick\n` +
            `§4All TempBan (30s)§7: Set every detection to 30s ban`));
        for (const cat of categories) {
            form.button(`§l${cat.name} §7(${cat.items.length})`);
        }
        form.button(t("§a§l推奨設定を適用", "§a§lApply Recommended"));
        form.button(t("§e§l全て通知のみ", "§e§lAll Notify"));
        form.button(t("§c§l全てキック", "§c§lAll Kick"));
        form.button(t("§4§l全て一時BAN(30s)", "§4§lAll TempBan (30s)"));
        form.button(t("§l戻る", "§lBack"));
        form.show(player).then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return this.showACSettingsMenu(player);
            const catCount = categories.length;
            if (selection < catCount)
                return this.showPunishmentCategoryMenu(player, categories[selection]);
            if (selection === catCount)
                return this.showPresetConfirm(player, "recommended");
            if (selection === catCount + 1)
                return this.showPresetConfirm(player, "all-notify");
            if (selection === catCount + 2)
                return this.showPresetConfirm(player, "all-kick");
            if (selection === catCount + 3)
                return this.showPresetConfirm(player, "all-tempban");
            return this.showACSettingsMenu(player);
        });
    }
    static showPresetConfirm(player, preset) {
        const labels = {
            "recommended": t("§a§l推奨設定", "§a§lRecommended"),
            "all-notify": t("§e§l全て通知のみ", "§e§lAll Notify"),
            "all-kick": t("§c§l全てキック", "§c§lAll Kick"),
            "all-tempban": t("§4§l全て一時BAN(30s)", "§4§lAll TempBan (30s)"),
        };
        const total = buildPunishmentCategories().reduce((n, c) => n + c.items.length, 0);
        const descriptions = {
            "recommended": t("§7誤検知のリスクを抑えたバランス設定です。\n§7Fly/Speed/Scaffoldなど明確なものは巻き戻し、\n§7Reach/Nofallなど誤検知しやすいものは通知のみにします。", "§7Balanced settings with false-positive safety.\n§7Obvious cheats get setback, ambiguous ones notify only."),
            "all-notify": t(`§7全${total}件の検知を「通知のみ」に変更します。\n§7検知テスト時や初回導入時に推奨。`, `§7Set all ${total} detections to Notify Only.\n§7Useful for testing.`),
            "all-kick": t(`§7全${total}件の検知を「即キック」に変更します。\n§c誤検知時はプレイヤーが切断されます。`, `§7Set all ${total} detections to Kick.\n§cFalse positives will disconnect players.`),
            "all-tempban": t(`§7全${total}件の検知を「30秒の一時BAN」に変更します。\n§4即座にキック＋30秒間の再入室拒否。`, `§7Set all ${total} detections to 30s TempBan.\n§4Immediate kick + 30s rejoin block.`),
        };
        new ActionFormData()
            .title(labels[preset])
            .body(`${descriptions[preset]}\n\n§l§c本当に適用しますか？`)
            .button(t("§a§l適用する", "§a§lApply"))
            .button(t("§lキャンセル", "§lCancel"))
            .show(player).then(({ canceled, selection }) => {
            if (canceled || selection !== 0)
                return this.showPunishmentMenu(player);
            const count = this.applyPreset(preset);
            ConfigManager.saveConfig(currentConfig);
            notify(player, `§a${count}件の検知に §l${labels[preset]}§a を適用しました。`);
            this.showPunishmentMenu(player);
        });
    }
    static applyPreset(preset) {
        const cats = buildPunishmentCategories();
        let count = 0;
        const recommendedSafe = new Set([
            "Fly A", "Fly C", "Fly G", "AirJump (BDSFly)", "Speed", "Scaffold",
            "Nofall OnGroundSpoof", "Step", "NoClip", "FastFall", "NoSlow", "AirSwim",
            "Nuker",
        ]);
        const recommendedNotify = new Set([
            "Nofall A-beta", "Nofall SlowFall", "Phase",
            "Contradiction SprintSneak", "Contradiction GroundFall", "Contradiction FallDecel",
            "Reach Hit", "Reach Break", "Reach Place",
            "Killaura Sleep", "Killaura MultiHit",
            "NoSwing Hit", "NoSwing Break", "NoSwing Place", "AutoClicker (CPS)", "InstaBreak",
        ]);
        for (const cat of cats) {
            for (const item of cat.items) {
                if (preset === "all-notify")
                    item.set("notify", item.get().t);
                else if (preset === "all-kick")
                    item.set("kick", item.get().t);
                else if (preset === "all-tempban")
                    item.set("tempkick", 30);
                else if (preset === "recommended") {
                    if (recommendedSafe.has(item.label))
                        item.set("freeze_setback", item.get().t);
                    else if (recommendedNotify.has(item.label))
                        item.set("notify", item.get().t);
                }
                count++;
            }
        }
        return count;
    }
    static showPunishmentCategoryMenu(player, category) {
        const form = new ActionFormData()
            .title(category.name)
            .body(t(`§7このカテゴリには §e${category.items.length}§7 件の検知があります。\n` +
            `§7タップすると罰則タイプを即変更できます。\n\n` +
            `§7§8変更は選択した瞬間に保存されます。`, `§7This category has §e${category.items.length}§7 detections.\n` +
            `§7Tap any entry to change its punishment.\n\n` +
            `§7§8Changes are saved immediately.`));
        for (const item of category.items) {
            const cur = item.get();
            const color = punishmentColor(cur.p);
            const suffix = cur.p === "tempkick" ? ` §8(${cur.t}s)` : "";
            form.button(`§l${item.label}\n${color}${punishmentLabel(cur.p)}${suffix}`);
        }
        form.button(t("§6§lこのカテゴリ全てに同じ罰則を適用", "§6§lApply to Entire Category"));
        form.button(t("§l戻る", "§lBack"));
        form.show(player).then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return this.showPunishmentMenu(player);
            if (selection === category.items.length)
                return this.showCategoryBulkApply(player, category);
            if (selection === category.items.length + 1)
                return this.showPunishmentMenu(player);
            this.showQuickPunishmentSelect(player, category, category.items[selection]);
        });
    }
    static showQuickPunishmentSelect(player, category, item) {
        const cur = item.get();
        const form = new ActionFormData()
            .title(`§l${item.label}`)
            .body(t(`§7現在の罰則: ${punishmentColor(cur.p)}§l${punishmentLabel(cur.p)}§r${cur.p === "tempkick" ? ` §7(§e${cur.t}s§7)` : ""}\n\n` +
            `§7適用したい罰則タイプをタップしてください。\n` +
            `§8タップした瞬間に保存されます。`, `§7Current: ${punishmentColor(cur.p)}§l${punishmentLabel(cur.p)}§r${cur.p === "tempkick" ? ` §7(§e${cur.t}s§7)` : ""}\n\n` +
            `§7Tap a punishment type to apply.\n` +
            `§8Saved immediately on tap.`));
        for (const opt of PUNISHMENT_OPTIONS) {
            const isCurrent = opt === cur.p;
            const mark = isCurrent ? "§a▶ " : "§8  ";
            const color = punishmentColor(opt);
            form.button(`${mark}§l${color}${punishmentLabel(opt)}\n§8${punishmentDescription(opt)}`);
        }
        form.button(`§b§l秒数を変更 §8(現在: ${cur.t}s)`);
        form.button(t("§l戻る", "§lBack"));
        form.show(player).then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return this.showPunishmentCategoryMenu(player, category);
            if (selection === PUNISHMENT_OPTIONS.length)
                return this.showTempkickSecondsEditor(player, category, item);
            if (selection === PUNISHMENT_OPTIONS.length + 1)
                return this.showPunishmentCategoryMenu(player, category);
            const newP = PUNISHMENT_OPTIONS[selection];
            item.set(newP, cur.t);
            ConfigManager.saveConfig(currentConfig);
            notify(player, `§a${item.label} → ${punishmentColor(newP)}${punishmentLabel(newP)}`);
            this.showQuickPunishmentSelect(player, category, item);
        });
    }
    static showTempkickSecondsEditor(player, category, item) {
        const cur = item.get();
        new ModalFormData()
            .title(t(`§l${item.label} - 秒数設定`, `§l${item.label} - Seconds`))
            .textField(t("一時BAN秒数 (1〜86400)", "TempBan Seconds (1-86400)"), "30", { defaultValue: String(cur.t) })
            .show(player).then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showQuickPunishmentSelect(player, category, item);
            const sec = Math.min(86400, Math.max(1, Number(formValues[0]) || 30));
            item.set(cur.p, sec);
            ConfigManager.saveConfig(currentConfig);
            notify(player, `§a${item.label}: §e${sec}秒`);
            this.showQuickPunishmentSelect(player, category, item);
        });
    }
    static showCategoryBulkApply(player, category) {
        const form = new ActionFormData()
            .title(t(`§l一括適用: ${category.name}`, `§lBulk Apply: ${category.name}`))
            .body(t(`§7${category.name} §7の §e${category.items.length}§7 件全てに\n` +
            `§7同じ罰則を適用します。\n\n` +
            `§l適用する罰則を選択してください。`, `§7Apply the same punishment to all §e${category.items.length}§7\n` +
            `§7entries in ${category.name}.\n\n` +
            `§lSelect a punishment to apply.`));
        for (const opt of PUNISHMENT_OPTIONS) {
            const color = punishmentColor(opt);
            form.button(`§l${color}${punishmentLabel(opt)}\n§8${punishmentDescription(opt)}`);
        }
        form.button(t("§l戻る", "§lBack"));
        form.show(player).then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return this.showPunishmentCategoryMenu(player, category);
            if (selection === PUNISHMENT_OPTIONS.length)
                return this.showPunishmentCategoryMenu(player, category);
            const p = PUNISHMENT_OPTIONS[selection];
            let count = 0;
            for (const item of category.items) {
                item.set(p, item.get().t);
                count++;
            }
            ConfigManager.saveConfig(currentConfig);
            notify(player, `§a${count}件に ${punishmentColor(p)}${punishmentLabel(p)} §aを適用しました。`);
            this.showPunishmentCategoryMenu(player, category);
        });
    }
    static showMuteSettingsMenu(player) {
        const m = currentConfig.Mute;
        new ModalFormData()
            .title(t("§lMute 設定", "§lMute Settings"))
            .toggle(t("ミュート機能を有効化", "Enable mute feature"), { defaultValue: m.enabled })
            .toggle(t("Admin はミュートチャットを閲覧可能", "Admin can see muted chat"), { defaultValue: m.adminCanSee })
            .toggle(t("Owner はミュートチャットを閲覧可能", "Owner can see muted chat"), { defaultValue: m.ownerCanSee })
            .toggle(t("スタッフに通知する", "Notify staff"), { defaultValue: m.notifyToStaff })
            .textField(t("ミュート時のメッセージ", "Mute message"), "§cYou are muted.", { defaultValue: m.muteMessage })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            const [enabled, adminCanSee, ownerCanSee, notifyToStaff, muteMessage] = formValues;
            patchConfig("Mute", {
                enabled: Boolean(enabled),
                adminCanSee: Boolean(adminCanSee),
                ownerCanSee: Boolean(ownerCanSee),
                notifyToStaff: Boolean(notifyToStaff),
                muteMessage: String(muteMessage ?? "§cYou are muted."),
            });
            saveAndBack(player, "§aMute設定を保存しました。", "§aMute settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showTeleportSettingsMenu(player, backToPlayerManagement = false) {
        const tp = currentConfig.Teleport ?? { enabled: false, speedMultiplier: 3.0, minimumDistance: 5.0, safeZones: [] };
        const goBack = () => backToPlayerManagement ? PlayerManagementUI.PlayerCategory(player) : this.showACSettingsMenu(player);
        new ActionFormData()
            .title(t("§lTeleport 設定", "§lTeleport Settings"))
            .body(t(`§7有効: ${tp.enabled ? "§aON" : "§cOFF"}\n§7速度倍率: §e${tp.speedMultiplier ?? 3.0}x\n§7最小距離: §e${tp.minimumDistance ?? 5.0}\n§7セーフゾーン数: §e${(tp.safeZones ?? []).length}\n\n§7移動距離が「速度 × 倍率」または「最小距離」を超えた場合に検知します。\n§7セーフゾーン内のテレポートは許可されます。`, `§7Enabled: ${tp.enabled ? "§aON" : "§cOFF"}\n§7Speed multiplier: §e${tp.speedMultiplier ?? 3.0}x\n§7Minimum distance: §e${tp.minimumDistance ?? 5.0}\n§7Safe zones: §e${(tp.safeZones ?? []).length}`))
            .button(t("§l基本設定", "§lBasic Settings"))
            .button(t("§b§lセーフゾーン管理", "§b§lSafe Zone Management"))
            .button(t("§l戻る", "§lBack"))
            .show(player)
            .then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return goBack();
            if (selection === 0)
                return this.showTeleportBasicSettings(player, backToPlayerManagement);
            if (selection === 1)
                return this.showTeleportSafeZoneMenu(player, backToPlayerManagement);
            goBack();
        });
    }
    static showTeleportBasicSettings(player, back) {
        const tp = currentConfig.Teleport;
        new ModalFormData()
            .title(t("§lTeleport 基本設定", "§lTeleport Basic Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: tp.enabled })
            .textField(t("速度と移動距離の許容誤差", "Allowable margins of error for speed and travel distance"), "2.0", { defaultValue: String(tp.allowableError) })
            .textField(t("速度倍率", "Speed multiplier"), "3.0", { defaultValue: String(tp.speedMultiplier) })
            .textField(t("最小距離", "Minimum distance"), "5.0", { defaultValue: String(tp.minimumDistance) })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showTeleportSettingsMenu(player, back);
            patchConfig("Teleport", {
                enabled: Boolean(formValues[0]),
                allowableError: Number(formValues[1]) - 1 || 1.5,
                speedMultiplier: Number(formValues[2]) || 3.0,
                minimumDistance: Number(formValues[3]) || 5.0,
            });
            saveAndBack(player, "§aTeleport設定を保存しました。", "§aTeleport settings saved.", () => this.showTeleportSettingsMenu(player, back));
        });
    }
    static showTeleportSafeZoneMenu(player, back) {
        const zones = currentConfig.Teleport?.safeZones ?? [];
        new ActionFormData()
            .title(t("§lセーフゾーン管理", "§lSafe Zone Management"))
            .body(t(`§7登録数: §e${zones.length}`, `§7Registered: §e${zones.length}`))
            .button(t("§a§l現在地を追加", "§a§lAdd Current Position"), "textures/ui/icon_map")
            .button(t("§b§l座標を手動入力", "§b§lAdd by Coordinates"))
            .button(t("§b§l一覧・削除", "§b§lList / Remove"))
            .button(t("§l戻る", "§lBack"))
            .show(player)
            .then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return this.showTeleportSettingsMenu(player, back);
            if (selection === 0)
                return this.addSafeZoneFromCurrentPos(player, back);
            if (selection === 1)
                return this.addSafeZoneManually(player, back);
            if (selection === 2)
                return this.showSafeZoneList(player, back);
            this.showTeleportSettingsMenu(player, back);
        });
    }
    static addSafeZoneFromCurrentPos(player, back) {
        const loc = player.location;
        const dim = player.dimension.id;
        const dimShort = dim.replace("minecraft:", "");
        new ModalFormData()
            .title(t("§lセーフゾーン追加 (現在地)", "§lAdd Safe Zone (Current Position)"))
            .textField(t(`名前 (第一地点: ${loc.x.toFixed(1)}, ${loc.y.toFixed(1)}, ${loc.z.toFixed(1)} / ${dimShort})`, `Name (corner 1: ${loc.x.toFixed(1)}, ${loc.y.toFixed(1)}, ${loc.z.toFixed(1)} / ${dimShort})`), "Spawn")
            .textField(t("X2", "X2"), "0", { defaultValue: loc.x.toFixed(2) })
            .textField(t("Y2", "Y2"), "0", { defaultValue: loc.y.toFixed(2) })
            .textField(t("Z2", "Z2"), "0", { defaultValue: loc.z.toFixed(2) })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showTeleportSafeZoneMenu(player, back);
            const name = String(formValues[0] ?? "").trim() || `Zone_${Date.now()}`;
            const x2 = Number(formValues[1]);
            const y2 = Number(formValues[2]);
            const z2 = Number(formValues[3]);
            if (isNaN(x2) || isNaN(y2) || isNaN(z2)) {
                notify(player, t("§c座標が不正です。", "§cInvalid coordinates."));
                return this.addSafeZoneFromCurrentPos(player, back);
            }
            const zones = [...(currentConfig.Teleport?.safeZones ?? [])];
            zones.push({ name, x1: loc.x, y1: loc.y, z1: loc.z, x2, y2, z2, dim });
            patchConfig("Teleport", { safeZones: zones });
            saveAndBack(player, `§aセーフゾーン「${name}」を追加しました。`, `§aAdded safe zone "${name}".`, () => this.showTeleportSafeZoneMenu(player, back));
        });
    }
    static addSafeZoneManually(player, back) {
        const loc = player.location;
        const dim = player.dimension.id;
        new ModalFormData()
            .title(t("§lセーフゾーン追加 (手動入力)", "§lAdd Safe Zone (Manual)"))
            .textField(t("名前", "Name"), "Spawn")
            .textField(t("X1", "X1"), "0", { defaultValue: loc.x.toFixed(2) })
            .textField(t("Y1", "Y1"), "0", { defaultValue: loc.y.toFixed(2) })
            .textField(t("Z1", "Z1"), "0", { defaultValue: loc.z.toFixed(2) })
            .textField(t("X2", "X2"), "0", { defaultValue: loc.x.toFixed(2) })
            .textField(t("Y2", "Y2"), "0", { defaultValue: loc.y.toFixed(2) })
            .textField(t("Z2", "Z2"), "0", { defaultValue: loc.z.toFixed(2) })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showTeleportSafeZoneMenu(player, back);
            const name = String(formValues[0] ?? "").trim() || `Zone_${Date.now()}`;
            const x1 = Number(formValues[1]), y1 = Number(formValues[2]), z1 = Number(formValues[3]);
            const x2 = Number(formValues[4]), y2 = Number(formValues[5]), z2 = Number(formValues[6]);
            if (isNaN(x1) || isNaN(y1) || isNaN(z1) || isNaN(x2) || isNaN(y2) || isNaN(z2)) {
                notify(player, t("§c座標が不正です。", "§cInvalid coordinates."));
                return this.addSafeZoneManually(player, back);
            }
            const zones = [...(currentConfig.Teleport?.safeZones ?? [])];
            zones.push({ name, x1, y1, z1, x2, y2, z2, dim });
            patchConfig("Teleport", { safeZones: zones });
            saveAndBack(player, `§aセーフゾーン「${name}」を追加しました。`, `§aAdded safe zone "${name}".`, () => this.showTeleportSafeZoneMenu(player, back));
        });
    }
    static showSafeZoneList(player, back) {
        const zones = currentConfig.Teleport?.safeZones ?? [];
        if (zones.length === 0) {
            notify(player, t("§7セーフゾーンは登録されていません。", "§7No safe zones registered."));
            return this.showTeleportSafeZoneMenu(player, back);
        }
        const options = zones.map((z) => {
            const minX = Math.min(z.x1, z.x2);
            const maxX = Math.max(z.x1, z.x2);
            const minY = Math.min(z.y1, z.y2);
            const maxY = Math.max(z.y1, z.y2);
            const minZ = Math.min(z.z1, z.z2);
            const maxZ = Math.max(z.z1, z.z2);
            return `${z.name} (${minX.toFixed(0)}, ${minY.toFixed(0)}, ${minZ.toFixed(0)}) - (${maxX.toFixed(0)}, ${maxY.toFixed(0)}, ${maxZ.toFixed(0)})`;
        });
        new ModalFormData()
            .title(t("§lセーフゾーン一覧・削除", "§lSafe Zone List / Remove"))
            .dropdown(t("削除するゾーンを選択", "Select zone to remove"), options, { defaultValueIndex: 0 })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showTeleportSafeZoneMenu(player, back);
            const idx = Number(formValues[0]);
            if (!zones[idx])
                return this.showTeleportSafeZoneMenu(player, back);
            patchConfig("Teleport", { safeZones: zones.filter((_, i) => i !== idx) });
            saveAndBack(player, `§aセーフゾーン「${zones[idx].name}」を削除しました。`, `§aRemoved safe zone "${zones[idx].name}".`, () => this.showTeleportSafeZoneMenu(player, back));
        });
    }
    static showPermissionBypassMenu(player) {
        const perms = currentConfig.Permissions?.bypass ?? {};
        const form = new ActionFormData()
            .title("§lPermission")
            .body(t("§7各検知ごとに Owner / Admin のバイパス設定をします。", "§7Configure per-detection bypass for Owner / Admin."));
        ALL_DETECTION_TYPES.forEach((det) => {
            const cfg = perms[det] ?? { owner: true, admin: false };
            const ownerStr = cfg.owner ? "§aO:ON" : "§cO:OFF";
            const adminStr = cfg.admin ? "§aA:ON" : "§cA:OFF";
            form.button(`§l${DETECTION_LABELS[det] ?? det} - ${ownerStr} §7| ${adminStr}`);
        });
        form.button(t("§l戻る", "§lBack"));
        form.show(player).then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return this.showACSettingsMenu(player);
            if (selection === ALL_DETECTION_TYPES.length)
                return this.showACSettingsMenu(player);
            this.showDetectionBypassEditor(player, ALL_DETECTION_TYPES[selection]);
        });
    }
    static showDetectionBypassEditor(player, detection) {
        const perms = currentConfig.Permissions?.bypass ?? {};
        const cfg = perms[detection] ?? { owner: true, admin: false };
        const label = DETECTION_LABELS[detection] ?? detection;
        new ModalFormData()
            .title(t(`§l${label} バイパス設定`, `§l${label} Bypass`))
            .toggle(t("§6Owner バイパス", "§6Owner bypass"), { defaultValue: cfg.owner })
            .toggle(t("§eAdmin バイパス", "§eAdmin bypass"), { defaultValue: cfg.admin })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showPermissionBypassMenu(player);
            patchConfig("Permissions", {
                bypass: { ...perms, [detection]: { owner: Boolean(formValues[0]), admin: Boolean(formValues[1]) } },
            });
            saveAndBack(player, `§a${label} のバイパス設定を保存しました。`, `§aSaved bypass settings for ${label}.`, () => this.showPermissionBypassMenu(player));
        });
    }
    static showSystemMenu(player) {
        const s = currentConfig.System;
        new ModalFormData()
            .title(t("§lSystem 設定", "§lSystem Settings"))
            .toggle(t("自動OP解除", "Auto de-op"), { defaultValue: s.autoDeop ?? true })
            .toggle(t("§cデバッグモード", "§cDebug mode"), { defaultValue: isDebugMode() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            setDebugMode(Boolean(formValues[1]));
            patchConfig("System", { autoDeop: Boolean(formValues[0]) });
            saveAndBack(player, "§aSystem設定を保存しました。", "§aSystem settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showReachMenu(player) {
        const r = currentConfig.Reach;
        new ModalFormData()
            .title(t("§lReach 設定", "§lReach Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: r.enabled })
            .textField(`Hit - survival [実効値: ${TPSCalculator.scaleMultiply(r.hitThreshold).toFixed(2)}]`, "7.0", { defaultValue: r.hitThreshold.toString() })
            .textField(`Hit - creative [実効値: ${TPSCalculator.scaleMultiply(r.creative_hitThreshold).toFixed(2)}]`, "10.0", { defaultValue: r.creative_hitThreshold.toString() })
            .textField(`Break - survival [実効値: ${TPSCalculator.scaleMultiply(r.breakThreshold).toFixed(2)}]`, "6.0", { defaultValue: r.breakThreshold.toString() })
            .textField(`Break - creative [実効値: ${TPSCalculator.scaleMultiply(r.creative_breakThreshold).toFixed(2)}]`, "7.5", { defaultValue: r.creative_breakThreshold.toString() })
            .textField(`Place - survival [実効値: ${TPSCalculator.scaleMultiply(r.placeThreshold ?? 6.0).toFixed(2)}]`, "6.0", { defaultValue: (r.placeThreshold ?? 6.0).toString() })
            .textField(`Place - creative [実効値: ${TPSCalculator.scaleMultiply(r.creative_placeThreshold ?? 7.5).toFixed(2)}]`, "7.5", { defaultValue: (r.creative_placeThreshold ?? 7.5).toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            const [enabled, hit, c_hit, brk, c_brk, plc, c_plc] = formValues;
            patchConfig("Reach", {
                enabled,
                hitThreshold: Number(hit) || 7.0, creative_hitThreshold: Number(c_hit) || 10.0,
                breakThreshold: Number(brk) || 6.0, creative_breakThreshold: Number(c_brk) || 7.5,
                placeThreshold: Number(plc) || 6.0, creative_placeThreshold: Number(c_plc) || 7.5,
            });
            saveAndBack(player, "§aReach設定を保存しました。", "§aReach settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showGameModeChangeMenu(player) {
        const s = currentConfig.System;
        new ModalFormData()
            .title(t("§lGameMode変更通知 設定", "§lGameMode Change Notice Settings"))
            .toggle(t("§6通知を有効化 §7(全設定のマスター)", "§6Enable notification §7(master switch)"), { defaultValue: s.GMChangeNoticeEnabled ?? true })
            .toggle(t("コンソールに出力", "Console output"), { defaultValue: s.GMConsoleNotice })
            .toggle(t("全体チャットに通知", "World chat notification"), { defaultValue: s.GMWorldNotice })
            .toggle(t("§eスタッフのみに通知 §7(Admin/Owner/OP)", "§eStaff only §7(Admin/Owner/OP)"), { defaultValue: s.GMStaffNotice ?? false })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            const [enabled, consoleNotice, worldNotice, staffNotice] = formValues;
            patchConfig("System", {
                GMChangeNoticeEnabled: enabled,
                GMConsoleNotice: consoleNotice,
                GMWorldNotice: worldNotice,
                GMStaffNotice: staffNotice,
            });
            saveAndBack(player, "§aGameMode変更通知の設定を保存しました。", "§aGameMode change notice settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showKillauraMenu(player) {
        const k = currentConfig.Killaura;
        new ModalFormData()
            .title(t("§lKillaura 設定", "§lKillaura Settings"))
            .toggle(t("有効化", "Enabled"), { defaultValue: k.enabled })
            .textField("MultiHit", "2", { defaultValue: String(k.multiHitThreshold ?? 2) })
            .textField("Freeze (ticks)", "100", { defaultValue: String(k.freezeTicks) })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            patchConfig("Killaura", {
                enabled: Boolean(formValues[0]),
                multiHitThreshold: Number(formValues[1]) || 2,
                freezeTicks: Number(formValues[2]) || 100,
            });
            saveAndBack(player, "§aKillaura設定を保存しました。", "§aKillaura settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showNoSwingMenu(player) {
        new ModalFormData()
            .title(t("§lNoSwing 設定", "§lNoSwing Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: currentConfig.NoSwing.enabled })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            patchConfig("NoSwing", { enabled: Boolean(formValues[0]) });
            saveAndBack(player, "§aNoSwing設定を保存しました。", "§aNoSwing settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showSpeedMenu(player) {
        const c = currentConfig.Speed;
        new ModalFormData()
            .title(t("§lSpeed 設定", "§lSpeed Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: c.enabled })
            .textField(`Limit [実効値: ${TPSCalculator.scaleMultiply(c.limit).toFixed(2)}]`, "2.8", { defaultValue: c.limit.toString() })
            .textField("Freeze (ticks)", "200", { defaultValue: c.freezeTicks.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            patchConfig("Speed", {
                enabled: Boolean(formValues[0]),
                limit: Number(formValues[1]) || 2.8,
                freezeTicks: Number(formValues[2]) || 200,
            });
            saveAndBack(player, "§aSpeed設定を保存しました。", "§aSpeed settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showFlyMenu(player) {
        const f = currentConfig.Fly;
        new ModalFormData()
            .title(t("§lFly 設定", "§lFly Settings"))
            .toggle(t("Fly A", "Fly A"), { defaultValue: f.flyAEnabled })
            .textField("FlyA Freeze", "200", { defaultValue: f.flyAFreezeTicks.toString() })
            .textField("FlyA Threshold", "5", { defaultValue: f.flagThreshold.toString() })
            .textField("FlyA DecayTicks", "60", { defaultValue: f.flagDecayTicks.toString() })
            .textField("FlyA DecayAmount", "1", { defaultValue: f.flagDecayAmount.toString() })
            .toggle(t("Fly C", "Fly C"), { defaultValue: f.flyCEnabled })
            .textField("FlyC Freeze", "200", { defaultValue: f.flyCFreezeTicks.toString() })
            .toggle(t("Fly G", "Fly G"), { defaultValue: f.flyGEnabled })
            .textField("FlyG Freeze", "200", { defaultValue: f.flyGFreezeTicks.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            patchConfig("Fly", {
                flyAEnabled: Boolean(formValues[0]),
                flyAFreezeTicks: Number(formValues[1]) || 200,
                flagThreshold: Number(formValues[2]) || 5,
                flagDecayTicks: Number(formValues[3]) || 60,
                flagDecayAmount: Number(formValues[4]) || 1,
                flyCEnabled: Boolean(formValues[5]),
                flyCFreezeTicks: Number(formValues[6]) || 200,
                flyGEnabled: Boolean(formValues[7]),
                flyGFreezeTicks: Number(formValues[8]) || 200,
            });
            saveAndBack(player, "§aFly設定を保存しました。", "§aFly settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showBDSFlyMenu(player) {
        const b = currentConfig.BDSFly;
        new ModalFormData()
            .title(t("§lAirJump 設定", "§lAirJump Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: b.enabled })
            .textField("Threshold", "0.01", { defaultValue: b.threshold.toString() })
            .textField("Freeze", "20", { defaultValue: b.freezeTicks.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            patchConfig("BDSFly", {
                enabled: Boolean(formValues[0]),
                threshold: Number(formValues[1]) || 0.01,
                freezeTicks: Number(formValues[2]) || 20,
            });
            saveAndBack(player, "§aAirJump設定を保存しました。", "§aAirJump settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showNofallMenu(player) {
        const n = currentConfig.Nofall;
        const ff = currentConfig.FastFall ?? { enabled: true, threshold: -5.0, freezeTicks: 100, punishment: "freeze", tempkickSeconds: 30 };
        new ModalFormData()
            .title(t("§lFall 設定", "§lFall Settings"))
            .toggle(t("Nofall", "NoFall Enabled"), { defaultValue: n.NofallEnabled })
            .toggle(t("SlowFall", "SlowFall detection"), { defaultValue: n.slowFallEnabled })
            .textField("Distance", "4.0", { defaultValue: n.distanceThreshold.toString() })
            .textField("SlowFall Threshold", "3", { defaultValue: n.slowFallFlagThreshold.toString() })
            .textField("SlowFall DecayTicks", "60", { defaultValue: n.slowFallFlagDecayTicks.toString() })
            .textField("SlowFall DecayAmount", "1", { defaultValue: n.slowFallFlagDecayAmount.toString() })
            .textField("SlowFall MinFallTicks", "20", { defaultValue: n.slowFallMinFallTicks.toString() })
            .toggle(t("OnGroundSpoof", "OnGroundSpoof"), { defaultValue: n.OnGroundSpoofEnabled })
            .textField("OnGroundSpoof ScanTick", "10", { defaultValue: n.onGroSpfScanTick.toString() })
            .toggle(t("FallSpoof", "FallSpoof"), { defaultValue: n.fallSpoofEnabled })
            .textField("FallSpoof ScoreThreshold", "30", { defaultValue: n.fallSpoofScoreThreshold.toString() })
            .toggle(t("FastFall", "FastFall detection"), { defaultValue: ff.enabled })
            .textField("FastFall Y Threshold", "-5.0", { defaultValue: ff.threshold.toString() })
            .textField("FastFall Freeze", "100", { defaultValue: ff.freezeTicks.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            const [nofallEnabled, slowFallEnabled, distRaw, sfThrRaw, sfDecayRaw, sfDecayAmtRaw, sfMinTicksRaw, ogsEnabled, ogsTickRaw, fsEnabled, fsScoreRaw, ffEnabled, ffThresholdRaw, ffFreezeRaw,] = formValues;
            patchConfig("Nofall", {
                NofallEnabled: nofallEnabled,
                slowFallEnabled: slowFallEnabled,
                distanceThreshold: Number(distRaw) || 4.0,
                slowFallFlagThreshold: Number(sfThrRaw) || 3,
                slowFallFlagDecayTicks: Number(sfDecayRaw) || 60,
                slowFallFlagDecayAmount: Number(sfDecayAmtRaw) || 1,
                slowFallMinFallTicks: Number(sfMinTicksRaw) || 20,
                OnGroundSpoofEnabled: ogsEnabled,
                onGroSpfScanTick: Number(ogsTickRaw) || 10,
                fallSpoofEnabled: fsEnabled,
                fallSpoofScoreThreshold: Number(fsScoreRaw) || 30,
            });
            patchConfig("FastFall", {
                enabled: ffEnabled,
                threshold: Number(ffThresholdRaw) || -5.0,
                freezeTicks: Number(ffFreezeRaw) || 100,
            });
            saveAndBack(player, "§aFall設定を保存しました。", "§aFall settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showStepMenu(player) {
        const s = currentConfig.Step;
        new ModalFormData()
            .title(t("§lStep 設定", "§lStep Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: s.enabled })
            .textField("MinSpeed", "0.1", { defaultValue: s.minSpeed.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            patchConfig("Step", { enabled: Boolean(formValues[0]), minSpeed: Number(formValues[1]) || 0.1 });
            saveAndBack(player, "§aStep設定を保存しました。", "§aStep settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showNoClipMenu(player) {
        const nc = currentConfig.NoClip;
        new ModalFormData()
            .title(t("§lNoClip 設定", "§lNoClip Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: nc.enabled })
            .textField("Y speed", "-0.5", { defaultValue: nc.speedY.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            patchConfig("NoClip", { enabled: Boolean(formValues[0]), speedY: Number(formValues[1]) || -0.5 });
            saveAndBack(player, "§aNoClip設定を保存しました。", "§aNoClip settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showPhaseMenu(player) {
        const p = currentConfig.Phase;
        new ModalFormData()
            .title(t("§lPhase 設定", "§lPhase Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: p.enabled })
            .textField("Speed", "0.8", { defaultValue: p.Speed.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            patchConfig("Phase", { enabled: Boolean(formValues[0]), Speed: Number(formValues[1]) || 0.8 });
            saveAndBack(player, "§aPhase設定を保存しました。", "§aPhase settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showNoSlowMenu(player) {
        const c = currentConfig.NoSlow ?? { enabled: true, threshold: 0.4, freezeTicks: 100 };
        new ModalFormData()
            .title(t("§lNoSlow 設定", "§lNoSlow Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: c.enabled })
            .textField("Speed Threshold", "0.4", { defaultValue: c.threshold.toString() })
            .textField("Freeze", "100", { defaultValue: c.freezeTicks.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            patchConfig("NoSlow", {
                enabled: Boolean(formValues[0]),
                threshold: Number(formValues[1]) || 0.4,
                freezeTicks: Number(formValues[2]) || 100,
            });
            saveAndBack(player, "§aNoSlow設定を保存しました。", "§aNoSlow settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showAirSwimMenu(player) {
        const c = currentConfig.AirSwim ?? { enabled: true, freezeTicks: 100 };
        new ModalFormData()
            .title(t("§lAirSwim 設定", "§lAirSwim Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: c.enabled })
            .textField("Freeze", "100", { defaultValue: c.freezeTicks.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            patchConfig("AirSwim", { enabled: Boolean(formValues[0]), freezeTicks: Number(formValues[1]) || 100 });
            saveAndBack(player, "§aAirSwim設定を保存しました。", "§aAirSwim settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showContradictionMenu(player) {
        const c = currentConfig.Contradiction ?? { enabled: false, sprintSneak: true, groundFall: true, fallDecel: true };
        new ModalFormData()
            .title(t("§lContradiciton 設定", "§lContradiction Settings"))
            .toggle(t("全体有効", "Enabled"), { defaultValue: c.enabled })
            .toggle(t("Sprint + Sneak", "Sprint + Sneak"), { defaultValue: c.sprintSneak })
            .toggle(t("OnGround + Falling", "OnGround + Falling"), { defaultValue: c.groundFall })
            .toggle(t("Fall Deceleration", "Fall Deceleration"), { defaultValue: c.fallDecel })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            patchConfig("Contradiction", {
                enabled: Boolean(formValues[0]),
                sprintSneak: Boolean(formValues[1]),
                groundFall: Boolean(formValues[2]),
                fallDecel: Boolean(formValues[3]),
            });
            saveAndBack(player, "§a矛盾検知設定を保存しました。", "§aContradiction settings saved.", () => this.showContradictionMenu(player));
        });
    }
    static showNukerMenu(player) {
        const n = currentConfig.Nuker;
        new ModalFormData()
            .title(t("§lNuker 設定", "§lNuker Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: n.enabled })
            .textField("MaxBlocks", "5", { defaultValue: n.maxBlocks.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            patchConfig("Nuker", {
                enabled: Boolean(formValues[0]),
                maxBlocks: Number(formValues[1]) || 5,
            });
            saveAndBack(player, "§aNuker設定を保存しました。", "§aNuker settings saved.", () => this.showACSettingsMenu(player));
        });
    }
    static showChatMenu(player) {
        const c = currentConfig.Chat;
        new ActionFormData()
            .title(t("§lChat 設定", "§lChat Settings"))
            .body(t(`禁止ワード数: §e${(c.bannedWords || []).length}件`, `§7Banned words: §e${(c.bannedWords || []).length}`))
            .button(t("§lチャット制限設定", "§lChat Limit"))
            .button(t("§l禁止ワードの追加", "§lAdd Banned Word"))
            .button(t("§l禁止ワードの削除", "§lRemove Banned Word"))
            .button(t("§l戻る", "§lBack"))
            .show(player)
            .then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return this.showACSettingsMenu(player);
            if (selection === 0)
                return this.showChatLimitSettings(player);
            if (selection === 1)
                return this.showAddBannedWord(player);
            if (selection === 2)
                return this.showRemoveBannedWord(player);
            this.showACSettingsMenu(player);
        });
    }
    static showChatLimitSettings(player) {
        const c = currentConfig.Chat;
        new ModalFormData()
            .title(t("§lチャット制限設定", "§lChat Limit Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: c.chatLimitEnabled })
            .textField("Max length", "150", { defaultValue: c.maxLength.toString() })
            .textField("Cooldown (ms)", "1000", { defaultValue: c.cooldownMs.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showChatMenu(player);
            patchConfig("Chat", {
                chatLimitEnabled: Boolean(formValues[0]),
                maxLength: Number(formValues[1]) || 150,
                cooldownMs: Number(formValues[2]) || 1000,
            });
            saveAndBack(player, "§aチャット制限設定を保存しました。", "§aChat limit settings saved.", () => this.showChatMenu(player));
        });
    }
    static showAddBannedWord(player) {
        new ModalFormData()
            .title(t("§l禁止ワードの追加", "§lAdd Banned Word"))
            .textField("Word", "")
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showChatMenu(player);
            const word = String(formValues[0] ?? "").trim();
            if (!word) {
                notify(player, t("§cワードが入力されていません。", "§cNo word entered."));
                return this.showChatMenu(player);
            }
            const words = currentConfig.Chat.bannedWords || [];
            if (words.includes(word)) {
                notify(player, t("§cそのワードは既に追加されています。", "§cThat word is already added."));
                return this.showChatMenu(player);
            }
            patchConfig("Chat", { bannedWords: [...words, word] });
            saveAndBack(player, `§a「${word}」を追加しました。`, `§aAdded "${word}".`, () => this.showChatMenu(player));
        });
    }
    static showRemoveBannedWord(player) {
        const words = currentConfig.Chat.bannedWords || [];
        if (words.length === 0) {
            notify(player, t("§7禁止ワードは設定されていません。", "§7No banned words configured."));
            return this.showChatMenu(player);
        }
        new ModalFormData()
            .title(t("§l禁止ワードの削除", "§lRemove Banned Word"))
            .dropdown("Select", words, { defaultValueIndex: 0 })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showChatMenu(player);
            const index = Number(formValues[0]);
            const removed = words[index];
            patchConfig("Chat", { bannedWords: words.filter((_, i) => i !== index) });
            saveAndBack(player, `§a「${removed}」を削除しました。`, `§aRemoved "${removed}".`, () => this.showChatMenu(player));
        });
    }
    static showBlockPlaceMenu(player) {
        const bp = currentConfig.BlockPlace;
        const illegalBlocks = bp.illegalBlocks ?? [];
        const resetBlocks = bp.resetBlocks ?? [];
        const form = new ModalFormData()
            .title(t("§lBlockPlace 設定", "§lBlockPlace Settings"))
            .toggle(t("有効", "enabled"), { defaultValue: bp.enabled })
            .toggle(t("不正ブロックの設置", "Illegal block placement"), { defaultValue: bp.illegalPlace })
            .toggle(t("ResetData §7(リストが空の時すべてのブロックのデータリセット)", "ResetData §7(All data is reset when list empty.)"), { defaultValue: bp.resetData })
            .toggle(t("不正なブロックインベントリ", "illegalContainer"), { defaultValue: bp.illegalcontainer });
        addListEditFields(form, illegalBlocks, t("§c§l設置禁止IDを追加", "§c§lAdd illegalBlock ID"), "minecraft:tnt", t("§c§l設置禁止IDを削除", "§c§lRemove illegalBlock"));
        addListEditFields(form, resetBlocks, t("§lリセット対象IDを追加", "§6§lAdd resetBlock ID"), "minecraft:frame", t("§lリセット対象IDを削除", "§6§lRemove resetBlock"));
        form.show(player).then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            const [enabled, illegalPlace, resetData, illegalcontainer, illAdd, illRemoveIdx, resetAdd, resetRemoveIdx] = formValues;
            const newIllegal = parseListEdit(illAdd, illRemoveIdx, illegalBlocks);
            const newReset = parseListEdit(resetAdd, resetRemoveIdx, resetBlocks);
            patchConfig("BlockPlace", {
                enabled,
                illegalPlace,
                resetData,
                illegalcontainer,
                illegalBlocks: newIllegal,
                resetBlocks: newReset,
            });
            saveAndBack(player, `§a保存しました。設置禁止: ${newIllegal.length}件 / リセット対象: ${newReset.length}件`, `§aSaved. Illegal: ${newIllegal.length} / Reset: ${newReset.length}`, () => this.showACSettingsMenu(player));
        });
    }
    static showIllegalItemMenu(player) {
        const ii = currentConfig.IllegalItem;
        const items = ii.customItems ?? [];
        const form = new ModalFormData()
            .title(t("§lIllegal Item 設定", "§lIllegal Item Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: ii.enabled })
            .textField("ScanInterval", "5", { defaultValue: (ii.scanIntervalTick ?? 5).toString() })
            .toggle("checkAmount", { defaultValue: ii.checkAmount })
            .toggle("checkEnchant", { defaultValue: ii.checkEnchant })
            .toggle("checkName", { defaultValue: ii.checkName })
            .toggle("checkIllegalId", { defaultValue: ii.checkIllegalId })
            .toggle("checkEntity", { defaultValue: ii.checkEntity ?? true });
        addListEditFields(form, items, t("追加ID", "Add ID"), "", t("削除ID", "Remove ID"));
        form.show(player).then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            const [enabled, intervalRaw, checkA, checkE, checkN, checkId, checkEnt, addIdRaw, removeIdx] = formValues;
            const updated = parseListEdit(addIdRaw, removeIdx, items);
            const interval = Number(intervalRaw);
            patchConfig("IllegalItem", {
                enabled,
                scanIntervalTick: isNaN(interval) || interval < 1 ? 5 : interval,
                checkAmount: checkA, checkEnchant: checkE, checkName: checkN,
                checkIllegalId: checkId, checkEntity: checkEnt,
                customItems: updated,
            });
            saveAndBack(player, `§a保存しました。登録数: ${updated.length}`, `§aSaved. Entries: ${updated.length}`, () => this.showACSettingsMenu(player));
        });
    }
    static showCpsMenu(player) {
        const cps = currentConfig.cps;
        new ModalFormData()
            .title(t("§lAutoClicker 設定", "§lAutoClicker Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: cps.enabled })
            .textField("CPS Threshold", "30", { defaultValue: cps.cpsThreshold.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            patchConfig("cps", { enabled: Boolean(formValues[0]), cpsThreshold: Number(formValues[1]) || 30 });
            saveAndBack(player, "§a保存しました。", "§aSaved.", () => this.showACSettingsMenu(player));
        });
    }
    static showAutoTotemMenu(player) {
        const at = currentConfig.AutoTotem;
        new ModalFormData()
            .title(t("§lAutoTotem 設定", "§lAutoTotem Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: at.enabled })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            patchConfig("AutoTotem", { enabled: Boolean(formValues[0]) });
            saveAndBack(player, "§a保存しました。", "§aSaved.", () => this.showACSettingsMenu(player));
        });
    }
    static showEntityMenu(player) {
        const e = currentConfig.entity;
        const ill = e.IllegalEntities ?? [];
        const not = e.NoticeEntities ?? [];
        const form = new ModalFormData()
            .title(t("§lIllegal Entity 設定", "§lIllegal Entity Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: e.enabled })
            .toggle(t("Notice", "Notice"), { defaultValue: e.noticeEnabled })
            .toggle(t("Limit", "Limit"), { defaultValue: e.limitEnabled ?? false })
            .textField("LimitCount", "100", { defaultValue: (e.limitCount ?? 100).toString() })
            .toggle(t("checkInv", "checkInv"), { defaultValue: e.checkInvEnabled ?? true })
            .toggle(t("resetData", "resetData"), { defaultValue: e.resetData });
        addListEditFields(form, ill, t("不正ID 追加", "Add illegal ID"), "", t("不正ID 削除", "Remove illegal ID"));
        addListEditFields(form, not, t("通知ID 追加", "Add notice ID"), "", t("通知ID 削除", "Remove notice ID"));
        form.show(player).then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            const [enabled, noticeEnabled, limitEnabled, limitRaw, checkInvEnabled, resetData, illAdd, illRemove, notAdd, notRemove] = formValues;
            const upIll = parseListEdit(illAdd, illRemove, ill);
            const upNot = parseListEdit(notAdd, notRemove, not);
            patchConfig("entity", {
                enabled,
                noticeEnabled,
                limitEnabled,
                limitCount: Number(limitRaw) || 100,
                checkInvEnabled,
                resetData,
                IllegalEntities: upIll,
                NoticeEntities: upNot,
            });
            saveAndBack(player, "§a保存しました。", "§aSaved.", () => this.showACSettingsMenu(player));
        });
    }
    static showSpawnEggMenu(player) {
        const se = currentConfig.SpawnEgg;
        const eggs = se.illegalEggs ?? [];
        const form = new ModalFormData()
            .title(t("§lSpawnEgg 設定", "§lSpawnEgg Settings"))
            .toggle(t("スポーンエッグの使用拒否", "Deny use of spawn eggs"), { defaultValue: se.rejection })
            .toggle(t("スポーンエッグ使用時に通知", "Notify when a spawn egg is used"), { defaultValue: se.notice });
        addListEditFields(form, eggs, t("ID追加", "Add ID"), "", t("ID削除", "Remove ID"));
        form.show(player).then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            const [rejection, notice, addIdRaw, removeIdx] = formValues;
            const updated = parseListEdit(addIdRaw, removeIdx, eggs);
            patchConfig("SpawnEgg", { rejection, notice, illegalEggs: updated });
            saveAndBack(player, `§a保存しました。登録数: ${updated.length}`, `§aSaved. Entries: ${updated.length}`, () => this.showACSettingsMenu(player));
        });
    }
    static showAFKMenu(player) {
        const afk = currentConfig.AFK;
        new ModalFormData()
            .title(t("§lAFK 設定", "§lAFK Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: afk.enabled })
            .textField("Timeout (s)", "300", { defaultValue: afk.timeoutSeconds.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            patchConfig("AFK", { enabled: Boolean(formValues[0]), timeoutSeconds: Number(formValues[1]) || 300 });
            saveAndBack(player, "§a保存しました。", "§aSaved.", () => this.showACSettingsMenu(player));
        });
    }
    static showInstaBreakMenu(player) {
        const ib = currentConfig.InstaBreak;
        const blocks = ib.illegalBlocks ?? [];
        const form = new ModalFormData()
            .title(t("§lInstaBreak 設定", "§lInstaBreak Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: ib.enabled })
            .toggle(t("Cancel", "Cancel"), { defaultValue: ib.cancel });
        addListEditFields(form, blocks, t("追加ID", "Add ID"), "", t("削除ID", "Remove ID"));
        form.show(player).then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            const [enabled, cancel, addIdRaw, removeIdx] = formValues;
            const updated = parseListEdit(addIdRaw, removeIdx, blocks);
            patchConfig("InstaBreak", { enabled, cancel, illegalBlocks: updated });
            saveAndBack(player, `§a保存しました。登録数: ${updated.length}`, `§aSaved. Entries: ${updated.length}`, () => this.showACSettingsMenu(player));
        });
    }
    static showScaffoldMenu(player) {
        const s = currentConfig.Scaffold;
        new ModalFormData()
            .title(t("§lScaffold 設定", "§lScaffold Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: s.enabled })
            .toggle(t("A", "A"), { defaultValue: s.A })
            .toggle(t("B", "B"), { defaultValue: s.B })
            .toggle(t("C", "C"), { defaultValue: s.C })
            .toggle(t("D", "D"), { defaultValue: s.D })
            .toggle(t("E", "E"), { defaultValue: s.E })
            .toggle(t("F", "F"), { defaultValue: s.F })
            .toggle(t("G", "G"), { defaultValue: s.G })
            .toggle(t("H", "H"), { defaultValue: s.H })
            .textField("minBPS", "4", { defaultValue: s.minBPS.toString() })
            .textField("minSpeed", "0.18", { defaultValue: s.minSpeed.toString() })
            .textField("dDiff", "15", { defaultValue: s.dDiff.toString() })
            .textField("flagThreshold", "5", { defaultValue: s.flagThreshold.toString() })
            .textField("flagDecayTicks", "60", { defaultValue: s.flagDecayTicks.toString() })
            .textField("flagDecayAmount", "1", { defaultValue: s.flagDecayAmount.toString() })
            .textField("freezeTicks", "200", { defaultValue: s.freezeTicks.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showACSettingsMenu(player);
            const n = formValues.map((v) => Number(v));
            patchConfig("Scaffold", {
                enabled: Boolean(formValues[0]),
                A: Boolean(formValues[1]), B: Boolean(formValues[2]),
                C: Boolean(formValues[3]), D: Boolean(formValues[4]),
                E: Boolean(formValues[5]), F: Boolean(formValues[6]),
                G: Boolean(formValues[7]), H: Boolean(formValues[8]),
                minBPS: n[9] || 4, minSpeed: n[10] || 0.18, dDiff: n[11] || 15,
                flagThreshold: n[12] || 5, flagDecayTicks: n[13] || 60,
                flagDecayAmount: n[14] || 1, freezeTicks: n[15] || 200,
            });
            saveAndBack(player, "§a保存しました。", "§aSaved.", () => this.showACSettingsMenu(player));
        });
    }
}
