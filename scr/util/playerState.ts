import { Player } from "@minecraft/server";
import { ACPlayer } from "../data/type.js";

export class PlayerStateManager {
    private static playerDatas = new WeakMap<Player, ACPlayer>();

    public static getPlayerData(player: Player): ACPlayer {
        let data = this.playerDatas.get(player);
        if (!data) {
            data = new ACPlayer(player);
            this.playerDatas.set(player, data);
        }
        return data;
    }

    public static removePlayerData(player: Player): void {
        this.playerDatas.delete(player);
    }
}

export const PlayerDataManager = PlayerStateManager;
export const getPlayerData = (player: Player) => PlayerStateManager.getPlayerData(player);
export const removePlayerData = (player: Player) => PlayerStateManager.removePlayerData(player);