import { Block, BlockPermutation, Vector3, Player } from "@minecraft/server";

export type PunishmentType = "ban" | "kick" | "tempkick" | "notify" | "none" | "freeze" | "setback" | "freeze_setback";
export type DirectionType = "Up" | "Down" | "East" | "West" | "North" | "South";

export interface PunishmentPair {
    type: PunishmentType;
    seconds: number;
}

export interface PunishmentConfig {
    punish?: PunishmentPair;
    freezeTicks?: number;
    hit?: PunishmentPair;
    break?: PunishmentPair;
    place?: PunishmentPair;
    sleep?: PunishmentPair;
    multiHit?: PunishmentPair;
}

export interface ChatData {
    Time: number;
    Message: string;
}

export interface BreakBlockData {
    Block: Block;
    Time: number;
    Permutation: BlockPermutation;
}

export interface Noswing {
    hit_tick?: number;
    place_tick?: number;
    break_tick?: number;
    swing_tick?: number;
    swing: boolean;
}

export interface MovingData {
    Speed: number;
    SpeedX: number;
    SpeedY: number;
    SpeedZ: number;
    LastSpeedY: number;
    Reach: number;
    YDiff: number;
}

export interface Lock {
    Ride: boolean;
    Climb: boolean;
    Freeze_Detection: boolean;
    RideSafe: boolean;
}

export interface InstaBreak {
    typeId: string;
    date: number;
    location: Vector3;
    permutation: BlockPermutation;
}

export interface NofallData {
    isFallingFlag: boolean;
    fallStartY: number;
    tookFallDamage: boolean;
    isChecking: boolean;
    isslowFall: number[];
    spoofScore: number;
    serverIsFalling: boolean;
    lastComputedTick: number;
    airTicks: number;
    consecutiveDownTicks: number;
    fallingTicks: number;
}

export interface AutoTotemArr {
    dration: number;
    effectName: string;
    date: number;
}

export interface AutoTotem {
    AutoTotemArr: AutoTotemArr[];
    Activation: boolean;
    lastOffhand: boolean;
    lastMainhand: boolean;
    Tick: number;
}

export interface BlockLogEntry {
    x: number;
    y: number;
    z: number;
    dim: string;
    action: "place" | "break";
    player: string;
    block: string;
    time: number;
}

export interface PlayerAccessLogEntry {
    time: number;
    name: string;
    type: "spawn" | "join" | "leave" | "denied";
    reason?: string;
}

export interface WhitelistPlayer {
    name: string;
    persistentId?: string;
}

export interface WhitelistConfig {
    enabled: boolean;
    players: WhitelistPlayer[];
}

export interface joinBypass {
    enable: boolean;
}

export interface DetectionBypassConfig {
    owner: boolean;
    admin: boolean;
}

export interface PermissionsConfig {
    bypass: { [key: string]: DetectionBypassConfig };
}

export interface MuteConfig {
    enabled: boolean;
    adminCanSee: boolean;
    ownerCanSee: boolean;
    muteMessage: string;
    notifyToStaff: boolean;
}

export interface SafeTeleportZone {
    name: string;
    x1: number;
    y1: number;
    z1: number;
    x2: number;
    y2: number;
    z2: number;
    dim: string;
}

export interface TeleportConfig {
    enabled: boolean;
    allowableError: number;
    speedMultiplier: number;
    minimumDistance: number;
    safeZones: SafeTeleportZone[];
}

export interface TeleportState {
    allowedUntilTick: number;
    justRolledBack: boolean;
    riptideActive: boolean;
    riptideStartTick: number;
    riptideStartLoc?: Vector3;
    riptideGroundTicks: number;
    chorusActive: boolean;
    chorusStartTick: number;
    pearlGraceActive: boolean;
    pearlsInFlight: number;
    pearlGraceCapTick: number;
    isDead: boolean;
    knockbackGraceActive: boolean;
    knockbackGraceUntil: number;
    knockbackWasInAir: boolean;
}

export interface FlagState {
    vl: number;
    lastFlagTick: number;
}

export interface PlaceLogEntry {
    at: number;
    blockId: string;
    block: Block;
}

