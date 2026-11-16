import {
    CustomCommandOrigin, CustomCommandParamType, CustomCommandResult,
    CustomCommandStatus, Player,
} from "@minecraft/server";

export interface CommandContext {
    origin: CustomCommandOrigin;
    player?: Player;
    adminName: string;
}

export interface CommandParam {
    name: string;
    type: CustomCommandParamType;
    optional?: boolean;
}

export interface CommandDefinition {
    name: string;
    description: string;
    permissionLevel: number;
    permission?: (ctx: CommandContext) => true | { error: string };
    params?: CommandParam[];
    handler: (ctx: CommandContext, args: unknown[]) => CustomCommandResult | CustomCommandStatus;
}

export interface CommandRegistry {
    registerCommand: (def: {
        name: string;
        description: string;
        permissionLevel: number;
        mandatoryParameters?: unknown[];
        optionalParameters?: unknown[];
    }, callback: (origin: CustomCommandOrigin, ...args: unknown[]) => CustomCommandResult | CustomCommandStatus) => void;
}

export function getPlayerContext(origin: CustomCommandOrigin): CommandContext {
    const src = origin.sourceEntity;
    const player = src instanceof Player ? src : undefined;
    return { origin, player, adminName: player?.name ?? "Console" };
}

export function failure(message: string): CustomCommandResult {
    return { status: CustomCommandStatus.Failure, message };
}

export function success(message?: string): CustomCommandResult {
    return { status: CustomCommandStatus.Success, message };
}