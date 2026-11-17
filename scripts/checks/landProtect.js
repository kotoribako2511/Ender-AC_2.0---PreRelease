import { currentConfig } from "../data/config.js";
import { PermissionManager, PermissionLevel } from "../permission.js";
import { isServerOwnerByPlayer } from "../state.js";
export class LandProtectManager {
    static getZones() {
        const cfg = currentConfig.LandProtect;
        if (!cfg)
            return [];
        if (cfg.zones === this.cachedRef)
            return this.cachedZones;
        this.cachedRef = cfg.zones;
        this.cachedZones = cfg.zones;
        return this.cachedZones;
    }
    static getZonesAt(loc, dimId) {
        const zones = this.getZones();
        const matched = [];
        for (const z of zones) {
            if (z.dim !== dimId)
                continue;
            const minX = Math.min(z.x1, z.x2);
            const maxX = Math.max(z.x1, z.x2);
            const minY = Math.min(z.y1, z.y2);
            const maxY = Math.max(z.y1, z.y2);
            const minZ = Math.min(z.z1, z.z2);
            const maxZ = Math.max(z.z1, z.z2);
            if (loc.x >= minX && loc.x <= maxX &&
                loc.y >= minY && loc.y <= maxY &&
                loc.z >= minZ && loc.z <= maxZ) {
                matched.push(z);
            }
        }
        return matched;
    }
    static isAllowed(player, zone) {
        if (isServerOwnerByPlayer(player))
            return true;
        const lvl = PermissionManager.getPermissionLevel(player);
        if (lvl === PermissionLevel.Owner && zone.allowOwner)
            return true;
        if (lvl === PermissionLevel.Admin && zone.allowAdmin)
            return true;
        if (zone.allowedPlayers.includes(player.name))
            return true;
        return false;
    }
    static canBreak(player, loc, dimId) {
        if (!currentConfig.LandProtect?.enabled)
            return true;
        for (const z of this.getZonesAt(loc, dimId)) {
            if (z.blockBreak && !this.isAllowed(player, z))
                return false;
        }
        return true;
    }
    static canPlace(player, loc, dimId) {
        if (!currentConfig.LandProtect?.enabled)
            return true;
        for (const z of this.getZonesAt(loc, dimId)) {
            if (z.blockPlace && !this.isAllowed(player, z))
                return false;
        }
        return true;
    }
    static canInteract(player, loc, dimId) {
        if (!currentConfig.LandProtect?.enabled)
            return true;
        for (const z of this.getZonesAt(loc, dimId)) {
            if (z.interact && !this.isAllowed(player, z))
                return false;
        }
        return true;
    }
    static canEnter(player, loc, dimId) {
        if (!currentConfig.LandProtect?.enabled)
            return true;
        for (const z of this.getZonesAt(loc, dimId)) {
            if (z.entry && !this.isAllowed(player, z))
                return false;
        }
        return true;
    }
}
LandProtectManager.cachedZones = [];
LandProtectManager.cachedRef = null;
