import { currentConfig } from "../data/config.js";
import { safeCall } from "./safe.js";

export interface ICommand {
    execute(): void;
}

export class CommandInvoker {
    public static execute(command: ICommand): void {
        safeCall(() => command.execute(), (e) => {
            console.warn(`${currentConfig.System.prefix} §cCommand Execution Error: ${e}`);
        }, "CommandInvoker.execute");
    }
}