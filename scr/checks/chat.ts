import { ChatSendBeforeEvent, Player, world } from "@minecraft/server";
import { currentConfig, MuteManager } from "../data/config.js";
import { getPlayerData, personalMessage, Console, globalMessage } from "../util/util.js";
import { PermissionManager, DetectionType, PermissionLevel } from "../permission.js";

export function checkChat(ev: ChatSendBeforeEvent): void {
    const cfg = currentConfig.Chat;
    const player = ev.sender;
    const muteCfg = currentConfig.Mute;

    if (muteCfg?.enabled && MuteManager.isMuted(player.name)) {
        ev.cancel = true;

        const noticeMsg = `§8[§7Muted§8] §7${player.name}§8: §f${ev.message}`;

        if (muteCfg.notifyToStaff) {
            for (const p of world.getPlayers()) {
                if (p.id === player.id) continue;
                const level = PermissionManager.getPermissionLevel(p);
                if (level === PermissionLevel.Owner && muteCfg.ownerCanSee) {
                    p.sendMessage(noticeMsg);
                } else if (level === PermissionLevel.Admin && muteCfg.adminCanSee) {
                    p.sendMessage(noticeMsg);
                }
            }
        }

        const muteMsg = muteCfg.muteMessage && muteCfg.muteMessage.length > 0
            ? muteCfg.muteMessage
            : "§cYou are muted. Your message was not delivered.";
        personalMessage(player, muteMsg);
        Console(player, "§7Muted message intercepted", `(length: ${ev.message.length})`);
        return;
    }

    if (PermissionManager.shouldSkipDetection(player, DetectionType.Chat)) return;

    if (cfg.bannedWords && cfg.bannedWords.length > 0) {
        for (const word of cfg.bannedWords) {
            if (!ev.message.includes(word)) continue
            personalMessage(player, `§cYour message was blocked because it contains prohibited words. §r§l: (${word})`);
            ev.cancel = true;
            return;
        }
    }

    if (!cfg.chatLimitEnabled) return;

    const data = getPlayerData(player);
    const now = Date.now();

    if (data.lastChat && now - data.lastChat.Time < cfg.cooldownMs) {
        personalMessage(player, "§cChat Cooldown, Please wait before sending another message.");
        ev.cancel = true;
        return;
    }

    if (ev.message.length > cfg.maxLength) {
        personalMessage(player, `§cMessage too long (Max ${cfg.maxLength} characters)`);
        ev.cancel = true;
        return;
    }

    if (data.lastChat && data.lastChat.Message === ev.message) {
        personalMessage(player, "§cPlease do not send the same message repeatedly");
        ev.cancel = true;
        return;
    }

    data.lastChat = { Time: now, Message: ev.message };
}