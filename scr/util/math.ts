import { Entity, Vector3 } from "@minecraft/server";
import { NON_FULL_BLOCK_KEYWORDS } from "../data/info.js";
import { MC_AIR } from "./constants.js";

export class MathUtils {
    public static checkBlocks(typeId?: string): boolean {
        if (!typeId || typeId === MC_AIR) return false;
        return !NON_FULL_BLOCK_KEYWORDS.some((key) => typeId.includes(key));
    }

    public static isQuadratic(v: number[]): number {
        if (v.length < 5) return Infinity;
        const a = v[0] - 2 * v[1] + v[2];
        const b = v[1] - 2 * v[2] + v[3];
        const c = v[2] - 2 * v[3] + v[4];
        const mean = (a + b + c) / 3;
        if (Math.abs(mean) < 0.001) return Infinity;
        const da = a - mean;
        const db = b - mean;
        const dc = c - mean;
        return Math.sqrt((da * da + db * db + dc * dc) / 3);
    }

    public static getEntityDistanceSq(playerEye: Vector3, target: Entity): number {
        const tLoc = target.location, tHead = target.getHeadLocation();
        const closestY = Math.max(tLoc.y, Math.min(playerEye.y, tHead.y));
        const dx = tLoc.x - playerEye.x, dy = closestY - playerEye.y, dz = tLoc.z - playerEye.z;
        return dx * dx + dy * dy + dz * dz;
    }

    public static getEntityDistance(playerEye: Vector3, target: Entity): number {
        return Math.sqrt(this.getEntityDistanceSq(playerEye, target));
    }

    public static getBlockDistanceSq(eye: Vector3, bLoc: Vector3): number {
        const closestX = Math.max(bLoc.x, Math.min(eye.x, bLoc.x + 1));
        const closestY = Math.max(bLoc.y, Math.min(eye.y, bLoc.y + 1));
        const closestZ = Math.max(bLoc.z, Math.min(eye.z, bLoc.z + 1));
        const dx = eye.x - closestX, dy = eye.y - closestY, dz = eye.z - closestZ;
        return dx * dx + dy * dy + dz * dz;
    }

    public static getBlockDistance(eye: Vector3, bLoc: Vector3): number {
        return Math.sqrt(this.getBlockDistanceSq(eye, bLoc));
    }

    public static getHitAngle(eye: Vector3, view: Vector3, targetLoc: Vector3): number {
        const dx = targetLoc.x - eye.x, dy = targetLoc.y - eye.y, dz = targetLoc.z - eye.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq === 0) return 0;
        const dist = Math.sqrt(distSq);
        const dot = Math.max(-1, Math.min(1, (view.x * dx + view.y * dy + view.z * dz) / dist));
        return Math.acos(dot) * (180 / Math.PI);
    }
}