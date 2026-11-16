import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { currentConfig, patchConfig } from "../../data/config.js";
import { t } from "../../state.js";
import { PlayerManagementUI } from "../player/player.js";
import { notify } from "../../util/notify.js";
import { saveAndBack } from "../helpers.js";
export class TeleportUI {
    static show(player, back, backToPlayerManagement) {
        const tp = currentConfig.Teleport ?? { enabled: false, speedMultiplier: 3.0, minimumDistance: 5.0, safeZones: [] };
        const goBack = () => backToPlayerManagement ? PlayerManagementUI.PlayerCategory(player) : back();
        new ActionFormData()
            .title(t("§lTeleport 設定", "§lTeleport Settings"))
            .body(t(`§7有効: ${tp.enabled ? "§aON" : "§cOFF"}\n§7速度倍率: §e${tp.speedMultiplier ?? 3.0}x\n§7最小距離: §e${tp.minimumDistance ?? 5.0}\n§7セーフゾーン数: §e${(tp.safeZones ?? []).length}\n\n§7移動距離が「速度 × 倍率」または「最小距離」を超えた場合に検知します。\n§7セーフゾーン内のテレポートは許可されます。`, `§7Enabled: ${tp.enabled ? "§aON" : "§cOFF"}\n§7Speed multiplier: §e${tp.speedMultiplier ?? 3.0}x\n§7Minimum distance: §e${tp.minimumDistance ?? 5.0}\n§7Safe zones: §e${(tp.safeZones ?? []).length}`))
            .button(t("§l基本設定", "§lBasic Settings"))
            .button(t("§b§lセーフゾーン管理", "§b§lSafe Zone Management"))
            .button(t("§l戻る", "§lBack"))
            .show(player)
            .then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return goBack();
            if (selection === 0)
                return this.showBasicSettings(player, back, backToPlayerManagement);
            if (selection === 1)
                return this.showSafeZoneMenu(player, back, backToPlayerManagement);
            goBack();
        });
    }
    static showBasicSettings(player, back, backToPlayerManagement) {
        const tp = currentConfig.Teleport;
        new ModalFormData()
            .title(t("§lTeleport 基本設定", "§lTeleport Basic Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: tp.enabled })
            .textField(t("速度と移動距離の許容誤差", "Allowable margins of error for speed and travel distance"), "2.0", { defaultValue: String(tp.allowableError) })
            .textField(t("速度倍率", "Speed multiplier"), "3.0", { defaultValue: String(tp.speedMultiplier) })
            .textField(t("最小距離", "Minimum distance"), "5.0", { defaultValue: String(tp.minimumDistance) })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.show(player, back, backToPlayerManagement);
            patchConfig("Teleport", {
                enabled: Boolean(formValues[0]),
                allowableError: Number(formValues[1]) - 1 || 1.5,
                speedMultiplier: Number(formValues[2]) || 3.0,
                minimumDistance: Number(formValues[3]) || 5.0,
            });
            saveAndBack(player, "§aTeleport設定を保存しました。", "§aTeleport settings saved.", () => this.show(player, back, backToPlayerManagement));
        });
    }
    static showSafeZoneMenu(player, back, backToPlayerManagement) {
        const zones = currentConfig.Teleport?.safeZones ?? [];
        new ActionFormData()
            .title(t("§lセーフゾーン管理", "§lSafe Zone Management"))
            .body(t(`§7登録数: §e${zones.length}`, `§7Registered: §e${zones.length}`))
            .button(t("§a§l現在地を追加", "§a§lAdd Current Position"), "textures/ui/icon_map")
            .button(t("§b§l座標を手動入力", "§b§lAdd by Coordinates"))
            .button(t("§b§l一覧・削除", "§b§lList / Remove"))
            .button(t("§l戻る", "§lBack"))
            .show(player)
            .then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return this.show(player, back, backToPlayerManagement);
            if (selection === 0)
                return this.addSafeZoneFromCurrentPos(player, back, backToPlayerManagement);
            if (selection === 1)
                return this.addSafeZoneManually(player, back, backToPlayerManagement);
            if (selection === 2)
                return this.showSafeZoneList(player, back, backToPlayerManagement);
            this.show(player, back, backToPlayerManagement);
        });
    }
    static addSafeZoneFromCurrentPos(player, back, backToPlayerManagement) {
        const loc = player.location;
        const dim = player.dimension.id;
        const dimShort = dim.replace("minecraft:", "");
        new ModalFormData()
            .title(t("§lセーフゾーン追加 (現在地)", "§lAdd Safe Zone (Current Position)"))
            .textField(t(`名前 (第一地点: ${loc.x.toFixed(1)}, ${loc.y.toFixed(1)}, ${loc.z.toFixed(1)} / ${dimShort})`, `Name (corner 1: ${loc.x.toFixed(1)}, ${loc.y.toFixed(1)}, ${loc.z.toFixed(1)} / ${dimShort})`), "Spawn")
            .textField(t("X2", "X2"), "0", { defaultValue: loc.x.toFixed(2) })
            .textField(t("Y2", "Y2"), "0", { defaultValue: loc.y.toFixed(2) })
            .textField(t("Z2", "Z2"), "0", { defaultValue: loc.z.toFixed(2) })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showSafeZoneMenu(player, back, backToPlayerManagement);
            const name = String(formValues[0] ?? "").trim() || `Zone_${Date.now()}`;
            const x2 = Number(formValues[1]);
            const y2 = Number(formValues[2]);
            const z2 = Number(formValues[3]);
            if (isNaN(x2) || isNaN(y2) || isNaN(z2)) {
                notify(player, t("§c座標が不正です。", "§cInvalid coordinates."));
                return this.addSafeZoneFromCurrentPos(player, back, backToPlayerManagement);
            }
            const zones = [...(currentConfig.Teleport?.safeZones ?? [])];
            zones.push({ name, x1: loc.x, y1: loc.y, z1: loc.z, x2, y2, z2, dim });
            patchConfig("Teleport", { safeZones: zones });
            saveAndBack(player, `§aセーフゾーン「${name}」を追加しました。`, `§aAdded safe zone "${name}".`, () => this.showSafeZoneMenu(player, back, backToPlayerManagement));
        });
    }
    static addSafeZoneManually(player, back, backToPlayerManagement) {
        const loc = player.location;
        const dim = player.dimension.id;
        new ModalFormData()
            .title(t("§lセーフゾーン追加 (手動入力)", "§lAdd Safe Zone (Manual)"))
            .textField(t("名前", "Name"), "Spawn")
            .textField(t("X1", "X1"), "0", { defaultValue: loc.x.toFixed(2) })
            .textField(t("Y1", "Y1"), "0", { defaultValue: loc.y.toFixed(2) })
            .textField(t("Z1", "Z1"), "0", { defaultValue: loc.z.toFixed(2) })
            .textField(t("X2", "X2"), "0", { defaultValue: loc.x.toFixed(2) })
            .textField(t("Y2", "Y2"), "0", { defaultValue: loc.y.toFixed(2) })
            .textField(t("Z2", "Z2"), "0", { defaultValue: loc.z.toFixed(2) })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showSafeZoneMenu(player, back, backToPlayerManagement);
            const name = String(formValues[0] ?? "").trim() || `Zone_${Date.now()}`;
            const x1 = Number(formValues[1]), y1 = Number(formValues[2]), z1 = Number(formValues[3]);
            const x2 = Number(formValues[4]), y2 = Number(formValues[5]), z2 = Number(formValues[6]);
            if (isNaN(x1) || isNaN(y1) || isNaN(z1) || isNaN(x2) || isNaN(y2) || isNaN(z2)) {
                notify(player, t("§c座標が不正です。", "§cInvalid coordinates."));
                return this.addSafeZoneManually(player, back, backToPlayerManagement);
            }
            const zones = [...(currentConfig.Teleport?.safeZones ?? [])];
            zones.push({ name, x1, y1, z1, x2, y2, z2, dim });
            patchConfig("Teleport", { safeZones: zones });
            saveAndBack(player, `§aセーフゾーン「${name}」を追加しました。`, `§aAdded safe zone "${name}".`, () => this.showSafeZoneMenu(player, back, backToPlayerManagement));
        });
    }
    static showSafeZoneList(player, back, backToPlayerManagement) {
        const zones = currentConfig.Teleport?.safeZones ?? [];
        if (zones.length === 0) {
            notify(player, t("§7セーフゾーンは登録されていません。", "§7No safe zones registered."));
            return this.showSafeZoneMenu(player, back, backToPlayerManagement);
        }
        const options = zones.map((z) => {
            const minX = Math.min(z.x1, z.x2);
            const maxX = Math.max(z.x1, z.x2);
            const minY = Math.min(z.y1, z.y2);
            const maxY = Math.max(z.y1, z.y2);
            const minZ = Math.min(z.z1, z.z2);
            const maxZ = Math.max(z.z1, z.z2);
            return `${z.name} (${minX.toFixed(0)}, ${minY.toFixed(0)}, ${minZ.toFixed(0)}) - (${maxX.toFixed(0)}, ${maxY.toFixed(0)}, ${maxZ.toFixed(0)})`;
        });
        new ModalFormData()
            .title(t("§lセーフゾーン一覧・削除", "§lSafe Zone List / Remove"))
            .dropdown(t("削除するゾーンを選択", "Select zone to remove"), options, { defaultValueIndex: 0 })
            .show(player)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showSafeZoneMenu(player, back, backToPlayerManagement);
            const idx = Number(formValues[0]);
            if (!zones[idx])
                return this.showSafeZoneMenu(player, back, backToPlayerManagement);
            patchConfig("Teleport", { safeZones: zones.filter((_, i) => i !== idx) });
            saveAndBack(player, `§aセーフゾーン「${zones[idx].name}」を削除しました。`, `§aRemoved safe zone "${zones[idx].name}".`, () => this.showSafeZoneMenu(player, back, backToPlayerManagement));
        });
    }
}
