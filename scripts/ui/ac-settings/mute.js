import { ModalFormData } from "@minecraft/server-ui";
import { currentConfig, patchConfig } from "../../data/config.js";
import { t } from "../../state.js";
import { saveAndBack } from "../helpers.js";
export class MuteSettingsUI {
    static show(player, back) {
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
                return back();
            const [enabled, adminCanSee, ownerCanSee, notifyToStaff, muteMessage] = formValues;
            patchConfig("Mute", {
                enabled: Boolean(enabled),
                adminCanSee: Boolean(adminCanSee),
                ownerCanSee: Boolean(ownerCanSee),
                notifyToStaff: Boolean(notifyToStaff),
                muteMessage: String(muteMessage ?? "§cYou are muted."),
            });
            saveAndBack(player, "§aMute設定を保存しました。", "§aMute settings saved.", () => back());
        });
    }
}
