import { Player, world } from "@minecraft/server";
import { safeCall } from "./util/safe.js";

export const ACState = {
    enabled: false
};

export type Language = "ja" | "en";

const KEY_OWNER_NAME = "eac_owner_name";
const KEY_OWNER_ID = "eac_owner_id";
const KEY_DEBUG_MODE = "eac_debug_mode";
const KEY_LANGUAGE = "eac_language";

let cachedOwnerName: string | null = null;
let cachedOwnerId: string | null = null;
let cacheLoaded = false;

let cachedDebugMode = false;
let debugCacheLoaded = false;

let cachedLanguage: Language = "ja";
let languageCacheLoaded = false;

function ensureCacheLoaded(): void {
    if (cacheLoaded) return;
    try {
        const n = world.getDynamicProperty(KEY_OWNER_NAME);
        const i = world.getDynamicProperty(KEY_OWNER_ID);
        cachedOwnerName = typeof n === "string" && n.length > 0 ? n : null;
        cachedOwnerId = typeof i === "string" && i.length > 0 ? i : null;
    } catch {
        cachedOwnerName = null;
        cachedOwnerId = null;
    }
    cacheLoaded = true;
}

function ensureDebugLoaded(): void {
    if (debugCacheLoaded) return;
    safeCall(() => {
        const v = world.getDynamicProperty(KEY_DEBUG_MODE);
        cachedDebugMode = v === true;
    }, () => {
        cachedDebugMode = false;
    });
    debugCacheLoaded = true;
}

function ensureLanguageLoaded(): void {
    if (languageCacheLoaded) return;
    safeCall(() => {
        const v = world.getDynamicProperty(KEY_LANGUAGE);
        cachedLanguage = v === "en" ? "en" : "ja";
    }, () => {
        cachedLanguage = "ja";
    });
    languageCacheLoaded = true;
}

export function reloadServerOwnerCache(): void {
    cacheLoaded = false;
    ensureCacheLoaded();
}

export function saveServerOwner(name: string, id: string): void {
    safeCall(() => {
        world.setDynamicProperty(KEY_OWNER_NAME, name);
        world.setDynamicProperty(KEY_OWNER_ID, id);
        cachedOwnerName = name;
        cachedOwnerId = id;
        cacheLoaded = true;
    });
}

export function getServerOwnerName(): string | null {
    ensureCacheLoaded();
    return cachedOwnerName;
}

export function getServerOwnerId(): string | null {
    ensureCacheLoaded();
    return cachedOwnerId;
}

export function hasServerOwner(): boolean {
    ensureCacheLoaded();
    return cachedOwnerName !== null;
}

export function isServerOwnerByName(name: string | undefined | null): boolean {
    if (!name) return false;
    ensureCacheLoaded();
    return cachedOwnerName !== null && cachedOwnerName === name;
}

export function isServerOwnerById(id: string | undefined | null): boolean {
    if (!id) return false;
    ensureCacheLoaded();
    return cachedOwnerId !== null && cachedOwnerId === id;
}

export function isServerOwnerByPlayer(player: Player | undefined): boolean {
    try {
        if (!player) return false;
        if (isServerOwnerByName(player.name)) return true;
        if (isServerOwnerById(player.id)) return true;
    } catch { }
    return false;
}

export function isDebugMode(): boolean {
    ensureDebugLoaded();
    return cachedDebugMode;
}

export function setDebugMode(value: boolean): void {
    safeCall(() => world.setDynamicProperty(KEY_DEBUG_MODE, value));
    cachedDebugMode = value;
    debugCacheLoaded = true;
}

export function getLanguage(): Language {
    ensureLanguageLoaded();
    return cachedLanguage;
}

export function setLanguage(lang: Language): void {
    safeCall(() => world.setDynamicProperty(KEY_LANGUAGE, lang));
    cachedLanguage = lang;
    languageCacheLoaded = true;
}

export function toggleLanguage(): Language {
    const next: Language = getLanguage() === "ja" ? "en" : "ja";
    setLanguage(next);
    return next;
}

export function t(ja: string, en: string): string {
    return getLanguage() === "en" ? en : ja;
}