export interface ScaffoldData {
    placeLog: PlaceLogEntry[];
    lastLocation?: Vector3;
    potentialScaffold: number;
    types: Set<string>;
    flag: FlagState;
}

export interface BanEntry {
    name: string;
    persistentId: string;
    reason?: string;
    bannedAt: number;
    expireAt: number | null;
    by: string;
}

export interface MuteEntry {
    name: string;
    persistentId: string;
    reason?: string;
    mutedAt: number;
    expireAt: number | null;
    by: string;
}

export interface AdminActionLogEntry {
    time: number;
    admin: string;
    action: string;
    target: string;
    targetId?: string;
    reason?: string;
    duration?: number | null;
}

export interface BDSFly {
    BDSfly: number[];
    lastOnGroundBDS: boolean;
    bdsflyFlag: FlagState;
}

export class ACPlayer {
    public readonly player: Player;
    public moving: MovingData;
    public lastLocation?: Vector3;
    public lastDimension: string;
    public lastRotation?: { x: number, y: number };
    public lastActiveTick: number;
    public lastChat?: ChatData;
    public Breakblock: BreakBlockData[];
    public boatfly: number[];
    public BDSfly: BDSFly;
    public flyA: number[];
    public flyAY: number[];
    public killauraMultiHitTick: number;
    public killauraMultiEntities: string[];
    public killauraIgnoreHit: boolean;
    public Lock: Lock;
    public lastOnGround_loc: Vector3;
    public Noswing: Noswing;
    public cps: number[];
    public swingTicks: number[];
    public Nofall: NofallData;
    public InstaBreak: InstaBreak[];
    public AutoTotem: AutoTotem;
    public joinBypass: joinBypass;
    public teleport: TeleportState;
    public flyFlag: FlagState;
    public slowfallFlag: FlagState;
    public scaffold: ScaffoldData;
    public pingEma: number;
    public lastLandProtectLoc?: Vector3;

    constructor(player: Player) {
        this.player = player;
        this.moving = { Speed: 0, SpeedX: 0, SpeedY: 0, SpeedZ: 0, LastSpeedY: 0, Reach: 0, YDiff: 0 };
        this.Breakblock = [];
        this.boatfly = [];
        this.BDSfly = {
            BDSfly: [],
            lastOnGroundBDS: false,
            bdsflyFlag: { vl: 0, lastFlagTick: 0 }
        };
        this.flyA = [];
        this.flyAY = [];
        this.killauraMultiHitTick = 0;
        this.killauraMultiEntities = [];
        this.killauraIgnoreHit = false;
        this.Lock = { Ride: true, Climb: true, Freeze_Detection: true, RideSafe: true };
        this.lastOnGround_loc = player.location;
        this.lastDimension = player.dimension.id;
        this.Noswing = { swing: false };
        this.cps = [];
        this.swingTicks = [];
        this.Nofall = {
            isFallingFlag: false,
            fallStartY: 0,
            tookFallDamage: false,
            isChecking: false,
            isslowFall: [],
            spoofScore: 0,
            serverIsFalling: false,
            lastComputedTick: -1,
            airTicks: 0,
            consecutiveDownTicks: 0,
            fallingTicks: 0,
        };
        this.InstaBreak = [];
        this.AutoTotem = { AutoTotemArr: [], Activation: false, lastOffhand: false, lastMainhand: false, Tick: NaN };
        this.lastActiveTick = 0;
        this.joinBypass = { enable: true };
        this.teleport = {
            allowedUntilTick: 0,
            justRolledBack: false,
            riptideActive: false,
            riptideStartTick: 0,
            riptideStartLoc: undefined,
            riptideGroundTicks: 0,
            chorusActive: false,
            chorusStartTick: 0,
            pearlGraceActive: false,
            pearlsInFlight: 0,
            pearlGraceCapTick: 0,
            isDead: false,
            knockbackGraceActive: false,
            knockbackGraceUntil: 0,
            knockbackWasInAir: false,
        };
        this.flyFlag = { vl: 0, lastFlagTick: 0 };
        this.slowfallFlag = { vl: 0, lastFlagTick: 0 };
        this.scaffold = {
            placeLog: [],
            lastLocation: undefined,
            potentialScaffold: 0,
            types: new Set(),
            flag: { vl: 0, lastFlagTick: 0 }
        };
        this.pingEma = 0;
        this.lastLandProtectLoc = undefined;
    }
}

