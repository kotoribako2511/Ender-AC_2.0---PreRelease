import { currentConfig } from "../data/config.js";
import { safeCall } from "./safe.js";
export class CommandInvoker {
    static execute(command) {
        safeCall(() => command.execute(), (e) => {
            console.warn(`${currentConfig.System.prefix} §cCommand Execution Error: ${e}`);
        }, "CommandInvoker.execute");
    }
}
