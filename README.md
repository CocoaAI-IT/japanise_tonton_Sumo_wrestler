# 3D とんとん相撲 (3D Tonton Sumo)

モバイル端末の加速度センサーを使った、3Dとんとん相撲ゲームです。端末を揺らして紙の力士を動かし、相手を倒すか土俵から出すことで勝利します。

![Tonton Sumo](https://raw.githubusercontent.com/CocoaAI-IT/japanise_tonton_Sumo_wrestler/main/assets/screenshot.png)

## 🎮 遊び方

1. **スタート**: 「スタート」ボタンをタップして、加速度センサーの許可を与えます
2. **揺らす**: スマートフォンやタブレットを軽く揺らして、土俵を振動させます
3. **勝敗**: 相手の力士を倒すか、土俵の外に出すと勝利です

### ルール

- **土俵から出る**: 力士が円形の土俵の外に出たら負け
- **倒れる**: 力士が大きく傾いて倒れたら負け
- **引き分け**: 両方の力士が同時に負け条件を満たした場合

## 🚀 技術仕様

### 使用技術

- **Three.js**: 3Dグラフィックスレンダリング
- **Cannon.js**: 物理演算エンジン
- **DeviceMotion API**: モバイル端末の加速度センサー
- **HTML5/CSS3/ES6**: フロントエンド技術

### 主な機能

- リアルタイム物理演算による力士の動き
- 加速度センサーによる直感的な操作
- 3D環境での没入感のあるゲームプレイ
- レスポンシブデザイン（モバイル最適化）

## 📦 インストールとデプロイ

### ローカル環境で実行

```bash
# リポジトリをクローン
git clone https://github.com/CocoaAI-IT/japanise_tonton_Sumo_wrestler.git
cd japanise_tonton_Sumo_wrestler

# ローカルサーバーを起動（例: Python）
python3 -m http.server 8000

# ブラウザでアクセス
# http://localhost:8000
```

### GitHub Pagesでデプロイ

1. GitHubリポジトリの「Settings」→「Pages」に移動
2. Source: `Deploy from a branch`を選択
3. Branch: `main`（または使用しているブランチ）を選択
4. フォルダ: `/ (root)`を選択
5. 「Save」をクリック

数分後、以下のURLでアクセス可能になります：
```
https://cocoaai-it.github.io/japanise_tonton_Sumo_wrestler/
```

## 📱 動作環境

- **推奨ブラウザ**:
  - iOS Safari 13.0+
  - Chrome for Android 80+
  - その他のモダンブラウザ

- **必須機能**:
  - 加速度センサー搭載のモバイル端末
  - HTTPS接続（GitHub Pagesは自動的にHTTPS）
  - WebGL対応ブラウザ

## 🎨 プロジェクト構造

```
japanise_tonton_Sumo_wrestler/
├── index.html          # メインHTMLファイル
├── css/
│   └── style.css      # スタイルシート
├── js/
│   └── main.js        # ゲームロジック（Three.js + Cannon.js）
├── assets/            # 画像やその他のアセット
└── README.md          # このファイル
```

## 🔧 カスタマイズ

### 力士の色を変更

`js/main.js`の`createWrestlers()`メソッド内で色を変更できます：

```javascript
const wrestlerData = [
    {
        color: 0xff0000,  // 赤 → 好きな色に変更
        position: new CANNON.Vec3(-2, 2, 0),
        name: 'red'
    },
    // ...
];
```

### 物理パラメータの調整

`js/main.js`の`setupPhysics()`メソッドで摩擦や反発を調整：

```javascript
const wrestlerGroundContact = new CANNON.ContactMaterial(
    groundMaterial,
    wrestlerMaterial,
    {
        friction: 0.4,    // 摩擦係数
        restitution: 0.3  // 反発係数
    }
);
```

### 加速度センサーの感度調整

`js/main.js`の`applyAccelerationToField()`メソッドで強度を変更：

```javascript
const intensity = 0.5; // 値を増やすと感度が上がります
```

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🙏 謝辞

- Three.js コミュニティ
- Cannon.js 開発者
- 日本の伝統的な「とんとん相撲」遊び

## 🐛 バグ報告・機能リクエスト

Issues タブからお気軽にご報告ください。

---

Made with ❤️ by CocoaAI-IT
