import { world, system } from "@minecraft/server";
import { Nofall_safeBlocks } from "../data/info.js";
import { safeGet } from "./safe.js";
import { getCachedBlockTypeId } from "./blockCache.js";
export class WorldUtils {
    static initialize() {
        system.run(() => {
            safeGet(() => { this.dims["minecraft:overworld"] = world.getDimension("overworld"); }, undefined, "WorldUtils.init.overworld");
            safeGet(() => { this.dims["minecraft:nether"] = world.getDimension("nether"); }, undefined, "WorldUtils.init.nether");
            safeGet(() => { this.dims["minecraft:the_end"] = world.getDimension("the_end"); }, undefined, "WorldUtils.init.end");
        });
    }
    static getDimension(dimId) {
        if (!dimId)
            return this.dims[this.FALLBACK_DIM];
        return this.dims[dimId] ?? this.dims[this.FALLBACK_DIM];
    }
    static getBounds(dimId) {
        if (dimId === "minecraft:nether")
            return { minY: 0, maxY: 127 };
        if (dimId === "minecraft:the_end")
            return { minY: 0, maxY: 255 };
        return { minY: -64, maxY: 319 };
    }
    static isInsideWorld(location, dimId) {
        const { minY, maxY } = this.getBounds(dimId);
        return location.y >= minY && location.y <= maxY;
    }
    static getblock(location, dimId) {
        const result = safeGet(() => {
            if (!this.isInsideWorld(location, dimId))
                return "minecraft:air";
            const dim = this.getDimension(dimId);
            if (!dim)
                return "minecraft:air";
            return getCachedBlockTypeId(dim, location.x, location.y, location.z) ?? "minecraft:air";
        }, "minecraft:air");
        return result;
    }
    static isStandingOnSafeBlock(location, dimId) {
        if (!this.isInsideWorld(location, dimId))
            return false;
        const dim = this.getDimension(dimId);
        if (!dim)
            return false;
        const x = Math.floor(location.x), y = Math.floor(location.y), z = Math.floor(location.z);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 0; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const blockId = getCachedBlockTypeId(dim, x + dx, y + dy, z + dz);
                    if (blockId && Nofall_safeBlocks.has(blockId))
                        return true;
                }
            }
        }
        return false;
    }
    static isfloor(location, dimId) {
        if (!this.isInsideWorld(location, dimId))
            return false;
        const dim = this.getDimension(dimId);
        if (!dim)
            return false;
        const x = Math.floor(location.x), y = Math.floor(location.y), z = Math.floor(location.z);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                if (getCachedBlockTypeId(dim, x + dx, y - 1, z + dz) !== "minecraft:air")
                    return false;
            }
        }
        return true;
    }
    static BlockPlaceWith(Direction, location) {
        const { x, y, z } = location;
        switch (Direction) {
            case "Up": return { x: x, y: y - 1, z: z };
            case "Down": return { x: x, y: y + 1, z: z };
            case "North": return { x: x, y: y, z: z + 1 };
            case "South": return { x: x, y: y, z: z - 1 };
            case "West": return { x: x + 1, y: y, z: z };
            case "East": return { x: x - 1, y: y, z: z };
        }
    }
}
WorldUtils.dims = {};
WorldUtils.FALLBACK_DIM = "minecraft:overworld";
WorldUtils.initialize();
