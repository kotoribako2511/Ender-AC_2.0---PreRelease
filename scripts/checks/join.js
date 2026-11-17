import { world, system, Player } from "@minecraft/server";
import { kick } from "../command/command.js";
import { SessionIdMap, currentConfig, WhitelistManager, BanManager } from "../data/config.js";
import { getPlayerData } from "../util/util.js";
import { PlayerAccessLogManager } from "../log.js";
import { PermissionManager, DetectionType } from "../permission.js";
import { ACState, isServerOwnerByName, isServerOwnerById, hasServerOwner, t } from "../state.js";
import { safeCall } from "../util/safe.js";
function sendMessage(string) {
    system.run(() => {
        world.sendMessage(string);
    });
}
export async function handleAsyncPlayerJoin(ev) {
    SessionIdMap.set(ev.name, ev.persistentId);
    if (!ACState.enabled)
        return;
    const joinConf = currentConfig.Join;
    const kickMsg = joinConf?.kickMessage ? `\n${joinConf.kickMessage}` : "";
    const isOwnerPlayer = isServerOwnerByName(ev.name) || isServerOwnerById(ev.persistentId);
    const bypass = isOwnerPlayer || PermissionManager.hasBypassByName(ev.name, DetectionType.Join);
    if (joinConf?.enabled && !bypass) {
        if (joinConf.checkPersistentId && world.getPlayers().length > 0 && ev.persistentId.length === 0) {
            ev.disallowJoin(`Access Denied: Invalid Player Status.  by [Ender-AC]  ${kickMsg}`);
            console.warn(`§l${ev.name} => §ctype: Invalid presistentId `);
            sendMessage(`§5§l[Ender-AC] §r§lname:${ev.name} §cConnection Refused §4Type - "No presistentId"`);
            PlayerAccessLogManager.addLog({ time: Date.now(), name: ev.name, type: "denied", reason: "No persistentId" });
            return;
        }
        if (joinConf.checkNameLength && world.getPlayers().length > 0 && (ev.name.length < joinConf.minNameLength || ev.name.length > joinConf.maxNameLength)) {
            ev.disallowJoin(`Access Denied: Invalid Player Status.  by [Ender-AC]  ${kickMsg}`);
            console.warn(`§l${ev.name} => §ctype: length = ${ev.name.length}`);
            sendMessage(`§5§l[Ender-AC] §r§lname:${ev.name} §cConnection Refused §4Type - "length = ${ev.name.length}" `);
            PlayerAccessLogManager.addLog({ time: Date.now(), name: ev.name, type: "denied", reason: `length = ${ev.name.length}` });
            return;
        }
        if (joinConf.checkSteve && world.getPlayers().length > 0 && (ev.name === "steve" || ev.name === "Steve")) {
            ev.disallowJoin(`Access Denied: Invalid Player Status.  by [Ender-AC]  ${kickMsg}`);
            console.warn(`§l${ev.name} => §ctype: steve`);
            sendMessage(`§5§l[Ender-AC] §r§lname: ${ev.name} => §cConnection Refused §4Type - "Steve"`);
            PlayerAccessLogManager.addLog({ time: Date.now(), name: ev.name, type: "denied", reason: "Steve" });
            return;
        }
        if (joinConf.checkSpecialChars && world.getPlayers().length > 0 && ev.name.match(/\"|\\|§|Ä|\//)) {
            ev.disallowJoin(`Access Denied: Invalid Player Status.  by [Ender-AC]  ${kickMsg}`);
            console.warn(`§l${ev.name} => §ctype: Special character`);
            sendMessage(`§5§l[Ender-AC] §r§lname: ${ev.name} => §cConnection Refused §4Type - "Special character"`);
            PlayerAccessLogManager.addLog({ time: Date.now(), name: ev.name, type: "denied", reason: "Special character" });
            return;
        }
    }
    if (!bypass) {
        if (BanManager.isBanned(ev.persistentId, ev.name)) {
            const entry = BanManager.findByPersistentId(ev.persistentId) || BanManager.findByName(ev.name);
            let reasonText = "Your account has been banned.  by [Ender-AC]";
            if (entry) {
                const remaining = entry.expireAt === null ? "Permanent" : `Until ${new Date(entry.expireAt).toLocaleString()}`;
                reasonText += ` (${remaining})`;
                if (entry.reason)
                    reasonText += ` - ${entry.reason}`;
            }
            ev.disallowJoin(`${reasonText}  ${kickMsg}`);
            console.warn(`§l${ev.name} => §ctype: Banned`);
            sendMessage(`§5§l[Ender-AC] §r§lname: ${ev.name} => §cConnection Refused §4Type - "Banned"`);
            PlayerAccessLogManager.addLog({ time: Date.now(), name: ev.name, type: "denied", reason: "Banned" });
            return;
        }
        if (currentConfig.Whitelist?.enabled) {
            if (!WhitelistManager.isWhitelisted(ev.name, ev.persistentId)) {
                ev.disallowJoin(`Access Denied: You are not whitelisted.  by [Ender-AC]  ${kickMsg}`);
                console.warn(`§l${ev.name} => §ctype: Whitelisted`);
                sendMessage(`§5§l[Ender-AC] §r§lname: ${ev.name} => §cConnection Refused §4Type - "Not Whitelisted"`);
                PlayerAccessLogManager.addLog({ time: Date.now(), name: ev.name, type: "denied", reason: "Not Whitelisted" });
                return;
            }
        }
    }
    console.warn(`§5§l[Ender-AC] §r§ljoin-${ev.name}`);
    sendMessage(`§5§l[Ender-AC] §r§ljoin-${ev.name}`);
    PlayerAccessLogManager.addLog({ time: Date.now(), name: ev.name, type: "join" });
}
function KickProcessing(name, type, reason) {
    const kickMsg = currentConfig.Join?.kickMessage ? `\n${currentConfig.Join.kickMessage}` : "";
    console.warn(`${name} type: ${reason}`);
    sendMessage(`§5§l[Ender-AC] §r§lname: ${name} => §cConnection Refused §4Type - "${reason}"`);
    PlayerAccessLogManager.addLog({ time: Date.now(), name: name, type: type, reason: reason });
    kick(name, `type: ${reason} | By [Ender-AC]  \n` + kickMsg.trim() || undefined);
    return;
}
export let PlayerWaitSpawn = [];
export function handlePlayerJoin(ev) {
    system.run(() => {
        const player = world.getEntity(ev.playerId);
        if (!player)
            return;
        PlayerWaitSpawn.push({ name: ev.playerName, time: system.currentTick });
        const data = getPlayerData(player);
        data.joinBypass.enable = true;
        if (!(player instanceof Player)) {
            KickProcessing(ev.playerName, "join", "No Instance");
            return;
        }
        if (!ACState.enabled) {
            if (player instanceof Player) {
                const isOwnerPlayer = isServerOwnerByName(player.name) || isServerOwnerById(player.id);
                const noOwnerYet = !hasServerOwner();
                if (isOwnerPlayer || noOwnerYet) {
                    const msg = t("§5§l[Ender-AC] §r§lACは現在停止しています。§a/eac:start §r§lを実行して起動してください。", "§5§l[Ender-AC] §r§lAC is currently stopped. Run §a/eac:start §r§lto enable it.");
                    safeCall(() => player.sendMessage(msg));
                }
            }
            return;
        }
    });
}
export function handlePlayerSpawn(ev) {
    const player = ev.player;
    if (!player.isValid)
        return;
    if (!ACState.enabled)
        return;
    const { name } = player;
    PlayerWaitSpawn = PlayerWaitSpawn.filter(it => it.name !== player.name);
    PermissionManager.updateNameCache(player);
    if (isServerOwnerByName(player.name))
        return;
    if (PermissionManager.shouldSkipDetection(player, DetectionType.Join))
        return;
    if (currentConfig.Join?.enabled && currentConfig.Join?.checkRenderDistance) {
        if (player.clientSystemInfo.maxRenderDistance <= 0) {
            KickProcessing(name, "spawn", "No Render");
            return;
        }
    }
}
export function SpawnWaitTick() {
    if (!ACState.enabled)
        return;
    if (!currentConfig.Join?.enabled)
        return;
    if (PlayerWaitSpawn.length === 0)
        return;
    const now = system.currentTick;
    const timeout = currentConfig.Join.spawnTimeoutTick ?? 200;
    const remaining = [];
    for (const user of PlayerWaitSpawn) {
        const tick = now - user.time;
        if (tick < timeout) {
            remaining.push(user);
            continue;
        }
        if (isServerOwnerByName(user.name))
            continue;
        if (PermissionManager.hasBypassByName(user.name, DetectionType.Join))
            continue;
        KickProcessing(user.name, "join", "No Spawn");
    }
    PlayerWaitSpawn = remaining;
}
export function handleJoinPlayerLeave(ev) {
    const name = ev.player?.name;
    if (name) {
        SessionIdMap.delete(name);
        PlayerWaitSpawn = PlayerWaitSpawn.filter(it => it.name !== name);
    }
    if (!ACState.enabled)
        return;
    PlayerAccessLogManager.addLog({ time: Date.now(), name: name ?? "?", type: "leave" });
}
