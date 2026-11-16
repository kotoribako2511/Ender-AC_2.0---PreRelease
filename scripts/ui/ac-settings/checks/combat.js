import { ModalFormData } from "@minecraft/server-ui";
import { currentConfig, patchConfig } from "../../../data/config.js";
import { t } from "../../../state.js";
import { TPSCalculator } from "../../../util/util.js";
import { saveAndBack } from "../../helpers.js";
export class CombatCheckMenus {
    static showReachMenu(player, back) {
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
                return back();
            const [enabled, hit, c_hit, brk, c_brk, plc, c_plc] = formValues;
            patchConfig("Reach", {
                enabled,
                hitThreshold: Number(hit) || 7.0, creative_hitThreshold: Number(c_hit) || 10.0,
                breakThreshold: Number(brk) || 6.0, creative_breakThreshold: Number(c_brk) || 7.5,
                placeThreshold: Number(plc) || 6.0, creative_placeThreshold: Number(c_plc) || 7.5,
            });
            saveAndBack(player, "§aReach設定を保存しました。", "§aReach settings saved.", () => back());
        });
    }
    static showKillauraMenu(player, back) {
        const k = currentConfig.Killaura;
        new ModalFormData()
            .title(t("§lKillaura 設定", "§lKillaura Settings"))
            .toggle(t("有効化", "Enabled"), { defaultValue: k.enabled })
            .textField("MultiHit", "2", { defaultValue: String(k.multiHitThreshold ?? 2) })
            .textField("Freeze (ticks)", "100", { defaultValue: String(k.freezeTicks) })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return back();
            patchConfig("Killaura", {
                enabled: Boolean(formValues[0]),
                multiHitThreshold: Number(formValues[1]) || 2,
                freezeTicks: Number(formValues[2]) || 100,
            });
            saveAndBack(player, "§aKillaura設定を保存しました。", "§aKillaura settings saved.", () => back());
        });
    }
    static showNoSwingMenu(player, back) {
        new ModalFormData()
            .title(t("§lNoSwing 設定", "§lNoSwing Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: currentConfig.NoSwing.enabled })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return back();
            patchConfig("NoSwing", { enabled: Boolean(formValues[0]) });
            saveAndBack(player, "§aNoSwing設定を保存しました。", "§aNoSwing settings saved.", () => back());
        });
    }
    static showCpsMenu(player, back) {
        const cps = currentConfig.cps;
        new ModalFormData()
            .title(t("§lAutoClicker 設定", "§lAutoClicker Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: cps.enabled })
            .textField("CPS Threshold", "30", { defaultValue: cps.cpsThreshold.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return back();
            patchConfig("cps", { enabled: Boolean(formValues[0]), cpsThreshold: Number(formValues[1]) || 30 });
            saveAndBack(player, "§a保存しました。", "§aSaved.", () => back());
        });
    }
    static showAutoTotemMenu(player, back) {
        const at = currentConfig.AutoTotem;
        new ModalFormData()
            .title(t("§lAutoTotem 設定", "§lAutoTotem Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: at.enabled })
            .textField("AutoTotem Threshold tick", "2", { defaultValue: at.threshold.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return back();
            patchConfig("AutoTotem", { enabled: Boolean(formValues[0]), threshold: Number(formValues[1]) || 2 });
            saveAndBack(player, "§a保存しました。", "§aSaved.", () => back());
        });
    }
}
