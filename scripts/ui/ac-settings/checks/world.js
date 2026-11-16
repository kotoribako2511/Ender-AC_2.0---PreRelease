import { ModalFormData } from "@minecraft/server-ui";
import { currentConfig, patchConfig } from "../../../data/config.js";
import { t } from "../../../state.js";
import { saveAndBack, addListEditFields, parseListEdit } from "../../helpers.js";
export class WorldCheckMenus {
    static showNukerMenu(player, back) {
        const n = currentConfig.Nuker;
        new ModalFormData()
            .title(t("§lNuker 設定", "§lNuker Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: n.enabled })
            .textField("MaxBlocks", "5", { defaultValue: n.maxBlocks.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return back();
            patchConfig("Nuker", {
                enabled: Boolean(formValues[0]),
                maxBlocks: Number(formValues[1]) || 5,
            });
            saveAndBack(player, "§aNuker設定を保存しました。", "§aNuker settings saved.", () => back());
        });
    }
    static showBlockPlaceMenu(player, back) {
        const bp = currentConfig.BlockPlace;
        const illegalBlocks = bp.illegalBlocks ?? [];
        const resetBlocks = bp.resetBlocks ?? [];
        const airPlaceCfg = bp.airPlace ?? { enabled: true, punish: { type: "notify", seconds: 30 }, ignoreFaces: [] };
        const form = new ModalFormData()
            .title(t("§lBlockPlace 設定", "§lBlockPlace Settings"))
            .toggle(t("IllegalPlace 有効", "IllegalPlace enabled"), { defaultValue: bp.enabled })
            .toggle(t("不正ブロックの設置", "Illegal block placement"), { defaultValue: bp.illegalPlace })
            .toggle(t("ResetData §7(リストが空の時すべてのブロックのデータリセット)", "ResetData §7(All data is reset when list empty.)"), { defaultValue: bp.resetData })
            .toggle(t("不正なブロックインベントリ", "illegalContainer"), { defaultValue: bp.illegalcontainer });
        addListEditFields(form, illegalBlocks, t("§c§l設置禁止IDを追加", "§c§lAdd illegalBlock ID"), "minecraft:tnt", t("§c§l設置禁止IDを削除", "§c§lRemove illegalBlock"));
        addListEditFields(form, resetBlocks, t("§lリセット対象IDを追加", "§6§lAdd resetBlock ID"), "minecraft:frame", t("§lリセット対象IDを削除", "§6§lRemove resetBlock"));
        form.toggle(t("AirPlace 検知 (空中設置)", "§bAirPlace Detection §7(Place in air)"), { defaultValue: airPlaceCfg.enabled });
        form.show(player).then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return back();
            const [enabled, illegalPlace, resetData, illegalcontainer, illAdd, illRemoveIdx, resetAdd, resetRemoveIdx, airPlaceEnabled] = formValues;
            const newIllegal = parseListEdit(illAdd, illRemoveIdx, illegalBlocks);
            const newReset = parseListEdit(resetAdd, resetRemoveIdx, resetBlocks);
            patchConfig("BlockPlace", {
                enabled,
                illegalPlace,
                resetData,
                illegalcontainer,
                illegalBlocks: newIllegal,
                resetBlocks: newReset,
                airPlace: {
                    ...airPlaceCfg,
                    enabled: airPlaceEnabled,
                }
            });
            saveAndBack(player, `§a保存しました。設置禁止: ${newIllegal.length}件 / リセット対象: ${newReset.length}件 / AirPlace: ${airPlaceEnabled ? "ON" : "OFF"}`, `§aSaved. Illegal: ${newIllegal.length} / Reset: ${newReset.length} / AirPlace: ${airPlaceEnabled ? "ON" : "OFF"}`, () => back());
        });
    }
    static showIllegalItemMenu(player, back) {
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
                return back();
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
            saveAndBack(player, `§a保存しました。登録数: ${updated.length}`, `§aSaved. Entries: ${updated.length}`, () => back());
        });
    }
    static showEntityMenu(player, back) {
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
                return back();
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
            saveAndBack(player, "§a保存しました。", "§aSaved.", () => back());
        });
    }
    static showSpawnEggMenu(player, back) {
        const se = currentConfig.SpawnEgg;
        const eggs = se.illegalEggs ?? [];
        const form = new ModalFormData()
            .title(t("§lSpawnEgg 設定", "§lSpawnEgg Settings"))
            .toggle(t("スポーンエッグの使用拒否", "Deny use of spawn eggs"), { defaultValue: se.rejection })
            .toggle(t("スポーンエッグ使用時に通知", "Notify when a spawn egg is used"), { defaultValue: se.notice });
        addListEditFields(form, eggs, t("ID追加", "Add ID"), "", t("ID削除", "Remove ID"));
        form.show(player).then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return back();
            const [rejection, notice, addIdRaw, removeIdx] = formValues;
            const updated = parseListEdit(addIdRaw, removeIdx, eggs);
            patchConfig("SpawnEgg", { rejection, notice, illegalEggs: updated });
            saveAndBack(player, `§a保存しました。登録数: ${updated.length}`, `§aSaved. Entries: ${updated.length}`, () => back());
        });
    }
    static showAFKMenu(player, back) {
        const afk = currentConfig.AFK;
        new ModalFormData()
            .title(t("§lAFK 設定", "§lAFK Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: afk.enabled })
            .textField("Timeout (s)", "300", { defaultValue: afk.timeoutSeconds.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return back();
            patchConfig("AFK", { enabled: Boolean(formValues[0]), timeoutSeconds: Number(formValues[1]) || 300 });
            saveAndBack(player, "§a保存しました。", "§aSaved.", () => back());
        });
    }
    static showInstaBreakMenu(player, back) {
        const ib = currentConfig.InstaBreak;
        const blocks = ib.illegalBlocks ?? [];
        const form = new ModalFormData()
            .title(t("§lInstaBreak 設定", "§lInstaBreak Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: ib.enabled })
            .toggle(t("Cancel", "Cancel"), { defaultValue: ib.cancel });
        addListEditFields(form, blocks, t("追加ID", "Add ID"), "", t("削除ID", "Remove ID"));
        form.show(player).then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return back();
            const [enabled, cancel, addIdRaw, removeIdx] = formValues;
            const updated = parseListEdit(addIdRaw, removeIdx, blocks);
            patchConfig("InstaBreak", { enabled, cancel, illegalBlocks: updated });
            saveAndBack(player, `§a保存しました。登録数: ${updated.length}`, `§aSaved. Entries: ${updated.length}`, () => back());
        });
    }
}
