import { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { getLanguage, Language, t } from "../state.js";

interface ManualSection {
    title: string;
    body: string;
}

export class ManualUI {
    public static showManual(player: Player, language?: string): void {
        const lang: Language = language === "ja" || language === "en" ? language : getLanguage();
        const sections = this.getSections(lang);
        const form = new ActionFormData()
            .title(t("§5§l[Ender-AC] §r§l取扱説明書", "§5§l[Ender-AC] §r§lInstructions"))
            .body(t(
                "§7閲覧したい項目を選択してください。\n§7各項目は独立したページで表示されます。",
                "§7Select a section to view.\n§7Each section is shown on its own page.",
            ));
        for (const s of sections) form.button(`§l${s.title}`);
        form.button(t("§l戻る", "§lBack"));
        form.show(player).then(({ canceled, selection }) => {
            if (canceled || selection === undefined || selection === sections.length) {
                return this.backToMain(player);
            }
            this.showSection(player, sections[selection], lang);
        });
    }

    private static showSection(player: Player, section: ManualSection, lang: Language): void {
        new ActionFormData()
            .title(section.title)
            .body(section.body)
            .button(t("§l戻る", "§lBack"))
            .show(player).then(() => {
                this.showManual(player, lang);
            });
    }

    private static backToMain(player: Player): void {
        import("./main-menu.js").then((m) => m.MainMenuUI.showMainMenu(player)).catch(() => { });
    }

    private static getSections(lang: Language): ManualSection[] {
        return lang === "en" ? this.sectionsEn() : this.sectionsJa();
    }

    private static sectionsJa(): ManualSection[] {
        return [
            {
                title: "§l概要",
                body:
                    "§l§b=== Ender-AC 概要 ===\n\n" +
                    "§7Ender-AC は Minecraft Bedrock Edition 向けの\n" +
                    "§7サーバー管理 & チート検知アドオンです。\n\n" +
                    "§7技術力が低い人が作ったため、信用はしないでね。\n" +
                    "§7全ての検出項目は個別に有効 / 無効を切替可能です。\n" +
                    "§7検出時の罰則も項目ごとに「通知のみ」「位置巻き戻し」\n" +
                    "§7「フリーズ」「キック」「一時BAN」「永久BAN」から選択できます。",
            },
            {
                title: "§l導入と起動",
                body:
                    "§l§b=== 導入と起動 ===\n\n" +
                    "§e■ 導入方法\n" +
                    "§7 1. アドオンの .mcpack をワールドに適用\n" +
                    "§7 2. ワールドに入り /eac:start を実行\n\n" +
                    "§e■ /eac:start について\n" +
                    "§7・最初に実行したプレイヤーが「サーバーオーナー」として登録されます\n" +
                    "§7・AC 本体が有効化され、Admin Tool (ender:admin_tool) が付与されます\n" +
                    "§7・サーバーオーナーは再入室時に自動的に Owner 権限として扱われます\n" +
                    "§c・ワールドを再起動するたびに /eac:start の再実行が必要です\n" +
                    "§7  (AC はデフォルトで停止状態のため)\n\n" +
                    "§e■ 設定画面の開き方\n" +
                    "§7・OP 権限 + Owner 権限を持つプレイヤーが ender:admin_tool を画面タップ\n" +
                    "§7・または /eac:setting を実行",
            },
            {
                title: "§l権限システム",
                body:
                    "§l§b=== 権限システム ===\n\n" +
                    "§7Ender-AC は独自の権限システムを持ちます。\n" +
                    "§7Minecraft 標準の OP とは別管理です。\n\n" +
                    "§6■ ServerOwner (サーバーオーナー)\n" +
                    "§7 ・/eac:start を最初に実行したプレイヤー\n" +
                    "§7 ・剥奪不可\n" +
                    "§7 ・全ての検出をバイパス可能\n" +
                    "§7 ・設定画面の全項目を閲覧 / 編集可能\n" +
                    "§7 ・他プレイヤーに Owner / Admin を付与可能\n\n" +
                    "§e■ Owner (オーナー)\n" +
                    "§7 ・/eac:owner <名前> で付与\n" +
                    "§7 ・デフォルトで全検出をバイパス\n" +
                    "§7 ・設定画面の全項目を閲覧 / 編集可能\n" +
                    "§7 ・ペナルティを受けない\n\n" +
                    "§e■ Admin (管理者)\n" +
                    "§7 ・/eac:op <名前> で付与\n" +
                    "§7 ・Owner が設定したバイパスの適用対象\n" +
                    "§7 ・ペナルティを原則として受ける\n" +
                    "§c ・設定画面は開けません\n" +
                    "§7   (Owner に昇格しない限り設定の閲覧 / 編集は不可)\n\n" +
                    "§7■ Player (一般プレイヤー)\n" +
                    "§7 ・全検出の対象\n\n" +
                    "§c重要:\n" +
                    "§7・Owner / Admin は Ender-AC 独自の権限であり、OP とは別です\n" +
                    "§7・設定画面を開くには OP と Owner (または ServerOwner) の両方が必要です\n" +
                    "§7・デバッグモード中はバイパスが全て無効になります",
            },
            {
                title: "§lコマンド一覧",
                body:
                    "§l§b=== コマンド一覧 ===\n\n" +
                    "§a/eac:start\n" +
                    "§7  実行者をサーバーオーナーとして登録し、AC を有効化します。\n" +
                    "§7  既にサーバーオーナーが存在する場合、本人以外は実行できません。\n\n" +
                    "§a/eac:op <プレイヤー>\n" +
                    "§7  対象に Admin 権限を付与します。\n" +
                    "§7  ServerOwner または Owner のみ実行可能。\n\n" +
                    "§a/eac:owner <プレイヤー>\n" +
                    "§7  対象に Owner 権限を付与します。\n\n" +
                    "§a/eac:deop <プレイヤー>\n" +
                    "§7  Owner / Admin 権限を剥奪します。ServerOwner は剥奪不可。\n\n" +
                    "§a/eac:ban <名前> <期間> [理由]\n" +
                    "§7  BAN します。期間: 10s / 10m / 10h / 10d / perm\n\n" +
                    "§a/eac:unban <名前>\n" +
                    "§7  BAN を解除します。\n\n" +
                    "§a/eac:mute <名前> <期間> [理由]\n" +
                    "§7  ミュートします。\n\n" +
                    "§a/eac:unmute <名前>\n" +
                    "§7  ミュートを解除します。\n\n" +
                    "§a/eac:tp <引数...>\n" +
                    "§7  バニラ /tp と同等。AC のテレポート検出を発動させません。\n\n" +
                    "§a/eac:setting\n" +
                    "§7  設定画面を開きます。ServerOwner または Owner 権限が必要。\n\n" +
                    "§a/eac:instruction [ja|en]\n" +
                    "§7  この取扱説明書を表示します。\n\n" +
                    "§a/eac:lang <ja|en>\n" +
                    "§7  UI の表示言語を切替えます。\n\n" +
                    "§a/eac:debug\n" +
                    "§7  デバッグモードを切替えます。全バイパスが無効化されます。\n\n" +
                    "§a/eac:reload\n" +
                    "§7  Config / BAN / ミュート / 管理ログを再読み込みします。",
            },
            {
                title: "§l設定画面",
                body:
                    "§l§b=== 設定画面 ===\n\n" +
                    "§7メインメニューから「AC 詳細設定」を開くと、\n" +
                    "§7各検出機能の設定が可能です。\n\n" +
                    "§e■ 主要セクション\n" +
                    "§7・§lPermission§r§7  : 検出ごとの Owner / Admin バイパス設定\n" +
                    "§7・§lPunishment§r§7  : 検出ごとの罰則と一時BAN秒数\n" +
                    "§7              (プリセット一括適用あり)\n" +
                    "§7・§lSystem§r§7      : 自動OP解除 / デバッグモード\n" +
                    "§7・§lGameMode§r§7    : ゲームモード変更通知\n" +
                    "§7              (コンソール / 全体 / スタッフ)\n" +
                    "§7・§lMute§r§7        : ミュート機能と閲覧権限\n" +
                    "§7・§lTeleport§r§7    : テレポート検出とセーフゾーン管理\n" +
                    "§7・各検出項目      : 個別の有効化とパラメータ調整\n\n" +
                    "§e■ クイック操作\n" +
                    "§7・全チェックの一括有効化 / 無効化\n" +
                    "§7・TPS 連動自動緩和の切替\n" +
                    "§7・設定の初期化",
            },
            {
                title: "§l検出と罰則",
                body:
                    "§l§b=== 検出と罰則 ===\n\n" +
                    "§l§6[Movement 系]\n" +
                    "§7Fly            飛行\n" +
                    "§7BDSFly         空中ジャンプ (BDSFly)\n" +
                    "§7Nofall         落下ダメージ回避\n" +
                    "§7Step           段差超え\n" +
                    "§7NoClip         ブロック貫通\n" +
                    "§7Phase          ブロック内進入\n" +
                    "§7Speed          移動速度超過\n" +
                    "§7Scaffold       自動足場設置\n" +
                    "§7FastFall       異常落下速度\n" +
                    "§7NoSlow         Web 等での減速無効\n" +
                    "§7AirSwim        空中水泳\n" +
                    "§7Contradiction  矛盾動作 (スプリント+スニーク等)\n" +
                    "§7Teleport       異常テレポート\n\n" +
                    "§l§c[Combat 系]\n" +
                    "§7Reach          攻撃/破壊/設置の距離超過\n" +
                    "§7Killaura       複数エンティティへの同時攻撃\n" +
                    "§7NoSwing        スイングなしの攻撃/破壊/設置\n" +
                    "§7CPS            自動クリック (秒間クリック数超過)\n\n" +
                    "§7AutoTotem      自動トーテム装備\n" +
                    "§l§e[World 系]\n" +
                    "§7Nuker          範囲破壊\n" +
                    "§7InstaBreak     保護ブロックの即時破壊\n" +
                    "§7BlockPlace     不正ブロックの設置\n" +
                    "§7IllegalItem    不正アイテムの所持\n" +
                    "§7IllegalEntity  不正エンティティの生成\n" +
                    "§7SpawnEgg       不正スポーンエッグの使用\n" +
                    "§7CoreProtect    ブロックログ記録\n\n" +
                    "§l§b[Chat 系]\n" +
                    "§7Chat           禁止ワード / 連投 / 文字数超過\n\n" +
                    "§l§d[System 系]\n" +
                    "§7AFK            放置キック\n" +
                    "§7Join           不正参加 (ID/名前/接続元)\n" +
                    "§7GameMode       OP権限を持たないPlayerのゲームモード変更を監視\n" +
                    "§7System         不正OP取得監視\n\n" +
                    "§l§b=== 罰則タイプ ===\n" +
                    "§7・notify         スタッフへの通知のみ (ペナルティなし)\n" +
                    "§7・none           何もしない\n" +
                    "§7・setback        安全地点へ巻き戻し\n" +
                    "§7・freeze         一定時間移動を封じる\n" +
                    "§7・freeze_setback フリーズ + 巻き戻し\n" +
                    "§7・kick           即キック\n" +
                    "§7・tempkick       一時BAN (指定秒数)\n" +
                    "§7・ban            永久BAN\n\n" +
                    "§7各検出の罰則は Punishment メニューで個別変更可能です。\n" +
                    "§7「推奨設定を適用」で誤検知リスクの低い設定に一括変更できます。",
            },
            {
                title: "§l追加機能",
                body:
                    "§l§b=== 追加機能 ===\n\n" +
                    "§e■ BlockLog (ブロック履歴)\n" +
                    "§7・ブロックの設置/破壊を座標・プレイヤー・時刻と共に記録\n" +
                    "§7・「調査モード」でブロックをタップすると履歴を表示\n" +
                    "§7・最大保存件数は設定画面から変更可能 (デフォルト 3000)\n" +
                    "§7・「最近のブロック履歴」から全体を時系列で確認可能\n\n" +
                    "§e■ 入出管理\n" +
                    "§7・プレイヤーの入退室を記録\n" +
                    "§7・BAN 済み / ホワイトリスト外 / 名前不正の接続を拒否\n" +
                    "§7・スポーンまでの猶予 Tick を過ぎた場合も切断\n" +
                    "§7・Join 設定でチェック項目の個別 ON/OFF が可能\n\n" +
                    "§e■ ホワイトリスト\n" +
                    "§7・有効化すると登録済みプレイヤーのみ参加可能\n" +
                    "§7・オンラインプレイヤーからの追加、名前手動入力での追加が可能\n" +
                    "§7・ServerOwner は自動的に許可されます\n\n" +
                    "§e■ ミュート\n" +
                    "§7・チャット送信をブロック\n" +
                    "§7・期間指定 (秒/分/時/日/永久) が可能\n" +
                    "§7・Owner / Admin それぞれの閲覧可否を設定可能\n\n" +
                    "§e■ Teleport セーフゾーン\n" +
                    "§7・テレポート検出をスキップする範囲を AABB で登録できます\n" +
                    "§7  (fill コマンドと同じ 2 点指定形式)\n" +
                    "§7・「現在地を追加」: プレイヤー位置を第一地点として登録\n" +
                    "§7・「座標を手動入力」: 2 点の座標を入力して登録\n" +
                    "§7・ゾーン内およびゾーンを跨ぐ瞬間のテレポートは検出されません",
            },
            {
                title: "§l注意事項",
                body:
                    "§l§b=== 注意事項 ===\n\n" +
                    "§c・AC はデフォルトで停止状態。\n" +
                    "§7  ワールド再起動のたびに /eac:start の再実行が必要です。\n\n" +
                    "§c・BAN は persistentId に紐付けられるが、\n" +
                    "§7  オフライン BAN 時は名前で仮登録されます。\n" +
                    "§7  該当プレイヤーが改名した場合、自動的に BAN を回避できる\n" +
                    "§7  可能性があります。\n\n" +
                    "§c・TPS や Ping が低下している場合\n" +
                    "§7  動的緩和機能により閾値が自動的に緩和されます。\n" +
                    "§7  無効化するには System 設定の「TPS自動緩和」を OFF にしてください。\n\n" +
                    "§c・設定変更の保存\n" +
                    "§7  UI で「保存しました」の表示が出た場合に限り反映済みです。\n\n" +
                    "§c・Nukerタグ解除\n" +
                    "§7  Nukerで検知されたときnukerタグを外さない限り破壊ができません。\n\n" +
                    "§c TP検知 - 許可されるテレポート方法\n\n" +
                    "§a・eac:tpBypass タグ\n" +
                    "§7  /tag @s add eac:tpBypass でタグを付与すると、\n" +
                    "§7  タグ所持中はテレポート検出が無効になります。\n" +
                    "§7  /tag @s remove eac:tpBypass で解除できます。\n" +
                    "§7  §c※ 常時有効化は推奨されません。\n\n" +
                    "§a・/eac:tp コマンド\n" +
                    "§7  バニラの /tp と同等のコマンドです。\n" +
                    "§7  実行時に自動で 20 tick の猶予が付与されます。\n" +
                    "§7  例: /eac:tp @s 100 64 100\n\n" +
                    "§a・Player 管理 UI からの TP\n" +
                    "§7  メインメニュー → Player 一覧 → 対象を選択 →\n" +
                    "§7  「このプレイヤーにTP」「このプレイヤーをTPさせる」\n" +
                    "§7  から実行できます。実行時に 15 tick の猶予が付与されます。\n\n" +
                    "§a・セーフゾーン\n" +
                    "§7  Teleport 設定 → セーフゾーン管理 から、\n" +
                    "§7  テレポートを許可する範囲を AABB で登録できます。\n" +
                    "§7  ゾーン内への移動・ゾーンからの移動・ゾーン間の移動は検知されません。\n" +
                    "§7  スポーン地点・ロビー・ショップ等の登録を推奨します。\n\n" +
                    "§a・エンダーパール使用\n" +
                    "§a・コーラスフルーツ使用\n" +
                    "§a・死亡時のリスポーン\n" +
                    "§c・権限バイパス\n" +
                    "§7  Owner / Admin は Permissions 設定で個別にバイパスを有効化できます。\n" +
                    "§7  Owner はデフォルトで全検出をバイパスします。",
            },
        ];
    }

    private static sectionsEn(): ManualSection[] {
        return [
            {
                title: "§lOverview",
                body:
                    "§l§b=== Overview ===\n\n" +
                    "§7Ender-AC is a server management &\n" +
                    "§7cheat detection addon for Minecraft Bedrock Edition.\n\n" +
                    "§7Made by someone with limited technical skill,\n" +
                    "§7so don't trust it too much.\n\n" +
                    "§7Every detection can be individually enabled / disabled.\n" +
                    "§7Each detection's punishment can be selected from:\n" +
                    "§7Notify / Setback / Freeze / Kick / TempBan / PermaBan.",
            },
            {
                title: "§lInstallation & Startup",
                body:
                    "§l§b=== Installation & Startup ===\n\n" +
                    "§e■ Installation\n" +
                    "§7 1. Apply the .mcpack to your world\n" +
                    "§7 2. Enter the world and run /eac:start\n\n" +
                    "§e■ About /eac:start\n" +
                    "§7- The first player to run it becomes the Server Owner\n" +
                    "§7- The AC becomes enabled and Admin Tool (ender:admin_tool) is granted\n" +
                    "§7- The Server Owner is automatically recognized as Owner on each join\n" +
                    "§c- /eac:start must be re-run every time the world restarts\n" +
                    "§7  (the AC is disabled by default)\n\n" +
                    "§e■ Opening the settings menu\n" +
                    "§7- Tap with ender:admin_tool while holding both OP and Owner\n" +
                    "§7- Or run /eac:setting",
            },
            {
                title: "§lPermission System",
                body:
                    "§l§b=== Permission System ===\n\n" +
                    "§7Ender-AC uses its own permission system,\n" +
                    "§7separate from Minecraft's standard OP.\n\n" +
                    "§6■ ServerOwner\n" +
                    "§7 - The first player to run /eac:start\n" +
                    "§7 - Cannot be revoked\n" +
                    "§7 - Bypasses all detections\n" +
                    "§7 - Can view and edit all settings\n" +
                    "§7 - Can grant Owner/Admin to other players\n\n" +
                    "§e■ Owner\n" +
                    "§7 - Granted via /eac:owner <name>\n" +
                    "§7 - Bypasses all detections by default\n" +
                    "§7 - Can view and edit all settings\n" +
                    "§7 - Does not receive penalties\n\n" +
                    "§e■ Admin\n" +
                    "§7 - Granted via /eac:op <name>\n" +
                    "§7 - Subject to bypasses configured by Owner\n" +
                    "§7 - Receives penalties by default\n" +
                    "§c - Cannot open the settings menu\n" +
                    "§7   (must be promoted to Owner to view/edit settings)\n\n" +
                    "§7■ Player\n" +
                    "§7 - Subject to all detections\n\n" +
                    "§cImportant:\n" +
                    "§7- Owner/Admin are Ender-AC's own permissions, not OP\n" +
                    "§7- The settings menu requires both OP and Owner (or ServerOwner)\n" +
                    "§7- While debug mode is active, all bypasses are disabled",
            },
            {
                title: "§lCommands",
                body:
                    "§l§b=== Commands ===\n\n" +
                    "§a/eac:start\n" +
                    "§7  Registers the executor as ServerOwner and enables the AC.\n" +
                    "§7  If a ServerOwner already exists, only they can run it.\n\n" +
                    "§a/eac:op <player>\n" +
                    "§7  Grants Admin to the target.\n" +
                    "§7  Requires ServerOwner or Owner.\n\n" +
                    "§a/eac:owner <player>\n" +
                    "§7  Grants Owner to the target.\n\n" +
                    "§a/eac:deop <player>\n" +
                    "§7  Revokes Owner/Admin. ServerOwner cannot be revoked.\n\n" +
                    "§a/eac:ban <name> <duration> [reason]\n" +
                    "§7  Bans a player. Duration: 10s / 10m / 10h / 10d / perm\n\n" +
                    "§a/eac:unban <name>\n" +
                    "§7  Removes a ban.\n\n" +
                    "§a/eac:mute <name> <duration> [reason]\n" +
                    "§7  Mutes a player.\n\n" +
                    "§a/eac:unmute <name>\n" +
                    "§7  Removes a mute.\n\n" +
                    "§a/eac:tp <args...>\n" +
                    "§7  Same as vanilla /tp but skips AC teleport detection.\n\n" +
                    "§a/eac:setting\n" +
                    "§7  Opens the settings menu. Requires ServerOwner or Owner.\n\n" +
                    "§a/eac:instruction [ja|en]\n" +
                    "§7  Shows this manual.\n\n" +
                    "§a/eac:lang <ja|en>\n" +
                    "§7  Changes UI language.\n\n" +
                    "§a/eac:debug\n" +
                    "§7  Toggles debug mode. All bypasses are disabled while active.\n\n" +
                    "§a/eac:reload\n" +
                    "§7  Reloads config, ban list, mute list, and admin logs.",
            },
            {
                title: "§lSettings Menu",
                body:
                    "§l§b=== Settings Menu ===\n\n" +
                    "§7Open \"AC Settings\" from the main menu to configure\n" +
                    "§7each feature.\n\n" +
                    "§e■ Main sections\n" +
                    "§7- §lPermission§r§7  : Per-detection Owner/Admin bypass\n" +
                    "§7- §lPunishment§r§7  : Per-detection punishment and temp-ban\n" +
                    "§7              seconds (with presets)\n" +
                    "§7- §lSystem§r§7      : Auto-deop / Debug mode\n" +
                    "§7- §lGameMode§r§7    : GameMode change notifications\n" +
                    "§7              (console / world / staff)\n" +
                    "§7- §lMute§r§7        : Mute feature and visibility\n" +
                    "§7- §lTeleport§r§7    : Teleport detection and safe zones\n" +
                    "§7- Individual      : Enable/disable and tune each detection\n\n" +
                    "§e■ Quick Actions\n" +
                    "§7- Enable / Disable all checks\n" +
                    "§7- Toggle TPS-based auto relaxation\n" +
                    "§7- Reset config to defaults",
            },
            {
                title: "§lDetection & Punishment",
                body:
                    "§l§b=== Detection & Punishment ===\n\n" +
                    "§l§6[Movement]\n" +
                    "§7Fly            Flying\n" +
                    "§7BDSFly         Air jump (BDSFly)\n" +
                    "§7Nofall         Fall damage avoidance\n" +
                    "§7Step           Illegal step-up\n" +
                    "§7NoClip         Block clipping\n" +
                    "§7Phase          Phase through blocks\n" +
                    "§7Speed          Excessive speed\n" +
                    "§7Scaffold       Auto scaffolding\n" +
                    "§7FastFall       Abnormal fall speed\n" +
                    "§7NoSlow         Ignoring slow blocks (web, etc.)\n" +
                    "§7AirSwim        Swimming in air\n" +
                    "§7Contradiction  Contradictory states (e.g. sprint + sneak)\n" +
                    "§7Teleport       Abnormal teleportation\n\n" +
                    "§l§c[Combat]\n" +
                    "§7Reach          Excessive hit/break/place range\n" +
                    "§7Killaura       Multi-entity simultaneous hits\n" +
                    "§7NoSwing        Attack/break/place without swing\n" +
                    "§7CPS            Auto-clicker (excessive clicks per second)\n" +
                    "§7AutoTotem      Auto totem equip\n\n" +
                    "§l§e[World]\n" +
                    "§7Nuker          Area destruction\n" +
                    "§7InstaBreak     Instant break of protected blocks\n" +
                    "§7BlockPlace     Illegal block placement\n" +
                    "§7IllegalItem    Possession of illegal items\n" +
                    "§7IllegalEntity  Spawn of illegal entities\n" +
                    "§7SpawnEgg       Use of illegal spawn eggs\n" +
                    "§7CoreProtect    Block logging\n\n" +
                    "§l§b[Chat]\n" +
                    "§7Chat           Banned words / spam / excessive length\n\n" +
                    "§l§d[System]\n" +
                    "§7AFK            AFK kick\n" +
                    "§7Join           Invalid join (ID / name / connection)\n" +
                    "§7GameMode       Monitors GameMode changes by players without OP permission\n" +
                    "§7System         Illegal OP acquisition monitoring\n\n" +
                    "§l§b=== Punishment Types ===\n" +
                    "§7- notify         Notify staff only (no penalty)\n" +
                    "§7- none           Do nothing\n" +
                    "§7- setback        Rollback to last safe position\n" +
                    "§7- freeze         Freeze movement for a set duration\n" +
                    "§7- freeze_setback Freeze + rollback\n" +
                    "§7- kick           Immediate kick\n" +
                    "§7- tempkick       Temporary ban (specified seconds)\n" +
                    "§7- ban            Permanent ban\n\n" +
                    "§7Each detection's punishment can be changed in the Punishment menu.\n" +
                    "§7\"Apply Recommended\" bulk-applies low-false-positive settings.",
            },
            {
                title: "§lAdditional Features",
                body:
                    "§l§b=== Additional Features ===\n\n" +
                    "§e■ BlockLog\n" +
                    "§7- Records block place/break with coords, player, time\n" +
                    "§7- Toggle \"Inspect Mode\" and tap a block to view history\n" +
                    "§7- Max stored entries configurable (default: 3000)\n" +
                    "§7- \"Recent Block History\" shows all records chronologically\n\n" +
                    "§e■ Join Management\n" +
                    "§7- Logs player joins and leaves\n" +
                    "§7- Rejects banned / non-whitelisted / invalid-name players\n" +
                    "§7- Disconnects players who fail to spawn within the grace period\n" +
                    "§7- Individual checks toggleable in Join settings\n\n" +
                    "§e■ Whitelist\n" +
                    "§7- When enabled, only registered players can join\n" +
                    "§7- Add online players directly or enter names manually\n" +
                    "§7- ServerOwner is always allowed\n\n" +
                    "§e■ Mute\n" +
                    "§7- Blocks chat messages\n" +
                    "§7- Duration can be specified (s/m/h/d/perm)\n" +
                    "§7- Configure Owner / Admin visibility separately\n\n" +
                    "§e■ Teleport Safe Zones\n" +
                    "§7- Register AABB ranges (same 2-corner format as /fill)\n" +
                    "§7- \"Add Current Position\": player position as corner 1\n" +
                    "§7- \"Add by Coordinates\": enter both corners manually\n" +
                    "§7- Teleports inside or between zones are not detected",
            },
            {
                title: "§lWarnings",
                body:
                    "§l§b=== Warnings ===\n\n" +
                    "§c- The AC is disabled by default.\n" +
                    "§7  /eac:start must be re-run every time the world restarts.\n\n" +
                    "§c- BAN uses persistentId, but offline bans are stored by name.\n" +
                    "§7  A player could potentially evade the ban by renaming.\n\n" +
                    "§c- If TPS or ping drops, thresholds are automatically relaxed.\n" +
                    "§7  Disable \"TPS Auto Relax\" in System settings to turn this off.\n\n" +
                    "§c- Settings changes are saved immediately,\n" +
                    "§7  but only take effect when the UI shows a \"saved\" message.\n\n" +
                    "§c- Nuker Tag Removal\n" +
                    "§7  When Nuker is detected, the player cannot break blocks\n" +
                    "§7  until the \"nuker\" tag is removed.\n\n" +
                    "§c TP Detection - Allowed Teleport Methods\n\n" +
                    "§a- eac:tpBypass tag\n" +
                    "§7  Run /tag @s add eac:tpBypass to disable teleport detection\n" +
                    "§7  while the tag is held.\n" +
                    "§7  Remove with /tag @s remove eac:tpBypass.\n" +
                    "§7  §c* Not recommended for permanent use.\n\n" +
                    "§a- /eac:tp command\n" +
                    "§7  Equivalent to vanilla /tp.\n" +
                    "§7  Automatically grants 20 ticks of grace on execution.\n" +
                    "§7  Example: /eac:tp @s 100 64 100\n\n" +
                    "§a- Teleport via Player Management UI\n" +
                    "§7  Main Menu → Player List → Select target →\n" +
                    "§7  \"Teleport to this player\" / \"Teleport this player\".\n" +
                    "§7  Automatically grants 15 ticks of grace on execution.\n\n" +
                    "§a- Safe Zones\n" +
                    "§7  Teleport Settings → Safe Zone Management.\n" +
                    "§7  Register AABB ranges where teleportation is allowed.\n" +
                    "§7  Teleports into a zone, out of a zone, and between zones\n" +
                    "§7  are not detected.\n" +
                    "§7  Recommended for spawn, lobbies, shops, etc.\n\n" +
                    "§a- Ender Pearl use\n" +
                    "§a- Chorus Fruit use\n" +
                    "§a- Death / Respawn\n\n" +
                    "§c- Owner / Admin are Ender-AC's own permissions.\n" +
                    "§7  They are managed independently of Minecraft OP.\n" +
                    "§7  Handle them carefully.",
            },
        ];
    }
}