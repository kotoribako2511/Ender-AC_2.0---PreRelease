import { Player } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { currentConfig, patchConfig } from "../../data/config.js";
import { t } from "../../state.js";
import { DetectionType, ALL_DETECTION_TYPES, DETECTION_LABELS } from "../../permission.js";
import { saveAndBack } from "../helpers.js";

export class PermissionUI {
    public static show(player: Player, back: () => void): void {
        const perms = currentConfig.Permissions?.bypass ?? {};
        const form = new ActionFormData()
            .title("§lPermission")
            .body(t(
                "§7各検知ごとに Owner / Admin のバイパス設定をします。",
                "§7Configure per-detection bypass for Owner / Admin.",
            ));
        ALL_DETECTION_TYPES.forEach((det) => {
            const cfg = perms[det] ?? { owner: true, admin: false };
            const ownerStr = cfg.owner ? "§aO:ON" : "§cO:OFF";
            const adminStr = cfg.admin ? "§aA:ON" : "§cA:OFF";
            form.button(`§l${DETECTION_LABELS[det] ?? det} - ${ownerStr} §7| ${adminStr}`);
        });
        form.button(t("§l戻る", "§lBack"));
        form.show(player).then(({ canceled, selection }) => {
            if (canceled || selection === undefined) return back();
            if (selection === ALL_DETECTION_TYPES.length) return back();
            this.showDetectionBypassEditor(player, ALL_DETECTION_TYPES[selection], back);
        });
    }

    private static showDetectionBypassEditor(player: Player, detection: DetectionType, back: () => void): void {
        const perms = currentConfig.Permissions?.bypass ?? {};
        const cfg = perms[detection] ?? { owner: true, admin: false };
        const label = DETECTION_LABELS[detection] ?? detection;
        new ModalFormData()
            .title(t(`§l${label} バイパス設定`, `§l${label} Bypass`))
            .toggle(t("§6Owner バイパス", "§6Owner bypass"), { defaultValue: cfg.owner })
            .toggle(t("§eAdmin バイパス", "§eAdmin bypass"), { defaultValue: cfg.admin })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return this.show(player, back);
                patchConfig("Permissions", {
                    bypass: { ...perms, [detection]: { owner: Boolean(formValues[0]), admin: Boolean(formValues[1]) } },
                });
                saveAndBack(
                    player,
                    `§a${label} のバイパス設定を保存しました。`,
                    `§aSaved bypass settings for ${label}.`,
                    () => this.show(player, back),
                );
            });
    }
}