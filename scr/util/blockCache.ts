import { Block, Dimension, system } from "@minecraft/server";
import { safeGet } from "./safe.js";
import { DefaultConfig } from "../data/lists/index.js";

let cacheTick = -1;
const Nether_MaxLimit = 127;
const Nether_MinLimit = 0;
const End_MaxLimit = 255;
const End_MinLimit = 0;

const blockCache = new Map<string, Block | undefined>();

function ensureCacheTick(): void {
    const now = system.currentTick;
    if (cacheTick !== now) {
        blockCache.clear();
        cacheTick = now;
    }
}

export function getCachedBlock(dim: Dimension, x: number, y: number, z: number): Block | undefined {
    ensureCacheTick();
    const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);

    let DefaultY_MaxLimit = 319;
    let DefaultY_MinLimit = -64;
    
    if (dim.id === "minecraft:nether") {
        DefaultY_MinLimit = Nether_MinLimit;
        DefaultY_MaxLimit = Nether_MaxLimit;
    } else if (dim.id === "minecraft:the_end") {
        DefaultY_MaxLimit = End_MaxLimit;
        DefaultY_MinLimit = End_MinLimit;
    }

    if (fy < DefaultY_MinLimit || fy > DefaultY_MaxLimit) {
        return undefined;
    }

    const key = `${dim.id}:${fx}:${fy}:${fz}`;
    if (blockCache.has(key)) return blockCache.get(key);
    
    const block = safeGet(() => dim.getBlock({ x: fx, y: fy, z: fz }), undefined, "getCachedBlock");
    blockCache.set(key, block);
    return block;
}

export function getCachedBlockTypeId(dim: Dimension, x: number, y: number, z: number): string | undefined {
    return getCachedBlock(dim, x, y, z)?.typeId;
}

export function clearBlockCache(): void {
    blockCache.clear();
    cacheTick = -1;
}