import { ModalFormData } from "@minecraft/server-ui";
import { banList, BanManager } from "../../data/config.js";
import { AdminActionLogManager } from "../../log.js";
import { formatRemaining } from "../../command/command.js";
import { currentConfig } from "../../data/config.js";
import { t } from "../../state.js";
export class BanUI {
    static showBanRemove(admin, back) {
        if (banList.length === 0) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§7banリストは空です。", "§7Ban list is empty."));
            return back();
        }
        const info = BanManager.getStorageInfo();
        const options = banList.map((b) => `${b.name} - ${formatRemaining(b.expireAt)}`);
        new ModalFormData()
            .title(t("§lBan解除", "§lUnban"))
            .dropdown(t(`BAN容量: ${info.bytes}/${info.maxBytes}B (${info.percent}%)`, `Ban storage: ${info.bytes}/${info.maxBytes}B (${info.percent}%)`), options, { defaultValueIndex: 0 })
            .show(admin)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return back();
            const targetBan = banList[Number(formValues[0])];
            if (!targetBan)
                return this.showBanRemove(admin, back);
            BanManager.removeBanList(targetBan.persistentId, targetBan.name);
            AdminActionLogManager.addLog({
                time: Date.now(), admin: admin.name,
                action: "unban", target: targetBan.name,
                targetId: targetBan.persistentId, reason: "Unban via UI",
            });
            admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§a${targetBan.name} のBANを解除しました。`, `§aUnbanned ${targetBan.name}.`));
            this.showBanRemove(admin, back);
        });
    }
}
