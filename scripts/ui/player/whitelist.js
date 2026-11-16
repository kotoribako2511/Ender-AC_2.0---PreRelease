import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { currentConfig, ConfigManager, WhitelistManager } from "../../data/config.js";
import { t } from "../../state.js";
export class WhitelistUI {
    static showWhitelistMenu(admin, back) {
        const wl = currentConfig.Whitelist ?? { enabled: false, players: [] };
        const statusStr = wl.enabled ? t("§a§l有効", "§a§lON") : t("§c§l無効", "§c§lOFF");
        new ActionFormData()
            .title(t("§lホワイトリスト管理", "§lWhitelist Management"))
            .body(t(`§lステータス: ${statusStr}\n§7登録人数: §e${wl.players.length}人\n§7サーバーオーナーは自動的に許可されます`, `§lStatus: ${statusStr}\n§7Players: §e${wl.players.length}\n§7Server owner is always allowed.`))
            .button(wl.enabled ? t("§a[ON] §r§lクリックでOFF", "§a[ON] §r§lclick to OFF") : t("§c[OFF] §r§lクリックでON", "§c[OFF] §r§lclick to ON"))
            .button(t("§lオンラインプレイヤーを追加", "§lAdd Online Player"))
            .button(t("§l手動で名前を入力して追加", "§lAdd by Name"))
            .button(t("§lホワイトリスト一覧・削除", "§lWhitelist List / Remove"))
            .button(t("§l戻る", "§lBack"))
            .show(admin)
            .then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return back();
            switch (selection) {
                case 0: {
                    ConfigManager.saveConfig({ ...currentConfig, Whitelist: { ...wl, enabled: !wl.enabled } });
                    admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§aホワイトリストを ${!wl.enabled ? "§a§l有効" : "§c§l無効"} §aに変更しました。`, `§aWhitelist ${!wl.enabled ? "§a§lENABLED" : "§c§lDISABLED"}§a.`));
                    return this.showWhitelistMenu(admin, back);
                }
                case 1: return this.showAddOnlineToWhitelist(admin, back);
                case 2: return this.showAddManualToWhitelist(admin, back);
                case 3: return this.showWhitelistList(admin, back);
                case 4: return back();
            }
        });
    }
    static showAddOnlineToWhitelist(admin, back) {
        const players = world.getPlayers();
        const unwhitelisted = players.filter((p) => !WhitelistManager.isWhitelisted(p.name));
        if (unwhitelisted.length === 0) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§7追加可能なオンラインプレイヤーがいません。", "§7No online players to add."));
            return this.showWhitelistMenu(admin, back);
        }
        new ModalFormData()
            .title(t("§lオンラインプレイヤーを追加", "§lAdd Online Player"))
            .dropdown("Select", unwhitelisted.map((p) => p.name), { defaultValueIndex: 0 })
            .show(admin)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showWhitelistMenu(admin, back);
            const target = unwhitelisted[Number(formValues[0])];
            if (target) {
                WhitelistManager.addWhitelist(target.name, target.id);
                admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§a${target.name} を追加しました。`, `§a${target.name} added.`));
            }
            this.showWhitelistMenu(admin, back);
        });
    }
    static showAddManualToWhitelist(admin, back) {
        new ModalFormData()
            .title(t("§l手動で追加", "§lAdd by Name"))
            .textField("MCID", t("例: Steve", "e.g. Steve"))
            .show(admin)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showWhitelistMenu(admin, back);
            const name = String(formValues[0] ?? "").trim();
            if (name) {
                WhitelistManager.addWhitelist(name);
                admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§a${name} を追加しました。`, `§a${name} added.`));
            }
            else {
                admin.sendMessage(`${currentConfig.System.prefix} ` + t("§c名前が入力されていません。", "§cNo name entered."));
            }
            this.showWhitelistMenu(admin, back);
        });
    }
    static showWhitelistList(admin, back) {
        const list = currentConfig.Whitelist?.players ?? [];
        if (list.length === 0) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§7ホワイトリストは空です。", "§7Whitelist is empty."));
            return this.showWhitelistMenu(admin, back);
        }
        new ModalFormData()
            .title(t("§lホワイトリスト一覧", "§lWhitelist List"))
            .dropdown("Select", list.map((p) => p.name), { defaultValueIndex: 0 })
            .show(admin)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showWhitelistMenu(admin, back);
            const target = list[Number(formValues[0])];
            if (target) {
                WhitelistManager.removeWhitelist(target.name);
                admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§a${target.name} を削除しました。`, `§a${target.name} removed.`));
            }
            this.showWhitelistMenu(admin, back);
        });
    }
}
