import { PlayerPermissionLevel, system, Player, ItemStack } from "@minecraft/server";
import { PermissionManager } from "../permission.js";
import { isServerOwnerByPlayer } from "../state.js";
import { registerSettingOpener, registerInstructionOpener } from "../command/command.js";
import { MainMenuUI } from "./main-menu.js";

export { MainMenuUI } from "./main-menu.js";
export { ManualUI } from "./manual.js";
export { LogUI, AdminActionLogUI } from "./logs.js";
export { MobManagementUI } from "./mob.js";
export { CoreProtectUI } from "./coreprotect.js";
export { SystemUI } from "./system.js";
export { PlayerManagementUI } from "./player/player.js";
export { ACSettingsUI } from "./ac-settings/index.js";
export { JoinManagementUI } from "./join.js";

export function handleUIItemUse(source: Player, itemStack: ItemStack): void {
    if (itemStack.typeId !== "ender:admin_tool") return;
    if (source.playerPermissionLevel !== PlayerPermissionLevel.Operator) return;
    if (!PermissionManager.isOwner(source) && !isServerOwnerByPlayer(source)) return;
    system.run(() => MainMenuUI.showMainMenu(source));
}

registerSettingOpener((player) => MainMenuUI.showMainMenu(player));
registerInstructionOpener((player, language) =>
    import("./manual.js").then((m) => m.ManualUI.showManual(player, language)).catch(() => { }),
);