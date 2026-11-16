export class ACPlayer {
    constructor(player) {
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
    }
}
