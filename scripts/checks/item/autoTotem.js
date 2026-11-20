import { EquipmentSlot, system } from "@minecraft/server";
import { currentConfig } from "../../data/config.js";
import { Console, getPlayerData, TPSCalculator, staffMessage, MathUtils } from "../../util/util.js";
import { AutoTotemEfName, AutoTotemEfDra, AutoTotemEfDra2 } from "../../data/info.js";
import { PermissionManager, DetectionType } from "../../permission.js";
import { MC_PLAYER } from "../../util/constants.js";
//AutoTotem beta version
export function AutoTotem(ev, now) {
    if (!ev.entity.isValid || ev.entity.typeId !== MC_PLAYER)
        return;
    if (PermissionManager.shouldSkipDetection(ev.entity, DetectionType.AutoTotem))
        return;
    const data = getPlayerData(ev.entity);
    const arr = data.AutoTotem.AutoTotemArr;
    arr.unshift({ effectName: ev.effect.typeId, dration: ev.effect.duration, date: now });
    if (arr.length >= 3) {
        const [a, b, c] = arr;
        const nameArr = [a.effectName, b.effectName, c.effectName];
        const drationArr = [a.dration, b.dration, c.dration];
        const sameEffect = MathUtils.isEqual(nameArr, AutoTotemEfName);
        const sameDuration = MathUtils.isEqual(drationArr, AutoTotemEfDra);
        const sameDuration2 = MathUtils.isEqual(drationArr, AutoTotemEfDra2);
        const sameTick = a.date === c.date;
        const lowHp = ev.entity.getComponent("minecraft:health")?.currentValue === 1;
        const hasTotem = data.AutoTotem.lastMainhand || data.AutoTotem.lastOffhand;
        if (sameEffect && (sameDuration || sameDuration2) && sameTick && lowHp && hasTotem) {
            data.AutoTotem.Activation = true;
            data.AutoTotem.Tick = system.currentTick;
        }
    }
    if (arr.length > 2)
        arr.length = 2;
}
export function processAutoTotemTick(player, data, now, equippable) {
    const cfg = currentConfig.AutoTotem;
    if (!cfg.enabled)
        return;
    if (PermissionManager.shouldSkipDetection(player, DetectionType.AutoTotem))
        return;
    const AutoTotem = data.AutoTotem;
    const offhand = equippable?.getEquipmentSlot(EquipmentSlot.Offhand).getItem()?.typeId === "minecraft:totem_of_undying";
    const Mainhand = equippable?.getEquipmentSlot(EquipmentSlot.Mainhand).getItem()?.typeId === "minecraft:totem_of_undying";
    if (AutoTotem.lastMainhand || AutoTotem.lastOffhand) {
        const flag = (AutoTotem.lastOffhand && offhand && !(AutoTotem.lastMainhand && Mainhand)) ||
            (AutoTotem.lastMainhand && offhand && !(Mainhand && AutoTotem.lastOffhand)) ||
            (AutoTotem.lastMainhand && AutoTotem.lastOffhand && Mainhand && offhand);
        if (AutoTotem.Activation && (now - AutoTotem.Tick) <= TPSCalculator.scaleTicks(cfg.threshold) && flag) {
            Console(player, "The interval to equip a totem is too short.");
            staffMessage(player, "The interval to equip a totem is too short.");
            //equippable?.getEquipmentSlot(EquipmentSlot.Offhand).setItem(undefined);
        }
    }
    if (!offhand)
        return;
    AutoTotem.Activation = false;
    AutoTotem.lastMainhand = Mainhand;
    AutoTotem.lastOffhand = offhand;
    AutoTotem.AutoTotemArr = [];
    AutoTotem.Tick = 0;
}
