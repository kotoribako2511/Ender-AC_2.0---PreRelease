import { Player, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { currentConfig } from "../../data/config.js";
import { t } from "../../state.js";
import { safeCall } from "../../util/safe.js";

const observeTasks = new Map<string, number>();

export class PlayerCameraUI {
    public static showObserveMenu(admin: Player, target: Player, back: () => void): void {
        if (!target.isValid) {
            admin.sendMessage(`${currentConfig.System.prefix} ` + t("§cプレイヤーが見つかりません。", "§cPlayer not found."));
            return back();
        }
        new ActionFormData()
            .title(t(`§l${target.name} を観察`, `§lObserve ${target.name}`))
            .body(t(
                `§7対象: §e${target.name}\n§7カメラ視点を選択してください。\n観察を終了する場合もう一度このフォームを開き終了してください`,
                `§7Target: §e${target.name}\n§7Select camera view. \nWhen you finish the observation, open this form one more time to complete it.`,
            ))
            .button(t("§l一人称視点（対象の目線）", "§lFirst-person view (target's eyes)"))
            .button(t("§l三人称視点（後方追従）", "§lThird-person view (follow from behind)"))
            .button(t("§c§l観察を終了", "§c§lStop Observing"))
            .button(t("§l戻る", "§lBack"))
            .show(admin)
            .then(({ canceled, selection }) => {
                if (canceled || selection === undefined) return back();
                if (selection === 0) return this.startObserve(admin, target, "first");
                if (selection === 1) return this.startObserve(admin, target, "third");
                if (selection === 2) {
                    this.stopObserve(admin);
                    return this.showObserveMenu(admin, target, back);
                }
                back();
            });
    }

    private static startObserve(admin: Player, target: Player, mode: "first" | "third"): void {
        this.stopObserve(admin);
        if (!admin.isValid) return;

        const runId = system.runInterval(() => {
            if (!admin.isValid || !target.isValid) {
                this.stopObserve(admin);
                return;
            }
            safeCall(() => {
                if (mode === "first") {
                    const head = target.getHeadLocation();
                    const rot = target.getRotation();
                    admin.camera.setCamera("minecraft:free", {
                        location: head,
                        rotation: { x: rot.x, y: rot.y },
                    });
                } else {
                    const tLoc = target.location;
                    const yawRad = target.getRotation().y * Math.PI / 180;
                    const dist = 4;
                    const camLoc = {
                        x: tLoc.x + Math.sin(yawRad) * dist,
                        y: tLoc.y + 2,
                        z: tLoc.z - Math.cos(yawRad) * dist,
                    };
                    admin.camera.setCamera("minecraft:free", {
                        location: camLoc,
                        facingEntity: target,
                    });
                }
            }, undefined, "PlayerCameraUI.startObserve");
        }, 1);

        observeTasks.set(admin.id, runId);
        admin.sendMessage(`${currentConfig.System.prefix} ` + t(
            `§a${target.name} の観察を開始しました。`,
            `§aStarted observing ${target.name}.`,
        ));
    }

    public static stopObserve(admin: Player): void {
        const runId = observeTasks.get(admin.id);
        if (runId !== undefined) {
            system.clearRun(runId);
            observeTasks.delete(admin.id);
        }
        if (admin.isValid) {
            system.run(() => {
                try {
                    admin.camera.clear();
                } catch (e) {
                    console.warn(`[PlayerCameraUI.stopObserve] Failed to clear camera: ${e}`);
                }
            });
        }
    }
    
    public static cleanupOnLeave(player: Player): void {
        this.stopObserve(player);
    }
}