import { ACPlayer } from "../data/type.js";
export class PlayerStateManager {
    static getPlayerData(player) {
        let data = this.playerDatas.get(player);
        if (!data) {
            data = new ACPlayer(player);
            this.playerDatas.set(player, data);
        }
        return data;
    }
    static removePlayerData(player) {
        this.playerDatas.delete(player);
    }
}
PlayerStateManager.playerDatas = new WeakMap();
export const PlayerDataManager = PlayerStateManager;
export const getPlayerData = (player) => PlayerStateManager.getPlayerData(player);
export const removePlayerData = (player) => PlayerStateManager.removePlayerData(player);
