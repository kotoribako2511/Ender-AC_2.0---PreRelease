import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { currentConfig, patchConfig } from "../../../data/config.js";
import { t } from "../../../state.js";
import { TPSCalculator } from "../../../util/util.js";
import { saveAndBack } from "../../helpers.js";

export class MovementCheckMenus {
    public static showSpeedMenu(player: Player, back: () => void): void {
        const c = currentConfig.Speed;
        new ModalFormData()
            .title(t("§lSpeed 設定", "§lSpeed Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: c.enabled })
            .textField(`Limit [実効値: ${TPSCalculator.scaleMultiply(c.limit).toFixed(2)}]`, "2.8", { defaultValue: c.limit.toString() })
            .textField("Freeze (ticks)", "200", { defaultValue: c.freezeTicks.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return back();
                patchConfig("Speed", {
                    enabled: Boolean(formValues[0]),
                    limit: Number(formValues[1]) || 2.8,
                    freezeTicks: Number(formValues[2]) || 200,
                });
                saveAndBack(player, "§aSpeed設定を保存しました。", "§aSpeed settings saved.", () => back());
            });
    }

    public static showFlyMenu(player: Player, back: () => void): void {
        const f = currentConfig.Fly;
        new ModalFormData()
            .title(t("§lFly 設定", "§lFly Settings"))
            .toggle(t("Fly A", "Fly A"), { defaultValue: f.flyA.enabled })
            .textField("FlyA Freeze", "200", { defaultValue: f.flyA.freezeTicks.toString() })
            .textField("FlyA Threshold", "5", { defaultValue: f.flagThreshold.toString() })
            .textField("FlyA DecayTicks", "60", { defaultValue: f.flagDecayTicks.toString() })
            .textField("FlyA DecayAmount", "1", { defaultValue: f.flagDecayAmount.toString() })
            .toggle(t("Fly C", "Fly C"), { defaultValue: f.flyC.enabled })
            .textField("FlyC Freeze", "200", { defaultValue: f.flyC.freezeTicks.toString() })
            .toggle(t("Fly G", "Fly G"), { defaultValue: f.flyG.enabled })
            .textField("FlyG Freeze", "200", { defaultValue: f.flyG.freezeTicks.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return back();
                patchConfig("Fly", {
                    flyA: {
                        enabled: Boolean(formValues[0]),
                        freezeTicks: Number(formValues[1]) || 200,
                        punish: f.flyA.punish,
                    },
                    flagThreshold: Number(formValues[2]) || 5,
                    flagDecayTicks: Number(formValues[3]) || 60,
                    flagDecayAmount: Number(formValues[4]) || 1,
                    flyC: {
                        enabled: Boolean(formValues[5]),
                        freezeTicks: Number(formValues[6]) || 200,
                        punish: f.flyC.punish,
                    },
                    flyG: {
                        enabled: Boolean(formValues[7]),
                        freezeTicks: Number(formValues[8]) || 200,
                        punish: f.flyG.punish, 
                    },
                });
                saveAndBack(player, "§aFly設定を保存しました。", "§aFly settings saved.", () => back());
            });
    }

    public static showBDSFlyMenu(player: Player, back: () => void): void {
        const b = currentConfig.BDSFly;
        new ModalFormData()
            .title(t("§lAirJump 設定", "§lAirJump Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: b.enabled })
            .textField("Freeze (ticks)", "20", { defaultValue: b.freezeTicks.toString() })
            .textField(t("Flag 閾値", "Flag threshold (phantom ground count to detect)"), "3", { defaultValue: (b.flagThreshold ?? 3).toString() })
            .textField(t("Flag 減衰間隔 (ticks)", "Flag decay interval (ticks)"), "100", { defaultValue: (b.flagDecayTicks ?? 100).toString() })
            .textField(t("Flag 減衰量", "Flag decay amount"), "1", { defaultValue: (b.flagDecayAmount ?? 1).toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return back();
                patchConfig("BDSFly", {
                    enabled: Boolean(formValues[0]),
                    freezeTicks: Number(formValues[1]) || 20,
                    flagThreshold: Math.max(1, Number(formValues[2]) || 3),
                    flagDecayTicks: Math.max(1, Number(formValues[3]) || 100),
                    flagDecayAmount: Math.max(1, Number(formValues[4]) || 1),
                });
                saveAndBack(player, "§aAirJump設定を保存しました。", "§aAirJump settings saved.", () => back());
            });
    }

    public static showNofallMenu(player: Player, back: () => void): void {
        const n = currentConfig.Nofall;
        const ff = currentConfig.FastFall ?? { enabled: true, threshold: -5.0, freezeTicks: 100, punish: { type: "freeze" as const, seconds: 30 } };

        new ModalFormData()
            .title(t("§lFall 設定", "§lFall Settings"))
            .toggle(t("Nofall", "NoFall Enabled"), { defaultValue: n.NofallEnabled })
            .toggle(t("SlowFall", "SlowFall detection"), { defaultValue: n.slowFallEnabled })
            .textField("Distance", "4.0", { defaultValue: n.distanceThreshold.toString() })
            .textField("SlowFall Threshold", "3", { defaultValue: n.slowFallFlagThreshold.toString() })
            .textField("SlowFall DecayTicks", "60", { defaultValue: n.slowFallFlagDecayTicks.toString() })
            .textField("SlowFall DecayAmount", "1", { defaultValue: n.slowFallFlagDecayAmount.toString() })
            .textField("SlowFall MinFallTicks", "20", { defaultValue: n.slowFallMinFallTicks.toString() })
            .toggle(t("OnGroundSpoof", "OnGroundSpoof"), { defaultValue: n.OnGroundSpoofEnabled })
            .textField("OnGroundSpoof ScanTick", "10", { defaultValue: n.onGroSpfScanTick.toString() })
            .toggle(t("FallSpoof", "FallSpoof"), { defaultValue: n.fallSpoofEnabled })
            .textField("FallSpoof ScoreThreshold", "30", { defaultValue: n.fallSpoofScoreThreshold.toString() })
            .toggle(t("FastFall", "FastFall detection"), { defaultValue: ff.enabled })
            .textField("FastFall Y Threshold", "-5.0", { defaultValue: ff.threshold.toString() })
            .textField("FastFall Freeze", "100", { defaultValue: ff.freezeTicks.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return back();
                const [
                    nofallEnabled, slowFallEnabled, distRaw,
                    sfThrRaw, sfDecayRaw, sfDecayAmtRaw, sfMinTicksRaw,
                    ogsEnabled, ogsTickRaw,
                    fsEnabled, fsScoreRaw,
                    ffEnabled, ffThresholdRaw, ffFreezeRaw,
                ] = formValues as [
                    boolean, boolean, string,
                    string, string, string, string,
                    boolean, string,
                    boolean, string,
                    boolean, string, string,
                ];

                patchConfig("Nofall", {
                    NofallEnabled: nofallEnabled,
                    slowFallEnabled: slowFallEnabled,
                    distanceThreshold: Number(distRaw) || 4.0,
                    slowFallFlagThreshold: Number(sfThrRaw) || 3,
                    slowFallFlagDecayTicks: Number(sfDecayRaw) || 60,
                    slowFallFlagDecayAmount: Number(sfDecayAmtRaw) || 1,
                    slowFallMinFallTicks: Number(sfMinTicksRaw) || 20,
                    OnGroundSpoofEnabled: ogsEnabled,
                    onGroSpfScanTick: Number(ogsTickRaw) || 10,
                    fallSpoofEnabled: fsEnabled,
                    fallSpoofScoreThreshold: Number(fsScoreRaw) || 30,
                });

                patchConfig("FastFall", {
                    enabled: ffEnabled,
                    threshold: Number(ffThresholdRaw) || -5.0,
                    freezeTicks: Number(ffFreezeRaw) || 100,
                });

                saveAndBack(player, "§aFall設定を保存しました。", "§aFall settings saved.", () => back());
            });
    }

    public static showStepMenu(player: Player, back: () => void): void {
        const s = currentConfig.Step;
        new ModalFormData()
            .title(t("§lStep 設定", "§lStep Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: s.enabled })
            .textField("MinSpeed", "0.1", { defaultValue: s.minSpeed.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return back();
                patchConfig("Step", { enabled: Boolean(formValues[0]), minSpeed: Number(formValues[1]) || 0.1 });
                saveAndBack(player, "§aStep設定を保存しました。", "§aStep settings saved.", () => back());
            });
    }

    public static showNoClipMenu(player: Player, back: () => void): void {
        const nc = currentConfig.NoClip;
        new ModalFormData()
            .title(t("§lNoClip 設定", "§lNoClip Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: nc.enabled })
            .textField("Y speed", "-0.5", { defaultValue: nc.speedY.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return back();
                patchConfig("NoClip", { enabled: Boolean(formValues[0]), speedY: Number(formValues[1]) || -0.5 });
                saveAndBack(player, "§aNoClip設定を保存しました。", "§aNoClip settings saved.", () => back());
            });
    }

    public static showPhaseMenu(player: Player, back: () => void): void {
        const p = currentConfig.Phase;
        new ModalFormData()
            .title(t("§lPhase 設定", "§lPhase Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: p.enabled })
            .textField("Speed", "0.8", { defaultValue: p.Speed.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return back();
                patchConfig("Phase", { enabled: Boolean(formValues[0]), Speed: Number(formValues[1]) || 0.8 });
                saveAndBack(player, "§aPhase設定を保存しました。", "§aPhase settings saved.", () => back());
            });
    }

    public static showNoSlowMenu(player: Player, back: () => void): void {
        const c = currentConfig.NoSlow ?? { enabled: true, threshold: 0.4, freezeTicks: 100, punish: { type: "freeze" as const, seconds: 30 } };
        new ModalFormData()
            .title(t("§lNoSlow 設定", "§lNoSlow Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: c.enabled })
            .textField("Speed Threshold", "0.4", { defaultValue: c.threshold.toString() })
            .textField("Freeze", "100", { defaultValue: c.freezeTicks.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return back();
                patchConfig("NoSlow", {
                    enabled: Boolean(formValues[0]),
                    threshold: Number(formValues[1]) || 0.4,
                    freezeTicks: Number(formValues[2]) || 100,
                });
                saveAndBack(player, "§aNoSlow設定を保存しました。", "§aNoSlow settings saved.", () => back());
            });
    }

    public static showAirSwimMenu(player: Player, back: () => void): void {
        const c = currentConfig.AirSwim ?? { enabled: true, freezeTicks: 100, punish: { type: "freeze" as const, seconds: 30 } };
        new ModalFormData()
            .title(t("§lAirSwim 設定", "§lAirSwim Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: c.enabled })
            .textField("Freeze", "100", { defaultValue: c.freezeTicks.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return back();
                patchConfig("AirSwim", { enabled: Boolean(formValues[0]), freezeTicks: Number(formValues[1]) || 100 });
                saveAndBack(player, "§aAirSwim設定を保存しました。", "§aAirSwim settings saved.", () => back());
            });
    }

    public static showContradictionMenu(player: Player, back: () => void): void {
        const c = currentConfig.Contradiction ?? { enabled: false, sprintSneak: true, groundFall: true, fallDecel: true, sprintSneakPunish: { type: "notify" as const, seconds: 30 }, groundFallPunish: { type: "notify" as const, seconds: 30 }, fallDecelPunish: { type: "notify" as const, seconds: 30 } };
        new ModalFormData()
            .title(t("§lContradiciton 設定", "§lContradiction Settings"))
            .toggle(t("全体有効", "Enabled"), { defaultValue: c.enabled })
            .toggle(t("Sprint + Sneak", "Sprint + Sneak"), { defaultValue: c.sprintSneak })
            .toggle(t("OnGround + Falling", "OnGround + Falling"), { defaultValue: c.groundFall })
            .toggle(t("Fall Deceleration", "Fall Deceleration"), { defaultValue: c.fallDecel })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return back();
                patchConfig("Contradiction", {
                    enabled: Boolean(formValues[0]),
                    sprintSneak: Boolean(formValues[1]),
                    groundFall: Boolean(formValues[2]),
                    fallDecel: Boolean(formValues[3]),
                });
                saveAndBack(player, "§a矛盾検知設定を保存しました。", "§aContradiction settings saved.", () => back());
            });
    }

    public static showScaffoldMenu(player: Player, back: () => void): void {
        const s = currentConfig.Scaffold;
        new ModalFormData()
            .title(t("§lScaffold 設定", "§lScaffold Settings"))
            .toggle(t("有効", "Enabled"), { defaultValue: s.enabled })
            .toggle(t("A", "A"), { defaultValue: s.A })
            .toggle(t("B", "B"), { defaultValue: s.B })
            .toggle(t("C", "C"), { defaultValue: s.C })
            .toggle(t("D", "D"), { defaultValue: s.D })
            .toggle(t("E", "E"), { defaultValue: s.E })
            .toggle(t("F", "F"), { defaultValue: s.F })
            .toggle(t("G", "G"), { defaultValue: s.G })
            .toggle(t("H", "H"), { defaultValue: s.H })
            .textField("minBPS", "4", { defaultValue: s.minBPS.toString() })
            .textField("minSpeed", "0.18", { defaultValue: s.minSpeed.toString() })
            .textField("dDiff", "15", { defaultValue: s.dDiff.toString() })
            .textField("flagThreshold", "5", { defaultValue: s.flagThreshold.toString() })
            .textField("flagDecayTicks", "60", { defaultValue: s.flagDecayTicks.toString() })
            .textField("flagDecayAmount", "1", { defaultValue: s.flagDecayAmount.toString() })
            .textField("freezeTicks", "200", { defaultValue: s.freezeTicks.toString() })
            .show(player)
            .then(({ canceled, formValues }) => {
                if (canceled || !formValues) return back();
                const n = formValues.map((v) => Number(v)) as number[];
                patchConfig("Scaffold", {
                    enabled: Boolean(formValues[0]),
                    A: Boolean(formValues[1]), B: Boolean(formValues[2]),
                    C: Boolean(formValues[3]), D: Boolean(formValues[4]),
                    E: Boolean(formValues[5]), F: Boolean(formValues[6]),
                    G: Boolean(formValues[7]), H: Boolean(formValues[8]),
                    minBPS: n[9] || 4, minSpeed: n[10] || 0.18, dDiff: n[11] || 15,
                    flagThreshold: n[12] || 5, flagDecayTicks: n[13] || 60,
                    flagDecayAmount: n[14] || 1, freezeTicks: n[15] || 200,
                });
                saveAndBack(player, "§a保存しました。", "§aSaved.", () => back());
            });
    }
}