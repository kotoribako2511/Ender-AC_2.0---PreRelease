import { Player } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { currentConfig, patchConfig } from "../../../data/config.js";
import { t } from "../../../state.js";
import { notify } from "../../../util/notify.js";
import { saveAndBack } from "../../helpers.js";

export class ChatCheckMenus {
    public static showChatMenu(player: Player, back: () => void): void {
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
                if (canceled || selection === undefined) return back();
                if (selection === 0) return this.showChatLimitSettings(player, back);
                if (selection === 1) return this.showAddBannedWord(player, back);
                if (selection === 2) return this.showRemoveBannedWord(player, back);
                back();
            });
    }

    private static showChatLimitSettings(player: Player, back: () => void): void {
        const c = currentConfig.Chat;
        new ModalFormData()
            .title(t("§lチャット制限設定", "§lChat Limit Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: c.chatLimitEnabled })
            .textField("Max length", "150", { defaultValue: c.maxLength.toString() })
            .textField("Cooldown (ms)", "1000", { defaultValue: c.cooldownMs.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return this.showChatMenu(player, back);
                patchConfig("Chat", {
                    chatLimitEnabled: Boolean(formValues[0]),
                    maxLength: Number(formValues[1]) || 150,
                    cooldownMs: Number(formValues[2]) || 1000,
                });
                saveAndBack(player, "§aチャット制限設定を保存しました。", "§aChat limit settings saved.", () => this.showChatMenu(player, back));
            });
    }

    private static showAddBannedWord(player: Player, back: () => void): void {
        new ModalFormData()
            .title(t("§l禁止ワードの追加", "§lAdd Banned Word"))
            .textField("Word", "")
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return this.showChatMenu(player, back);
                const word = String(formValues[0] ?? "").trim();
                if (!word) {
                    notify(player, t("§cワードが入力されていません。", "§cNo word entered."));
                    return this.showChatMenu(player, back);
                }
                const words = currentConfig.Chat.bannedWords || [];
                if (words.includes(word)) {
                    notify(player, t("§cそのワードは既に追加されています。", "§cThat word is already added."));
                    return this.showChatMenu(player, back);
                }
                patchConfig("Chat", { bannedWords: [...words, word] });
                saveAndBack(player, `§a「${word}」を追加しました。`, `§aAdded "${word}".`, () => this.showChatMenu(player, back));
            });
    }

    private static showRemoveBannedWord(player: Player, back: () => void): void {
        const words = currentConfig.Chat.bannedWords || [];
        if (words.length === 0) {
            notify(player, t("§7禁止ワードは設定されていません。", "§7No banned words configured."));
            return this.showChatMenu(player, back);
        }
        new ModalFormData()
            .title(t("§l禁止ワードの削除", "§lRemove Banned Word"))
            .dropdown("Select", words, { defaultValueIndex: 0 })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return this.showChatMenu(player, back);
                const index = Number(formValues[0]);
                const removed = words[index];
                patchConfig("Chat", { bannedWords: words.filter((_, i) => i !== index) });
                saveAndBack(player, `§a「${removed}」を削除しました。`, `§aRemoved "${removed}".`, () => this.showChatMenu(player, back));
            });
    }
}