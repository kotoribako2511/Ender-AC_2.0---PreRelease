export const CHUNK_SIZE = 32000;
export const MAX_CHUNKS = 100;
export const STORAGE_MAX_CHUNKS = MAX_CHUNKS;
export const LOG_BATCH_SIZE = 2000;
export const TPS_SAMPLE_SIZE = 20;
export const TPS_WARN_INTERVAL_MS = 50;

export const DEFAULT_MAX_LOGS = 3000;
export const LOG_UPPER_BOUND_FACTOR = 1.1;
export const PERMISSION_CACHE_TTL_TICKS = 20;
export const PERMISSION_CACHE_EXPIRY_TICKS = 200;
export const STORAGE_MAX_BYTES = CHUNK_SIZE * STORAGE_MAX_CHUNKS;

export const MC_AIR = "minecraft:air";
export const MC_PLAYER = "minecraft:player";
export const MC_ITEM = "minecraft:item";

export const DP_KEYS = {
    permission: "eac:permission",
    banChunks: "ban_list_count",
    banPrefix: "ban_list_",
    banLegacy: "BannedPlayerList",
    muteList: "mute_list",
    muteChunks: "mute_list_count",
    mutePrefix: "mute_list_",
    blockLogChunks: "block_logs_count",
    blockLogPrefix: "block_logs_",
    blockLogLegacy: "block_logs",
    playerAccessLogs: "player_access_logs",
    playerAccessLogChunks: "player_access_logs_count",
    playerAccessLogPrefix: "player_access_logs_",
    adminActionLogs: "admin_action_logs",
    adminActionLogChunks: "admin_action_logs_count",
    adminActionLogPrefix: "admin_action_logs_",
    configPrefix: "ac_config_",
    configChunks: "ac_config_count",
    config: "ac",
    language: "eac_language",
} as const;

export const TAG_KEYS = {
    nuker: "nuker",
    mute: "mute",
    tpBypass: "eac:tpBypass",
    sleeping: "sleeping",
} as const;

export const MS_PER_TICK = 50;
export const ENDER_PEARL_GRACE_TICKS = 100;
export const FLUSH_INTERVAL_TICKS = 100;
export const BAN_MUTE_CLEAN_INTERVAL_TICKS = 100;
export const PERMISSION_CACHE_CLEAN_INTERVAL_TICKS = 100;
export const SWING_TICKS_BUFFER_SIZE = 200;
export const INSPECT_UI_COOLDOWN_TICKS = 10;

export const RIPTIDE_MAX_FLIGHT_TICKS = 120;
export const RIPTIDE_MAX_DISTANCE = 50;
export const RIPTIDE_GROUND_CONFIRM_TICKS = 3;
export const RIPTIDE_STARTUP_PROTECT_TICKS = 10;

export const CHORUS_MAX_WAIT_TICKS = 50;

export const PEARL_MAX_GRACE_TICKS = 400;

export const EXPLOSION_KNOCKBACK_GRACE_TICKS = 20;
export const EXPLOSION_KNOCKBACK_GRACE_MAX_TICKS = 300;

export const RESPAWN_TELEPORT_GRACE_TICKS = 40;

export const RESPAWN_GRACE_TICKS = 40;

export const ALTITUDE_LIMIT = 319;