# Ender-AC

Ender-ACは、Minecraft Bedrock Edition（統合版）向けのチート検知・サーバー管理アドオンです。

## 概要

本アドオンは、プレイヤーの不正行為を検知し、自動的に処罰（通知、巻き戻し、フリーズ、キック、BAN）を実行します。また、ブロック履歴の記録やプレイヤー管理など、サーバー運営に必要な機能をゲーム内UIから提供します。
本アドオンは技術力の低い人が作ったアドオンのため、品質の保証はできません。
ほかのACアドオンの使用を検討してください。
バグ報告はdiscordにてお願いいたします。

## 導入方法

1. [Releases](https://github.com/ユーザー名/Ender-AC_2.0--PreRelease/releases) から `.mcpack` をダウンロード
2. Minecraftにインポートし、ワールドのビヘイビアパックとして適用
3. マイクラのワールド設定-実験的機能からbetaAPIを必ずオンにしてください。
4. ワールド内で `/eac:start` を実行（実行したプレイヤーがサーバーオーナーに登録されます）

## 主要コマンド

| コマンド | 説明 |
| --- | --- |
| `/eac:start` | ACの有効化およびサーバーオーナーの登録 |
| `/eac:setting` | 設定UIの表示 |
| `/eac:op <player>` | Admin権限の付与 |
| `/eac:ban <name> <duration> [reason]` | BANの実行（例: `10m`, `1d`, `perm`） |
| `/eac:unban <name>` | BANの解除 |

その他詳しい説明は `/eac:instruction` または管理者フォームから参照してください。

## 参考

1. TNAntiCheat
2. Scythe AntiCheat

## debugger

1. Choppyw
2. meron2058
3. ZUZUx29