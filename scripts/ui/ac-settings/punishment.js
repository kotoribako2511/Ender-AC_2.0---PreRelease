import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { currentConfig, ConfigManager } from "../../data/config.js";
import { t } from "../../state.js";
import { notify } from "../../util/notify.js";
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
        { label: "Fly A", get: () => ({ p: c.Fly.flyA.punish.type, t: c.Fly.flyA.punish.seconds }), set: (p, tt) => { c.Fly.flyA.punish.type = p; c.Fly.flyA.punish.seconds = tt; } },
        { label: "Fly C", get: () => ({ p: c.Fly.flyC.punish.type, t: c.Fly.flyC.punish.seconds }), set: (p, tt) => { c.Fly.flyC.punish.type = p; c.Fly.flyC.punish.seconds = tt; } },
        { label: "Fly G", get: () => ({ p: c.Fly.flyG.punish.type, t: c.Fly.flyG.punish.seconds }), set: (p, tt) => { c.Fly.flyG.punish.type = p; c.Fly.flyG.punish.seconds = tt; } },
        { label: "AirJump (BDSFly)", get: () => ({ p: c.BDSFly.punish.type, t: c.BDSFly.punish.seconds }), set: (p, tt) => { c.BDSFly.punish.type = p; c.BDSFly.punish.seconds = tt; } },
        { label: "Speed", get: () => ({ p: c.Speed.punish.type, t: c.Speed.punish.seconds }), set: (p, tt) => { c.Speed.punish.type = p; c.Speed.punish.seconds = tt; } },
        { label: "Scaffold", get: () => ({ p: c.Scaffold.punish.type, t: c.Scaffold.punish.seconds }), set: (p, tt) => { c.Scaffold.punish.type = p; c.Scaffold.punish.seconds = tt; } },
        { label: "Nofall A-beta", get: () => ({ p: c.Nofall.aBeta.type, t: c.Nofall.aBeta.seconds }), set: (p, tt) => { c.Nofall.aBeta.type = p; c.Nofall.aBeta.seconds = tt; } },
        { label: "Nofall OnGroundSpoof", get: () => ({ p: c.Nofall.onGroSpf.type, t: c.Nofall.onGroSpf.seconds }), set: (p, tt) => { c.Nofall.onGroSpf.type = p; c.Nofall.onGroSpf.seconds = tt; } },
        { label: "Nofall SlowFall", get: () => ({ p: c.Nofall.slowFall.type, t: c.Nofall.slowFall.seconds }), set: (p, tt) => { c.Nofall.slowFall.type = p; c.Nofall.slowFall.seconds = tt; } },
        { label: "Step", get: () => ({ p: c.Step.punish.type, t: c.Step.punish.seconds }), set: (p, tt) => { c.Step.punish.type = p; c.Step.punish.seconds = tt; } },
        { label: "NoClip", get: () => ({ p: c.NoClip.punish.type, t: c.NoClip.punish.seconds }), set: (p, tt) => { c.NoClip.punish.type = p; c.NoClip.punish.seconds = tt; } },
        { label: "Phase", get: () => ({ p: c.Phase.punish.type, t: c.Phase.punish.seconds }), set: (p, tt) => { c.Phase.punish.type = p; c.Phase.punish.seconds = tt; } },
        { label: "FastFall", get: () => ({ p: c.FastFall.punish.type, t: c.FastFall.punish.seconds }), set: (p, tt) => { c.FastFall.punish.type = p; c.FastFall.punish.seconds = tt; } },
        { label: "NoSlow", get: () => ({ p: c.NoSlow.punish.type, t: c.NoSlow.punish.seconds }), set: (p, tt) => { c.NoSlow.punish.type = p; c.NoSlow.punish.seconds = tt; } },
        { label: "AirSwim", get: () => ({ p: c.AirSwim.punish.type, t: c.AirSwim.punish.seconds }), set: (p, tt) => { c.AirSwim.punish.type = p; c.AirSwim.punish.seconds = tt; } },
        { label: "Contradiction SprintSneak", get: () => ({ p: c.Contradiction.sprintSneakPunish.type, t: c.Contradiction.sprintSneakPunish.seconds }), set: (p, tt) => { c.Contradiction.sprintSneakPunish.type = p; c.Contradiction.sprintSneakPunish.seconds = tt; } },
        { label: "Contradiction FallDecel", get: () => ({ p: c.Contradiction.fallDecelPunish.type, t: c.Contradiction.fallDecelPunish.seconds }), set: (p, tt) => { c.Contradiction.fallDecelPunish.type = p; c.Contradiction.fallDecelPunish.seconds = tt; } },
    ];
    const combat = [
        { label: "Reach Hit", get: () => ({ p: c.Reach.hit.type, t: c.Reach.hit.seconds }), set: (p, tt) => { c.Reach.hit.type = p; c.Reach.hit.seconds = tt; } },
        { label: "Reach Break", get: () => ({ p: c.Reach.break.type, t: c.Reach.break.seconds }), set: (p, tt) => { c.Reach.break.type = p; c.Reach.break.seconds = tt; } },
        { label: "Reach Place", get: () => ({ p: c.Reach.place.type, t: c.Reach.place.seconds }), set: (p, tt) => { c.Reach.place.type = p; c.Reach.place.seconds = tt; } },
        { label: "Killaura Sleep", get: () => ({ p: c.Killaura.sleep.type, t: c.Killaura.sleep.seconds }), set: (p, tt) => { c.Killaura.sleep.type = p; c.Killaura.sleep.seconds = tt; } },
        { label: "Killaura MultiHit", get: () => ({ p: c.Killaura.multiHit.type, t: c.Killaura.multiHit.seconds }), set: (p, tt) => { c.Killaura.multiHit.type = p; c.Killaura.multiHit.seconds = tt; } },
        { label: "NoSwing Hit", get: () => ({ p: c.NoSwing.hit.type, t: c.NoSwing.hit.seconds }), set: (p, tt) => { c.NoSwing.hit.type = p; c.NoSwing.hit.seconds = tt; } },
        { label: "NoSwing Break", get: () => ({ p: c.NoSwing.break.type, t: c.NoSwing.break.seconds }), set: (p, tt) => { c.NoSwing.break.type = p; c.NoSwing.break.seconds = tt; } },
        { label: "NoSwing Place", get: () => ({ p: c.NoSwing.place.type, t: c.NoSwing.place.seconds }), set: (p, tt) => { c.NoSwing.place.type = p; c.NoSwing.place.seconds = tt; } },
        { label: "AutoClicker (CPS)", get: () => ({ p: c.cps.punish.type, t: c.cps.punish.seconds }), set: (p, tt) => { c.cps.punish.type = p; c.cps.punish.seconds = tt; } },
    ];
    const world = [
        { label: "Nuker", get: () => ({ p: c.Nuker.punish.type, t: c.Nuker.punish.seconds }), set: (p, tt) => { c.Nuker.punish.type = p; c.Nuker.punish.seconds = tt; } },
        { label: "InstaBreak", get: () => ({ p: c.InstaBreak.punish.type, t: c.InstaBreak.punish.seconds }), set: (p, tt) => { c.InstaBreak.punish.type = p; c.InstaBreak.punish.seconds = tt; } },
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
export class PunishmentUI {
    static summarizeAll() {
        return summarize(buildPunishmentCategories());
    }
    static show(player, back) {
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
                return back();
            const catCount = categories.length;
            if (selection < catCount)
                return this.showCategoryMenu(player, categories[selection], back);
            if (selection === catCount)
                return this.showPresetConfirm(player, "recommended", back);
            if (selection === catCount + 1)
                return this.showPresetConfirm(player, "all-notify", back);
            if (selection === catCount + 2)
                return this.showPresetConfirm(player, "all-kick", back);
            if (selection === catCount + 3)
                return this.showPresetConfirm(player, "all-tempban", back);
            back();
        });
    }
    static showPresetConfirm(player, preset, back) {
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
                return this.show(player, back);
            const count = this.applyPreset(preset);
            ConfigManager.saveConfig(currentConfig);
            notify(player, `§a${count}件の検知に §l${labels[preset]}§a を適用しました。`);
            this.show(player, back);
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
    static showCategoryMenu(player, category, back) {
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
                return this.show(player, back);
            if (selection === category.items.length)
                return this.showCategoryBulkApply(player, category, back);
            if (selection === category.items.length + 1)
                return this.show(player, back);
            this.showQuickSelect(player, category, category.items[selection], back);
        });
    }
    static showQuickSelect(player, category, item, back) {
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
                return this.showCategoryMenu(player, category, back);
            if (selection === PUNISHMENT_OPTIONS.length)
                return this.showTempkickSecondsEditor(player, category, item, back);
            if (selection === PUNISHMENT_OPTIONS.length + 1)
                return this.showCategoryMenu(player, category, back);
            const newP = PUNISHMENT_OPTIONS[selection];
            item.set(newP, cur.t);
            ConfigManager.saveConfig(currentConfig);
            notify(player, `§a${item.label} → ${punishmentColor(newP)}${punishmentLabel(newP)}`);
            this.showQuickSelect(player, category, item, back);
        });
    }
    static showTempkickSecondsEditor(player, category, item, back) {
        const cur = item.get();
        new ModalFormData()
            .title(t(`§l${item.label} - 秒数設定`, `§l${item.label} - Seconds`))
            .textField(t("一時BAN秒数 (1〜86400)", "TempBan Seconds (1-86400)"), "30", { defaultValue: String(cur.t) })
            .show(player).then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showQuickSelect(player, category, item, back);
            const sec = Math.min(86400, Math.max(1, Number(formValues[0]) || 30));
            item.set(cur.p, sec);
            ConfigManager.saveConfig(currentConfig);
            notify(player, `§a${item.label}: §e${sec}秒`);
            this.showQuickSelect(player, category, item, back);
        });
    }
    static showCategoryBulkApply(player, category, back) {
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
                return this.showCategoryMenu(player, category, back);
            if (selection === PUNISHMENT_OPTIONS.length)
                return this.showCategoryMenu(player, category, back);
            const p = PUNISHMENT_OPTIONS[selection];
            let count = 0;
            for (const item of category.items) {
                item.set(p, item.get().t);
                count++;
            }
            ConfigManager.saveConfig(currentConfig);
            notify(player, `§a${count}件に ${punishmentColor(p)}${punishmentLabel(p)} §aを適用しました。`);
            this.showCategoryMenu(player, category, back);
        });
    }
}
