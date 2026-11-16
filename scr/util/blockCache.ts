import { Block, Dimension, system } from "@minecraft/server";
import { safeGet } from "./safe.js";

let cacheTick = -1;
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