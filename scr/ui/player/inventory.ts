import { world, Player } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { currentConfig } from "../../data/config.js";
import { t } from "../../state.js";
import { confirm, textInput, safeString } from "../helpers.js";
import { safeCall } from "../../util/safe.js";
import { getAllSlots, type ItemInformation } from "./inventory-helpers.js";

type Btn = { label: string; icon?: string; action: "reload" | "item" | "clear" | "ender" | "back"; data?: ItemInformation };
type LoreBtn = { label: string; icon?: string; action: "edit" | "add" | "back"; index?: number };

export class PlayerInventoryUI {
    public static async show(admin: Player, target: Player, back: () => void, message?: string): Promise<void> {
        if (!target.isValid) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cプレイヤーが見つかりません。", "§cPlayer not found."));
            return back();
        }
        const slotList = getAllSlots(target).filter((info) => info.slot?.hasItem());
        const buttons: Btn[] = [];
        buttons.push({ label: t("§l§1更新", "§l§1Reload"), icon: "textures/ui/refresh_light", action: "reload" });
        for (const info of slotList) {
            const item = info.slot.getItem();
            if (!item) continue;
            const slotLabel = typeof info.slotId === "number" ? `slot ${info.slotId}` : String(info.slotId);
            buttons.push({ label: `§0${safeString(item.typeId, 30)} - §l§e${slotLabel}, §8x${item.amount}`, action: "item", data: info });
        }
        buttons.push({ label: t("§l§c全削除", "§l§cClear all"), icon: "textures/ui/icon_trash", action: "clear" });
        buttons.push({ label: t("§l§cエンダーチェスト全削除", "§l§cClear enderchest"), icon: "textures/blocks/ender_chest_front", action: "ender" });
        buttons.push({ label: t("§l戻る", "§lBack"), icon: "textures/ui/realms_red_x", action: "back" });
        const form = new ActionFormData()
            .title(t(`§l${target.name} のインベントリ`, `§l${target.name}'s Inventory`))
            .body(message ?? t(`アイテム数: §e${slotList.length}`, `Items: §e${slotList.length}`));
        for (const b of buttons) form.button(b.label, b.icon);
        const { canceled, selection } = await form.show(admin);
        if (canceled || selection === undefined) return;
        const entry = buttons[selection];
        if (!entry) return;
        if (entry.action === "reload") return this.show(admin, target, back);
        if (entry.action === "back") return back();
        if (entry.action === "clear") {
            const ok = await confirm(admin, {
                title: t("§4§l全アイテム削除", "§4§lClear All Items"),
                body: t(`§c${target.name}§r の全てのアイテムを削除しますか？`, `Clear all items from ${target.name}?`),
                yes: t("§c削除する", "§cDelete"),
            });
            if (ok) {
                safeCall(() => target.runCommand("clear @s"));
                admin.sendMessage(`${currentConfig.System.prefix} ` + t(`${target.name} の全てのアイテムを削除しました`, `Cleared all items from ${target.name}`));
            }
            return this.show(admin, target, back);
        }
        if (entry.action === "ender") {
            const ok = await confirm(admin, {
                title: t("§4§lエンダーチェスト全削除", "§4§lClear Ender Chest"),
                body: t(`§c${target.name}§r のエンダーチェストを空にしますか？`, `Clear ender chest of ${target.name}?`),
                yes: t("§c削除する", "§cDelete"),
            });
            if (ok) {
                const ec = target.getComponent("minecraft:ender_inventory");
                if (ec?.container) {
                    for (let i = 0; i < ec.container.size; i++) ec.container.setItem(i, undefined);
                } else {
                    safeCall(() => target.runCommand("function util/clear_ec"));
                }
                admin.sendMessage(`${currentConfig.System.prefix} ` + t(`${target.name} のエンダーチェストを空にしました`, `Cleared ender chest of ${target.name}`));
            }
            return this.show(admin, target, back);
        }
        if (entry.action === "item" && entry.data) {
            if (!entry.data.slot.hasItem()) return this.show(admin, target, back, t("§cアイテムが移動されています", "§cItem has been moved"));
            return this.showItemInfo(admin, target, entry.data, back);
        }
    }

    private static async showItemInfo(admin: Player, target: Player, info: ItemInformation, back: () => void): Promise<void> {
        const item = info.slot.getItem();
        if (!item) return this.show(admin, target, back, t("§cアイテムが移動されています", "§cItem has been moved"));
        const slotLabel = String(info.slotId);
        const body = [
            `§7owner: §r${target.name}`,
            `§7item: §r${item.typeId}`,
            `§7slot: §r${slotLabel}`,
            `§7amount: §r${item.amount}`,
            `§7nameTag: §r${item.nameTag?.replace(/\n/g, "\\n") ?? "§7-"}`,
        ].join("§r\n");
        const { canceled, selection } = await new ActionFormData()
            .title(t("§lアイテム情報", "§lItem Info"))
            .body(body)
            .button(t("§l削除", "§lDelete"), "textures/ui/icon_trash")
            .button(t("§l転送", "§lTransfer"), "textures/ui/icon_import")
            .button(t("§l名前を編集", "§lEdit NameTag"))
            .button(t("§l説明文を編集", "§lEdit Lore"))
            .button(t("§l戻る", "§lBack"), "textures/ui/realms_red_x")
            .show(admin);
        if (canceled || selection === undefined) return;
        if (item.typeId !== info.slot.typeId) return this.show(admin, target, back, t("§cアイテムが移動されています", "§cItem has been moved"));
        if (selection === 0) {
            info.slot.setItem();
            admin.sendMessage(`${currentConfig.System.prefix} ` + t(`[${target.name}] ${item.typeId} を削除しました`, `[${target.name}] Deleted ${item.typeId}`));
            return this.show(admin, target, back);
        }
        if (selection === 1) return this.showTransferItem(admin, target, info, back);
        if (selection === 2) return this.showEditNameTag(admin, target, info, back);
        if (selection === 3) return this.showEditLore(admin, target, info, back);
        if (selection === 4) return this.show(admin, target, back);
    }

    private static async showTransferItem(admin: Player, target: Player, info: ItemInformation, back: () => void): Promise<void> {
        const item = info.slot.getItem();
        if (!item) return this.show(admin, target, back, t("§cアイテムが移動されています", "§cItem has been moved"));

        const players = world.getPlayers()
            .slice()
            .sort((a, b) => {
                const aIsAdmin = a.id === admin.id;
                const bIsAdmin = b.id === admin.id;
                if (aIsAdmin && !bIsAdmin) return -1;
                if (!aIsAdmin && bIsAdmin) return 1;
                return a.name.localeCompare(b.name);
            });

        const { canceled, formValues } = await new ModalFormData()
            .title(t(`転送 [${item.typeId}]`, `Transfer [${item.typeId}]`))
            .dropdown(t("転送先", "Destination"), players.map((p) => p.name), { defaultValueIndex: 0 })
            .toggle(t("§c複製", "§cDuplicate"), { defaultValue: false })
            .show(admin);

        if (canceled || !formValues) return this.show(admin, target, back);

        if (item.typeId !== info.slot.typeId) {
            return this.show(admin, target, back, t("§cアイテムが移動されています", "§cItem has been moved"));
        }

        const dest = players[Number(formValues[0])];
        const duplicate = Boolean(formValues[1]);
        if (!dest) return this.show(admin, target, back);

        try {
            const container = dest.getComponent("minecraft:inventory")?.container;
            if (!container) throw new Error("No inventory container");
            container.addItem(item.clone());
            if (!duplicate) info.slot.setItem();
        } catch {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§c転送に失敗しました", "§cTransfer failed"));
            return this.show(admin, target, back);
        }

        admin.sendMessage(`${currentConfig.System.prefix} ` + t(
            `[${target.name} >> ${dest.name}] ${item.typeId} を${duplicate ? "複製" : "転送"}しました`,
            `[${target.name} >> ${dest.name}] ${duplicate ? "Duplicated" : "Transferred"} ${item.typeId}`,
        ));

        this.show(admin, target, back);
    }

    private static async showEditNameTag(admin: Player, target: Player, info: ItemInformation, back: () => void): Promise<void> {
        const item = info.slot.getItem();
        if (!item) return this.show(admin, target, back, t("§cアイテムが移動されています", "§cItem has been moved"));
        const { canceled, value } = await textInput(admin, {
            title: t(`NameTag 編集 [${item.typeId}]`, `Edit NameTag [${item.typeId}]`),
            label: "NameTag",
            placeholder: "NameTag",
            defaultValue: item.nameTag ?? "",
        });
        if (canceled) return this.showItemInfo(admin, target, info, back);
        if (item.typeId !== info.slot.typeId) return this.show(admin, target, back, t("§cアイテムが移動されています", "§cItem has been moved"));
        item.nameTag = value.length > 0 ? value : undefined;
        info.slot.setItem(item);
        this.showItemInfo(admin, target, info, back);
    }

    private static async showEditLore(admin: Player, target: Player, info: ItemInformation, back: () => void): Promise<void> {
        const item = info.slot.getItem();
        if (!item) return this.show(admin, target, back, t("§cアイテムが移動されています", "§cItem has been moved"));
        const lores = item.getLore();
        const canAdd = lores.length < 20;
        const buttons: LoreBtn[] = [];
        lores.forEach((lore, i) => buttons.push({ label: `§0${i}: "${safeString(lore.replace(/\n/g, "\\n"), 30)}§r§0"`, action: "edit", index: i }));
        if (canAdd) buttons.push({ label: t("§a§l追加", "§a§lAdd"), icon: "textures/ui/color_plus", action: "add" });
        buttons.push({ label: t("§l戻る", "§lBack"), icon: "textures/ui/realms_red_x", action: "back" });
        const form = new ActionFormData()
            .title(t(`Lore 編集 [${item.typeId}]`, `Edit Lore [${item.typeId}]`))
            .body(t(`現在: §e${lores.length} / 20`, `Current: §e${lores.length} / 20`));
        for (const b of buttons) form.button(b.label, b.icon);
        const { canceled, selection } = await form.show(admin);
        if (canceled || selection === undefined) return;
        const entry = buttons[selection];
        if (!entry) return;
        if (entry.action === "back") return this.showItemInfo(admin, target, info, back);
        if (entry.action === "add") return this.showEditLoreValue(admin, target, info, -1, back);
        if (entry.action === "edit" && entry.index !== undefined) return this.showEditLoreValue(admin, target, info, entry.index, back);
    }

    private static async showEditLoreValue(admin: Player, target: Player, info: ItemInformation, loreIndex: number, back: () => void): Promise<void> {
        const item = info.slot.getItem();
        if (!item) return this.show(admin, target, back, t("§cアイテムが移動されています", "§cItem has been moved"));
        const lores = item.getLore();
        const isNew = loreIndex < 0;
        const { canceled, value, deleteValue } = await textInput(admin, {
            title: isNew ? t("§lLore 追加", "§lAdd Lore") : t(`§lLore [${loreIndex}]`, `§lLore [${loreIndex}]`),
            label: "Lore",
            placeholder: "Lore",
            defaultValue: isNew ? "" : (lores[loreIndex] ?? ""),
            allowDelete: !isNew,
        });
        if (canceled) return this.showEditLore(admin, target, info, back);
        if (item.typeId !== info.slot.typeId) return this.show(admin, target, back, t("§cアイテムが移動されています", "§cItem has been moved"));
        const newLores = [...lores];
        if (deleteValue && !isNew) newLores.splice(loreIndex, 1);
        else if (value.length > 50) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cLoreは50文字以内にしてください", "§cLore must be 50 characters or less"));
            return this.showEditLoreValue(admin, target, info, loreIndex, back);
        } else if (isNew) {
            if (value.length > 0) newLores.push(value);
        } else {
            newLores[loreIndex] = value;
        }
        item.setLore(newLores);
        info.slot.setItem(item);
        this.showEditLore(admin, target, info, back);
    }
}