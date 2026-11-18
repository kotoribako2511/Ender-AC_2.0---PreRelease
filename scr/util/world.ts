import { world, Dimension, Vector3, system } from "@minecraft/server";
import { Nofall_safeBlocks } from "../data/info.js";
import { safeGet } from "./safe.js";
import { getCachedBlockTypeId } from "./blockCache.js";
import { DirectionType } from "../data/type.js";
import { ALTITUDE_LIMIT } from "./constants.js";

export class WorldUtils {
    private static dims: Record<string, Dimension> = {};
    private static readonly FALLBACK_DIM = "minecraft:overworld";

    public static initialize(): void {
        system.run(() => {
            safeGet(() => { this.dims["minecraft:overworld"] = world.getDimension("overworld"); }, undefined, "WorldUtils.init.overworld");
            safeGet(() => { this.dims["minecraft:nether"] = world.getDimension("nether"); }, undefined, "WorldUtils.init.nether");
            safeGet(() => { this.dims["minecraft:the_end"] = world.getDimension("the_end"); }, undefined, "WorldUtils.init.end");
        });
    }

    private static getDimension(dimId?: string): Dimension | undefined {
        if (!dimId) return this.dims[this.FALLBACK_DIM];
        return this.dims[dimId] ?? this.dims[this.FALLBACK_DIM];
    }

    private static getBounds(dimId?: string): { minY: number; maxY: number } {
        if (dimId === "minecraft:nether") return { minY: 0, maxY: 127 };
        if (dimId === "minecraft:the_end") return { minY: 0, maxY: 255 };
        return { minY: -64, maxY: 319 };
    }

    private static isInsideWorld(location: Vector3, dimId?: string): boolean {
        const { minY, maxY } = this.getBounds(dimId);
        return location.y >= minY && location.y <= maxY;
    }

    public static getblock(location: Vector3, dimId?: string): string | undefined {
        if (!this.isInsideWorld(location, dimId)) return "minecraft:air";
        const dim = this.getDimension(dimId);
        if (!dim) return "minecraft:air";
        if (location.y > ALTITUDE_LIMIT)
        return getCachedBlockTypeId(dim, location.x, location.y, location.z) ?? "minecraft:air";
    }

    public static isStandingOnSafeBlock(location: Vector3, dimId?: string): boolean {
        if (!this.isInsideWorld(location, dimId)) return false;
        const dim = this.getDimension(dimId);
        if (!dim) return false;

        const x = Math.floor(location.x), y = Math.floor(location.y), z = Math.floor(location.z);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 0; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const blockId = getCachedBlockTypeId(dim, x + dx, y + dy, z + dz);
                    if (blockId && Nofall_safeBlocks.has(blockId)) return true;
                }
            }
        }
        return false;
    }

    public static isfloor(location: Vector3, dimId?: string): boolean {
        if (!this.isInsideWorld(location, dimId)) return false;
        const dim = this.getDimension(dimId);
        if (!dim) return false;

        const x = Math.floor(location.x), y = Math.floor(location.y), z = Math.floor(location.z);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                if (getCachedBlockTypeId(dim, x + dx, y - 1, z + dz) !== "minecraft:air") return false;
            }
        }
        return true;
    }

    public static BlockPlaceWith(Direction: DirectionType, location: Vector3) {
        const { x, y, z } = location
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

WorldUtils.initialize();