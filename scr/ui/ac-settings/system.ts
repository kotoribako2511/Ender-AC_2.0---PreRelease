import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { currentConfig, patchConfig } from "../../data/config.js";
import { t, isDebugMode, setDebugMode } from "../../state.js";
import { saveAndBack } from "../helpers.js";

export class SystemSettingsUI {
    public static showSystemMenu(player: Player, back: () => void): void {
        const s = currentConfig.System;
        new ModalFormData()
            .title(t("§lSystem 設定", "§lSystem Settings"))
            .toggle(t("自動OP解除", "Auto de-op"), { defaultValue: s.autoDeop ?? true })
            .toggle(t("§cデバッグモード", "§cDebug mode"), { defaultValue: isDebugMode() })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return back();
                setDebugMode(Boolean(formValues[1]));
                patchConfig("System", { autoDeop: Boolean(formValues[0]) });
                saveAndBack(player, "§aSystem設定を保存しました。", "§aSystem settings saved.", () => back());
            });
    }

    public static showGameModeChangeMenu(player: Player, back: () => void): void {
        const s = currentConfig.System;
        new ModalFormData()
            .title(t("§lGameMode変更通知 設定", "§lGameMode Change Notice Settings"))
            .toggle(
                t("§6通知を有効化 §7(全設定のマスター)", "§6Enable notification §7(master switch)"),
                { defaultValue: s.GMChangeNoticeEnabled ?? true }
            )
            .toggle(
                t("コンソールに出力", "Console output"),
                { defaultValue: s.GMConsoleNotice }
            )
            .toggle(
                t("全体チャットに通知", "World chat notification"),
                { defaultValue: s.GMWorldNotice }
            )
            .toggle(
                t("§eスタッフのみに通知 §7(Admin/Owner/OP)", "§eStaff only §7(Admin/Owner/OP)"),
                { defaultValue: s.GMStaffNotice ?? false }
            )
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return back();
                const [enabled, consoleNotice, worldNotice, staffNotice] =
                    formValues as [boolean, boolean, boolean, boolean];
                patchConfig("System", {
                    GMChangeNoticeEnabled: enabled,
                    GMConsoleNotice: consoleNotice,
                    GMWorldNotice: worldNotice,
                    GMStaffNotice: staffNotice,
                });
                saveAndBack(
                    player,
                    "§aGameMode変更通知の設定を保存しました。",
                    "§aGameMode change notice settings saved.",
                    () => back(),
                );
            });
    }
}