export interface SystemConfig {
    prefix: string;
    intervalTick: number;
    GMConsoleNotice: boolean;
    GMWorldNotice: boolean;
    GMChangeNoticeEnabled: boolean;
    GMStaffNotice: boolean;
    lockTimeoutMs: number;
    dynamicTps: boolean;
    autoDeop: boolean;
}

export interface ChatConfig {
    chatLimitEnabled: boolean;
    maxLength: number;
    cooldownMs: number;
    bannedWords: string[];
}

export interface ReachConfig {
    enabled: boolean;
    notice?: boolean;
    hitThreshold: number;
    creative_hitThreshold: number;
    breakThreshold: number;
    creative_breakThreshold: number;
    placeThreshold: number;
    creative_placeThreshold: number;
    hit: PunishmentPair;
    break: PunishmentPair;
    place: PunishmentPair;
}

export interface KillauraConfig {
    enabled: boolean;
    freezeTicks: number;
    multiHitThreshold: number;
    sleep: PunishmentPair;
    multiHit: PunishmentPair;
}

export interface IllegalItemConfig {
    enabled: boolean;
    scanIntervalTick: number;
    checkEnchant: boolean;
    checkAmount: boolean;
    checkName: boolean;
    checkIllegalId: boolean;
    checkEntity: boolean;
    customItems: string[];
}

export interface NoSwingConfig {
    enabled: boolean;
    delayMs: number;
    hit: PunishmentPair;
    break: PunishmentPair;
    place: PunishmentPair;
}

export interface SpeedConfig {
    enabled: boolean;
    limit: number;
    freezeTicks: number;
    punish: PunishmentPair;
}

export interface FlyVariantConfig {
    enabled: boolean;
    freezeTicks: number;
    punish: PunishmentPair;
}

export interface FlyConfig {
    flyA: FlyVariantConfig;
    flyC: FlyVariantConfig;
    flyG: FlyVariantConfig;
    flagThreshold: number;
    flagDecayTicks: number;
    flagDecayAmount: number;
}

export interface BDSFlyConfig {
    enabled: boolean;
    threshold: number;
    freezeTicks: number;
    punish: PunishmentPair;
    flagThreshold: number;
    flagDecayTicks: number;
    flagDecayAmount: number;
}

export interface NofallConfig {
    NofallEnabled: boolean;
    OnGroundSpoofEnabled: boolean;
    distanceThreshold: number;
    onGroSpfScanTick: number;
    slowFallEnabled: boolean;
    slowFallFlagThreshold: number;
    slowFallFlagDecayTicks: number;
    slowFallFlagDecayAmount: number;
    slowFallMinFallTicks: number;
    fallSpoofEnabled: boolean;
    fallSpoofScoreThreshold: number;
    aBeta: PunishmentPair;
    onGroSpf: PunishmentPair;
    slowFall: PunishmentPair;
    fallSpoof: PunishmentPair;
}

export interface StepConfig {
    enabled: boolean;
    minSpeed: number;
    punish: PunishmentPair;
}

export interface NoClipConfig {
    enabled: boolean;
    speedY: number;
    punish: PunishmentPair;
}

export interface Phase {
    enabled: boolean;
    Speed: number;
    punish: PunishmentPair;
}

export interface ContradictionConfig {
    enabled: boolean;
    sprintSneak: boolean;
    fallDecel: boolean;
    sprintSneakPunish: PunishmentPair;
    fallDecelPunish: PunishmentPair;
}

export interface FastFallConfig {
    enabled: boolean;
    threshold: number;
    freezeTicks: number;
    punish: PunishmentPair;
}

export interface NoSlowConfig {
    enabled: boolean;
    threshold: number;
    freezeTicks: number;
    punish: PunishmentPair;
}

