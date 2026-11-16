import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { currentConfig } from "../../data/config.js";
import { getPlayerData, personalMessage } from "../../util/util.js";
import { t } from "../../state.js";
import { safeCall } from "../../util/safe.js";
export class PlayerTeleportUI {
    static teleportAdminToTarget(admin, target, back) {
        if (!target.isValid) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cプレイヤーが見つかりません。", "§cPlayer not found."));
            return back();
        }
        safeCall(() => {
            const data = getPlayerData(admin);
            data.teleport.allowedUntilTick = system.currentTick + 15;
            admin.teleport(target.location, { dimension: target.dimension });
            admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§a${target.name} にTPしました。`, `§aTeleported to ${target.name}.`));
        }, () => {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cTPに失敗しました。", "§cTeleport failed."));
        });
        back();
    }
    static showMakeMenu(admin, target, back) {
        if (!target.isValid) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cプレイヤーが見つかりません。", "§cPlayer not found."));
            return back();
        }
        new ActionFormData()
            .title(t(`§l${target.name} をTPさせる`, `§lTeleport ${target.name}`))
            .body(t(`§7対象: §e${target.name}`, `§7Target: §e${target.name}`))
            .button(t("§l別のプレイヤーにTPさせる", "§lTeleport to another player"))
            .button(t("§l特定の座標にTPさせる", "§lTeleport to coordinates"))
            .button(t("§l戻る", "§lBack"))
            .show(admin)
            .then(({ canceled, selection }) => {
            if (canceled || selection === undefined)
                return back();
            if (selection === 0)
                return this.showTargetToPlayerMenu(admin, target, back);
            if (selection === 1)
                return this.showTargetToCoordsMenu(admin, target, back);
            back();
        });
    }
    static showTargetToPlayerMenu(admin, target, back) {
        const players = world.getPlayers().filter((p) => p.id !== target.id);
        if (players.length === 0) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§c他にプレイヤーがいません。", "§cNo other players online."));
            return this.showMakeMenu(admin, target, back);
        }
        new ModalFormData()
            .title(t("§lTPさせる相手を選択", "§lSelect Destination Player"))
            .dropdown("Select", players.map((p) => p.name), { defaultValueIndex: 0 })
            .show(admin)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues)
                return this.showMakeMenu(admin, target, back);
            const dest = players[Number(formValues[0])];
            if (!dest?.isValid || !target.isValid) {
                admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cプレイヤーが見つかりません。", "§cPlayer not found."));
                return this.showMakeMenu(admin, target, back);
            }
            safeCall(() => {
                const data = getPlayerData(target);
                data.teleport.allowedUntilTick = system.currentTick + 15;
                target.teleport(dest.location, { dimension: dest.dimension });
                admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§a${target.name} を ${dest.name} にTPさせました。`, `§aTeleported ${target.name} to ${dest.name}.`));
                personalMessage(target, t(`あなたは ${dest.name} にTPされました。`, `You have been teleported to ${dest.name}.`));
            }, () => {
                admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cTPに失敗しました。", "§cTeleport failed."));
            });
            this.showMakeMenu(admin, target, back);
        });
    }
    static showTargetToCoordsMenu(admin, target, back) {
        if (!target.isValid) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cプレイヤーが見つかりません。", "§cPlayer not found."));
            return back();
        }
        const loc = target.location;
        new ModalFormData()
            .title(t("§lTPさせる座標を入力", "§lEnter Destination Coordinates"))
            .textField("X", "0", { defaultValue: loc.x.toFixed(2) })
            .textField("Y", "0", { defaultValue: loc.y.toFixed(2) })
            .textField("Z", "0", { defaultValue: loc.z.toFixed(2) })
            .show(admin)
            .then(({ canceled, formValues }) => {
            if (canceled || !formValues || !target.isValid)
                return this.showMakeMenu(admin, target, back);
            const x = Number(formValues[0]), y = Number(formValues[1]), z = Number(formValues[2]);
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                admin.sendMessage(`${currentConfig.System.prefix} ` + t("§c座標が不正です。", "§cInvalid coordinates."));
                return this.showTargetToCoordsMenu(admin, target, back);
            }
            safeCall(() => {
                const data = getPlayerData(target);
                data.teleport.allowedUntilTick = system.currentTick + 15;
                target.teleport({ x, y, z }, { dimension: target.dimension });
                admin.sendMessage(`${currentConfig.System.prefix} ` + t(`§a${target.name} を (${x}, ${y}, ${z}) にTPさせました。`, `§aTeleported ${target.name} to (${x}, ${y}, ${z}).`));
                personalMessage(target, t(`あなたは (${x}, ${y}, ${z}) にTPされました。`, `You have been teleported to (${x}, ${y}, ${z}).`));
            }, () => {
                admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cTPに失敗しました。", "§cTeleport failed."));
            });
            this.showMakeMenu(admin, target, back);
        });
    }
}
