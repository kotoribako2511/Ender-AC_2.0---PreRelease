import { Player, Entity, EquipmentSlot } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { currentConfig } from "../data/config.js";
import { t } from "../state.js";
import { safeCall } from "../util/safe.js";
import { MC_ITEM, MC_PLAYER } from "../util/constants.js";

export class MobManagementUI {
    public static showMobManagement(player: Player): void {
        const entities = player.dimension.getEntities({ excludeTypes: [MC_PLAYER, MC_ITEM] });
        const groups = new Map<string, Entity[]>();
        for (const e of entities) {
            const list = groups.get(e.typeId);
            if (list) list.push(e);
            else groups.set(e.typeId, [e]);
        }
        const form = new ActionFormData()
            .title(t("§lモブ管理 (種類別)", "§lMob Management (by type)"))
            .body(t(
                `総エンティティ: §e${entities.length}体\n§7種類を選択すると操作メニューを表示します。`,
                `§7Total: §e${entities.length}\n§7Select a type to see actions.`,
            ));
        const keys = Array.from(groups.keys());
        for (const k of keys) form.button(`§l${k} - §e${groups.get(k)!.length}`);
        form.show(player).then(({ canceled, selection }) => {
            if (canceled || selection === undefined) {
                return import("./main-menu.js").then((m) => m.MainMenuUI.showMainMenu(player)).catch(() => { });
            }
            this.showMobActionMenu(player, keys[selection], groups.get(keys[selection])!);
        });
    }

    private static showMobActionMenu(player: Player, typeId: string, entities: Entity[]): void {
        const valid = entities.filter((e) => e.isValid);
        new ActionFormData()
            .title(`§l${typeId} ${t("の管理", "Management")}`)
            .body(t(
                `§7対象: §e${typeId}\n§7数: §e${valid.length}`,
                `§7Target: §e${typeId}\n§7Count: §e${valid.length}`,
            ))
            .button(t("§c§l一括削除", "§c§lRemove All"), "textures/ui/cancel")
            .button(t("§l個体リストを表示", "§lShow Individual List"))
            .button(t("§l戻る", "§lBack"))
            .show(player)
            .then(({ canceled, selection }) => {
                if (canceled || selection === undefined) return this.showMobManagement(player);
                if (selection === 0) {
                    let count = 0;
                    for (const e of valid) if (e.isValid) { safeCall(() => { e.remove(); count++; }); }
                    player.sendMessage(`${currentConfig.System.prefix} ` + t(
                        `§a${typeId} を ${count}体削除しました。`,
                        `§aRemoved ${count} ${typeId}.`,
                    ));
                    return this.showMobManagement(player);
                }
                if (selection === 1) this.showMobSubMenu(player, typeId, valid);
                else this.showMobManagement(player);
            });
    }

    private static showMobSubMenu(player: Player, typeId: string, entities: Entity[]): void {
        const form = new ActionFormData()
            .title(`§l${typeId} ${t("(個体リスト)", "(List)")}`)
            .body(t("§7選択してインベントリ等を確認できます。", "§7Select to view inventory etc."));
        for (const e of entities) {
            const hp = e.getComponent("minecraft:health")?.currentValue;
            form.button(`§l${e.typeId} §aHP: ${hp !== undefined ? Math.ceil(hp) : "?"}`);
        }
        form.button(t("§l戻る", "§lBack"));
        form.show(player).then(({ canceled, selection }) => {
            if (canceled || selection === undefined) return this.showMobActionMenu(player, typeId, entities);
            if (selection === entities.length) return this.showMobActionMenu(player, typeId, entities);
            this.showMobInventory(player, entities[selection]);
        });
    }

    private static showMobInventory(player: Player, target: Entity): void {
        if (!target.isValid) {
            player.sendMessage(`${currentConfig.System.prefix} ` + t("§cエンティティが見つかりません。", "§cEntity not found."));
            return this.showMobManagement(player);
        }
        const inv = target.getComponent("minecraft:inventory")?.container;
        const eq = target.getComponent("minecraft:equippable");
        const lines = [`§l${target.typeId}`, ""];
        if (inv) {
            lines.push(t("§e[インベントリ]", "§e[Inventory]"));
            let empty = true;
            for (let i = 0; i < inv.size; i++) {
                const item = inv.getItem(i);
                if (item) { lines.push(`Slot ${i}: §f${item.typeId} §7x${item.amount}`); empty = false; }
            }
            if (empty) lines.push(t("§7空です", "§7Empty"));
        }
        if (eq) {
            lines.push("", t("§e[装備]", "§e[Equipment]"));
            const slots = [
                EquipmentSlot.Mainhand,
                EquipmentSlot.Offhand,
                EquipmentSlot.Head,
                EquipmentSlot.Chest,
                EquipmentSlot.Legs,
                EquipmentSlot.Feet
            ];
            for (const s of slots) {
                safeCall(() => {
                    const item = eq.getEquipment(s);
                    if (item) lines.push(`${s}: §f${item.typeId} §7x${item.amount}`);
                });
            }
        }
        new ActionFormData()
            .title(`§l${target.typeId}`)
            .body(lines.join("\n"))
            .button(t("§cエンティティをキル", "§cKill Entity"))
            .button(t("§l戻る", "§lBack"))
            .show(player)
            .then(({ canceled, selection }) => {
                if (canceled || selection === undefined) return this.showMobManagement(player);
                if (selection === 0) {
                    try { target.kill(); } catch { target.remove(); }
                }
                this.showMobManagement(player);
            });
    }
}