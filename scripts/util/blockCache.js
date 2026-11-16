import { system } from "@minecraft/server";
import { safeGet } from "./safe.js";
let cacheTick = -1;
const blockCache = new Map();
function ensureCacheTick() {
    const now = system.currentTick;
    if (cacheTick !== now) {
        blockCache.clear();
        cacheTick = now;
    }
}
export function getCachedBlock(dim, x, y, z) {
    ensureCacheTick();
    const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
    const key = `${dim.id}:${fx}:${fy}:${fz}`;
    if (blockCache.has(key))
        return blockCache.get(key);
    const block = safeGet(() => dim.getBlock({ x: fx, y: fy, z: fz }), undefined, "getCachedBlock");
    blockCache.set(key, block);
    return block;
}
export function getCachedBlockTypeId(dim, x, y, z) {
    return getCachedBlock(dim, x, y, z)?.typeId;
}
export function clearBlockCache() {
    blockCache.clear();
    cacheTick = -1;
}
