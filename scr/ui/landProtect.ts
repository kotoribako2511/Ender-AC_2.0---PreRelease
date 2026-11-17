import { Player } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { currentConfig, ConfigManager } from "../data/config.js";
import { LandProtectZone } from "../data/type.js";
import { t } from "../state.js";
import { notify } from "../util/notify.js";

export class LandProtectUI {
    public static show(player: Player, back: () => void): void {
        const cfg = currentConfig.LandProtect ?? { enabled: true, zones: [] };
        const status = cfg.enabled ? "§aON" : "§cOFF";
        new ActionFormData()
            .title(t("§l土地保護設定", "§lLand Protection Settings"))
            .body(t(
                `§7有効: ${status}\n§7保護区域数: §e${cfg.zones.length}\n\n§7土地保護区域の追加・編集を行います。`,
                `§7Enabled: ${status}\n§7Zones: §e${cfg.zones.length}\n\n§7Add or edit land protection zones.`
            ))
            .button(t(`§l機能を${cfg.enabled ? "無効" : "有効"}にする`, `§lToggle Feature (Currently ${cfg.enabled ? "ON" : "OFF"})`))
            .button(t("§a§l現在地から区域を追加", "§a§lAdd Zone from Current Position"))
            .button(t("§b§l座標を手動入力して追加", "§b§lAdd Zone by Coordinates"))
            .button(t("§b§l区域一覧・編集", "§b§lList / Edit Zones"))
            .button(t("§l戻る", "§lBack"))
            .show(player)
            .then(({ canceled, selection }) => {
                if (canceled || selection === undefined) return back();
                if (selection === 0) {
                    ConfigManager.saveConfig({ ...currentConfig, LandProtect: { ...cfg, enabled: !cfg.enabled } });
                    notify(player, t(`§aLandProtectを ${!cfg.enabled ? "有効" : "無効"} にしました。`, `§aLandProtect set to ${!cfg.enabled ? "ON" : "OFF"}.`));
                    return this.show(player, back);
                }
                if (selection === 1) return this.addZoneCurrent(player, back);
                if (selection === 2) return this.addZoneManual(player, back);
                if (selection === 3) return this.showZoneList(player, back);
                back();
            });
    }