export interface AirSwimConfig {
    enabled: boolean;
    freezeTicks: number;
    punish: PunishmentPair;
}

export interface NukerConfig {
    enabled: boolean;
    maxBlocks: number;
    punish: PunishmentPair;
}

export interface BlockPlaceConfig {
    enabled: boolean;
    illegalPlace: boolean;
    resetData: boolean;
    resetBlocks: string[];
    illegalcontainer: boolean;
    illegalBlocks: string[];
    airPlace: {
        enabled: boolean;
    };
}

export interface cps {
    enabled: boolean;
    scanIntervalTick: number;
    cpsThreshold: number;
    punish: PunishmentPair;
}

export interface InstaBreakConfig {
    enabled: boolean;
    cancel: boolean;
    illegalBlocks: string[];
    punish: PunishmentPair;
}

export interface ScaffoldConfig {
    enabled: boolean;
    A: boolean;
    B: boolean;
    C: boolean;
    D: boolean;
    E: boolean;
    F: boolean;
    G: boolean;
    H: boolean;
    minBPS: number;
    minSpeed: number;
    dDiff: number;
    flagThreshold: number;
    flagDecayTicks: number;
    flagDecayAmount: number;
    freezeTicks: number;
    punish: PunishmentPair;
}

export interface AutoTotemConfig {
    enabled: boolean;
    threshold: number;
}

export interface entityConfig {
    enabled: boolean;
    checkInvEnabled: boolean;
    resetData: boolean;
    ResetEntities: string[];
    IllegalEntities: string[];
    noticeEnabled: boolean;
    NoticeEntities: string[];
    limitEnabled: boolean;
    limitCount: number;
}

export interface SpawnEggConfig {
    rejection: boolean;
    notice: boolean;
    illegalEggs: string[];
}

export interface CoreProtectConfig {
    enabled: boolean;
    maxLogs: number;
}

export interface AFKConfig {
    enabled: boolean;
    timeoutSeconds: number;
}

export interface JoinConfig {
    enabled: boolean;
    kickMessage: string;
    checkPersistentId: boolean;
    checkNameLength: boolean;
    minNameLength: number;
    maxNameLength: number;
    checkSteve: boolean;
    checkSpecialChars: boolean;
    checkRenderDistance: boolean;
    spawnTimeoutTick: number;
}

export interface LandProtectZone {
    id: string;
    name: string;
    x1: number;
    y1: number;
    z1: number;
    x2: number;
    y2: number;
    z2: number;
    dim: string;
    blockBreak: boolean;
    blockPlace: boolean;
    interact: boolean;
    entry: boolean;
    allowedPlayers: string[];
    allowOwner: boolean;
    allowAdmin: boolean;
}

export interface LandProtectConfig {
    enabled: boolean;
    zones: LandProtectZone[];
}

export interface ACConfig {
    System: SystemConfig;
    Chat: ChatConfig;
    Mute: MuteConfig;
    Teleport: TeleportConfig;
    Reach: ReachConfig;
    Killaura: KillauraConfig;
    NoSwing: NoSwingConfig;
    Speed: SpeedConfig;
    Fly: FlyConfig;
    BDSFly: BDSFlyConfig;
    Nofall: NofallConfig;
    Phase: Phase;
    Step: StepConfig;
    NoClip: NoClipConfig;
    Nuker: NukerConfig;
    BlockPlace: BlockPlaceConfig;
    IllegalItem: IllegalItemConfig;
    cps: cps;
    InstaBreak: InstaBreakConfig;
    Scaffold: ScaffoldConfig;
    AutoTotem: AutoTotemConfig;
    entity: entityConfig;
    SpawnEgg: SpawnEggConfig;
    CoreProtect: CoreProtectConfig;
    AFK: AFKConfig;
    Whitelist: WhitelistConfig;
    Join: JoinConfig;
    Permissions: PermissionsConfig;
    FastFall: FastFallConfig;
    NoSlow: NoSlowConfig;
    AirSwim: AirSwimConfig;
    Contradiction: ContradictionConfig;
    LandProtect: LandProtectConfig;
}