    private static addZoneCurrent(player: Player, back: () => void): void {
        const loc = player.location;
        const dim = player.dimension.id;
        const dimShort = dim.replace("minecraft:", "");
        new ModalFormData()
            .title(t("§l区域追加 (現在地)", "§lAdd Zone (Current Pos)"))
            .textField(t(`名前 (第一地点: ${loc.x.toFixed(1)}, ${loc.y.toFixed(1)}, ${loc.z.toFixed(1)} / ${dimShort})`, `Name (corner 1: ${loc.x.toFixed(1)}, ${loc.y.toFixed(1)}, ${loc.z.toFixed(1)} / ${dimShort})`), "Zone")
            .textField("X2", "0", { defaultValue: loc.x.toFixed(2) })
            .textField("Y2", "0", { defaultValue: loc.y.toFixed(2) })
            .textField("Z2", "0", { defaultValue: loc.z.toFixed(2) })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return this.show(player, back);
                const name = String(formValues[0] ?? "").trim() || `Zone_${Date.now()}`;
                const x2 = Number(formValues[1]), y2 = Number(formValues[2]), z2 = Number(formValues[3]);
                if (isNaN(x2) || isNaN(y2) || isNaN(z2)) {
                    notify(player, t("§c座標が不正です", "§cInvalid coords"));
                    return this.addZoneCurrent(player, back);
                }
                this.saveNewZone(player, name, loc.x, loc.y, loc.z, x2, y2, z2, dim, back);
            });
    }

    private static addZoneManual(player: Player, back: () => void): void {
        const loc = player.location;
        const dim = player.dimension.id;
        new ModalFormData()
            .title(t("§l区域追加 (手動)", "§lAdd Zone (Manual)"))
            .textField(t("名前", "Name"), "Zone")
            .textField("X1", "0", { defaultValue: loc.x.toFixed(2) })
            .textField("Y1", "0", { defaultValue: loc.y.toFixed(2) })
            .textField("Z1", "0", { defaultValue: loc.z.toFixed(2) })
            .textField("X2", "0", { defaultValue: loc.x.toFixed(2) })
            .textField("Y2", "0", { defaultValue: loc.y.toFixed(2) })
            .textField("Z2", "0", { defaultValue: loc.z.toFixed(2) })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return this.show(player, back);
                const name = String(formValues[0] ?? "").trim() || `Zone_${Date.now()}`;
                const x1 = Number(formValues[1]), y1 = Number(formValues[2]), z1 = Number(formValues[3]);
                const x2 = Number(formValues[4]), y2 = Number(formValues[5]), z2 = Number(formValues[6]);
                if (isNaN(x1) || isNaN(y1) || isNaN(z1) || isNaN(x2) || isNaN(y2) || isNaN(z2)) {
                    notify(player, t("§c座標が不正です", "§cInvalid coords"));
                    return this.addZoneManual(player, back);
                }
                this.saveNewZone(player, name, x1, y1, z1, x2, y2, z2, dim, back);
            });
    }

    private static saveNewZone(
        player: Player,
        name: string,
        x1: number,
        y1: number,
        z1: number,
        x2: number,
        y2: number,
        z2: number,
        dim: string,
        back: () => void
    ): void {
        const zones = [...(currentConfig.LandProtect?.zones ?? [])];
        const newZone: LandProtectZone = {
            id: `zone_${Date.now()}`,
            name, x1, y1, z1, x2, y2, z2, dim,
            blockBreak: true,
            blockPlace: true,
            interact: true,
            entry: true,
            allowedPlayers: [],
            allowOwner: true,
            allowAdmin: true
        };
        zones.push(newZone);
        ConfigManager.saveConfig({ ...currentConfig, LandProtect: { ...currentConfig.LandProtect, zones } });
        notify(player, t(`§a区域「${name}」を追加しました。`, `§aAdded zone "${name}".`));
        this.show(player, back);
    }

    private static showZoneList(player: Player, back: () => void): void {
        const zones = currentConfig.LandProtect?.zones ?? [];
        if (zones.length === 0) {
            notify(player, t("§7区域は登録されていません。", "§7No zones registered."));
            return this.show(player, back);
        }
        const form = new ActionFormData()
            .title(t("§l区域一覧", "§lZone List"))
            .body(t(`§7登録数: ${zones.length}`, `§7Total: ${zones.length}`));

        for (const z of zones) {
            form.button(`§l${z.name}\n§7(${z.dim.replace("minecraft:", "")})`);
        }
        form.button(t("§l戻る", "§lBack"));

        form.show(player).then(({ canceled, selection }) => {
            if (canceled || selection === undefined) return this.show(player, back);
            if (selection === zones.length) return this.show(player, back);
            this.showZoneDetails(player, zones[selection], back);
        });
    }

    private static showZoneDetails(player: Player, zone: LandProtectZone, back: () => void): void {
        const onOff = (b: boolean) => b ? "§c禁止" : "§a許可";
        new ActionFormData()
            .title(`§l${zone.name}`)
            .body(t(
                `§7座標: (${zone.x1.toFixed(0)}, ${zone.y1.toFixed(0)}, ${zone.z1.toFixed(0)}) - (${zone.x2.toFixed(0)}, ${zone.y2.toFixed(0)}, ${zone.z2.toFixed(0)})\n` +
                `§7ディメンション: ${zone.dim}\n\n` +
                `§7ブロック破壊: ${onOff(zone.blockBreak)}\n` +
                `§7ブロック設置: ${onOff(zone.blockPlace)}\n` +
                `§7インタラクト: ${onOff(zone.interact)}\n` +
                `§7侵入禁止: ${onOff(zone.entry)}\n\n` +
                `§7Owner許可: ${zone.allowOwner ? "§aON" : "§cOFF"}\n` +
                `§7Admin許可: ${zone.allowAdmin ? "§aON" : "§cOFF"}\n` +
                `§7許可プレイヤー: §f${zone.allowedPlayers.length}人`,
                `§7Coords: (${zone.x1.toFixed(0)}, ${zone.y1.toFixed(0)}, ${zone.z1.toFixed(0)}) - (${zone.x2.toFixed(0)}, ${zone.y2.toFixed(0)}, ${zone.z2.toFixed(0)})\n` +
                `§7Dimension: ${zone.dim}\n\n` +
                `§7Break: ${onOff(zone.blockBreak)}\n` +
                `§7Place: ${onOff(zone.blockPlace)}\n` +
                `§7Interact: ${onOff(zone.interact)}\n` +
                `§7Entry: ${onOff(zone.entry)}\n\n` +
                `§7Allow Owner: ${zone.allowOwner ? "§aON" : "§cOFF"}\n` +
                `§7Allow Admin: ${zone.allowAdmin ? "§aON" : "§cOFF"}\n` +
                `§7Allowed Players: §f${zone.allowedPlayers.length}`
            ))
            .button(t("§l設定を変更", "§lEdit Settings"))
            .button(t("§b§l許可プレイヤー管理", "§b§lManage Allowed Players"))
            .button(t("§4§l区域を削除", "§4§lDelete Zone"))
            .button(t("§l戻る", "§lBack"))
            .show(player)
            .then(({ canceled, selection }) => {
                if (canceled || selection === undefined) return this.showZoneList(player, back);
                if (selection === 0) return this.editZoneSettings(player, zone, back);
                if (selection === 1) return this.manageAllowedPlayers(player, zone, back);
                if (selection === 2) return this.deleteZone(player, zone, back);
                this.showZoneList(player, back);
            });
    }

    private static editZoneSettings(player: Player, zone: LandProtectZone, back: () => void): void {
        new ModalFormData()
            .title(`§l設定: ${zone.name}`)
            .toggle(t("ブロック破壊を禁止", "Disallow Break"), { defaultValue: zone.blockBreak })
            .toggle(t("ブロック設置を禁止", "Disallow Place"), { defaultValue: zone.blockPlace })
            .toggle(t("インタラクトを禁止", "Disallow Interact"), { defaultValue: zone.interact })
            .toggle(t("侵入を禁止", "Disallow Entry"), { defaultValue: zone.entry })
            .toggle(t("Ownerの操作を許可", "Allow Owner"), { defaultValue: zone.allowOwner })
            .toggle(t("Adminの操作を許可", "Allow Admin"), { defaultValue: zone.allowAdmin })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return this.showZoneDetails(player, zone, back);

                zone.blockBreak = Boolean(formValues[0]);
                zone.blockPlace = Boolean(formValues[1]);
                zone.interact = Boolean(formValues[2]);
                zone.entry = Boolean(formValues[3]);
                zone.allowOwner = Boolean(formValues[4]);
                zone.allowAdmin = Boolean(formValues[5]);

                ConfigManager.saveConfig(currentConfig);
                notify(player, t("§a設定を保存しました。", "§aSettings saved."));
                this.showZoneDetails(player, zone, back);
            });
    }

    private static manageAllowedPlayers(player: Player, zone: LandProtectZone, back: () => void): void {
        const form = new ActionFormData()
            .title(`§l許可プレイヤー: ${zone.name}`)
            .body(t(`§7許可リスト: §f${zone.allowedPlayers.length}人\n§f${zone.allowedPlayers.join(", ")}`, `§7Allowed: §f${zone.allowedPlayers.length}\n§f${zone.allowedPlayers.join(", ")}`));

        for (const p of zone.allowedPlayers) {
            form.button(`§c§l削除: ${p}`);
        }
        form.button(t("§a§lプレイヤーを追加", "§a§lAdd Player"));
        form.button(t("§l戻る", "§lBack"));

        form.show(player).then(({ canceled, selection }) => {
            if (canceled || selection === undefined) return this.showZoneDetails(player, zone, back);
            if (selection === zone.allowedPlayers.length) return this.addAllowedPlayer(player, zone, back);
            if (selection === zone.allowedPlayers.length + 1) return this.showZoneDetails(player, zone, back);

            zone.allowedPlayers.splice(selection, 1);
            ConfigManager.saveConfig(currentConfig);
            notify(player, t("§aプレイヤーを削除しました。", "§aPlayer removed."));
            this.manageAllowedPlayers(player, zone, back);
        });
    }

    private static addAllowedPlayer(player: Player, zone: LandProtectZone, back: () => void): void {
        new ModalFormData()
            .title(t("§l許可プレイヤー追加", "§lAdd Allowed Player"))
            .textField(t("プレイヤー名", "Player Name"), "")
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return this.manageAllowedPlayers(player, zone, back);
                const name = String(formValues[0] ?? "").trim();
                if (name && !zone.allowedPlayers.includes(name)) {
                    zone.allowedPlayers.push(name);
                    ConfigManager.saveConfig(currentConfig);
                    notify(player, t(`§a${name} を追加しました。`, `§aAdded ${name}.`));
                }
                this.manageAllowedPlayers(player, zone, back);
            });
    }

    private static deleteZone(player: Player, zone: LandProtectZone, back: () => void): void {
        const zones = currentConfig.LandProtect?.zones ?? [];
        const filtered = zones.filter(z => z.id !== zone.id);
        ConfigManager.saveConfig({ ...currentConfig, LandProtect: { ...currentConfig.LandProtect, zones: filtered } });
        notify(player, t(`§a区域「${zone.name}」を削除しました。`, `§aRemoved zone "${zone.name}".`));
        this.showZoneList(player, back);
    }
}