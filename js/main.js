import { Dohyo } from './Dohyo.js';
import { Wrestler } from './Wrestler.js';

// メインゲームクラス
class TontonSumo {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.dohyo = null; // 土俵
        this.wrestlers = []; // 力士
        this.gameState = 'start'; // start, playing, ended
        this.dohyoTilt = { x: 0, z: 0 }; // 土俵の傾き
        this.targetTilt = { x: 0, z: 0 }; // 目標の傾き

        this.init();
        this.setupEventListeners();
    }

    init() {
        // Three.jsシーンの初期化
        this.setupThreeJS();

        // Cannon.js物理世界の初期化
        this.setupPhysics();

        // 土俵の作成
        this.dohyo = new Dohyo(this.scene, this.world, this.groundMaterial);

        // 力士の作成
        this.createWrestlers();

        // ライティング
        this.setupLighting();

        // アニメーションループ開始
        this.animate();
    }

    setupThreeJS() {
        // シーン
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, 10, 50);

        // カメラ（斜め上から見下ろす視点）
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(10, 10, 10);  // 斜め上から見下ろす
        this.camera.lookAt(0, 0, 0);

        // レンダラー
        const canvas = document.getElementById('gameCanvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // リサイズ対応
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupPhysics() {
        // Cannon.js物理世界
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;

        // 地面のマテリアル
        const groundMaterial = new CANNON.Material('groundMaterial');
        const wrestlerMaterial = new CANNON.Material('wrestlerMaterial');

        // 接触マテリアル（摩擦と反発）
        const wrestlerGroundContact = new CANNON.ContactMaterial(
            groundMaterial,
            wrestlerMaterial,
            {
                friction: 0.4,  // 摩擦を上げて滑りすぎないように
                restitution: 0.2  // 反発を減らす
            }
        );
        this.world.addContactMaterial(wrestlerGroundContact);

        // 力士同士の接触
        const wrestlerWrestlerContact = new CANNON.ContactMaterial(
            wrestlerMaterial,
            wrestlerMaterial,
            {
                friction: 0.3,
                restitution: 0.3
            }
        );
        this.world.addContactMaterial(wrestlerWrestlerContact);

        this.groundMaterial = groundMaterial;
        this.wrestlerMaterial = wrestlerMaterial;
    }

    createWrestlers() {
        // 力士を2体作成（土俵の上、Z軸方向に配置）
        const dohyoTopY = 0.75 + 2.4;  // 土俵上面 + 力士の高さ半分(4.8/2 = 2.4)
        const wrestlerData = [
            {
                color: 0xff0000,
                position: new CANNON.Vec3(0, dohyoTopY, -2),  // 奥側
                name: 'red',
                rotation: Math.PI  // 180度回転して青い力士の方を向く
            },
            {
                color: 0x0000ff,
                position: new CANNON.Vec3(0, dohyoTopY, 2),   // 手前側
                name: 'blue',
                rotation: 0  // 回転なし
            }
        ];

        wrestlerData.forEach(data => {
            const wrestler = new Wrestler(this.scene, this.world, this.wrestlerMaterial, data);
            this.wrestlers.push(wrestler);
        });
    }

    setupLighting() {
        // 環境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // ディレクショナルライト（斜め上から）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // 上からのライト（土俵を照らす）
        const topLight = new THREE.PointLight(0xffffff, 0.4);
        topLight.position.set(0, 5, 0);
        this.scene.add(topLight);
    }

    setupEventListeners() {
        // スタートボタン
        document.getElementById('start-button').addEventListener('click', () => {
            this.startGame();
        });

        // リセットボタン
        document.getElementById('reset-button').addEventListener('click', () => {
            this.resetGame();
        });

        // 再スタートボタン
        document.getElementById('restart-button').addEventListener('click', () => {
            this.resetGame();
            this.hideScreen('result-screen');
            this.showScreen('game-screen');
            this.gameState = 'playing';
        });

        // 四隅のタップエリア
        const tapAreas = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        tapAreas.forEach(areaId => {
            const area = document.getElementById(`tap-${areaId}`);
            if (area) {
                // タッチイベント
                area.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.handleTap(areaId);
                });
                // クリックイベント（PC用）
                area.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    this.handleTap(areaId);
                });
            }
        });
    }

    startGame() {
        this.hideScreen('start-screen');
        this.showScreen('game-screen');
        this.gameState = 'playing';
        this.updateStatus();
    }

    // タップエリアがタップされた時の処理
    handleTap(position) {
        if (this.gameState !== 'playing') return;

        // タップ位置に応じて土俵の傾き方向を決定
        const tiltAmount = 0.1; // 傾きの大きさ（ラジアン）

        switch (position) {
            case 'top-left':
                // 左上をタップ → 土俵を手前・左に傾ける
                this.targetTilt.x = -tiltAmount;  // Z軸周り：左に傾く
                this.targetTilt.z = tiltAmount;   // X軸周り：手前に傾く
                break;
            case 'top-right':
                // 右上をタップ → 土俵を手前・右に傾ける
                this.targetTilt.x = tiltAmount;   // Z軸周り：右に傾く
                this.targetTilt.z = tiltAmount;   // X軸周り：手前に傾く
                break;
            case 'bottom-left':
                // 左下をタップ → 土俵を奥・左に傾ける
                this.targetTilt.x = -tiltAmount;  // Z軸周り：左に傾く
                this.targetTilt.z = -tiltAmount;  // X軸周り：奥に傾く
                break;
            case 'bottom-right':
                // 右下をタップ → 土俵を奥・右に傾ける
                this.targetTilt.x = tiltAmount;   // Z軸周り：右に傾く
                this.targetTilt.z = -tiltAmount;  // X軸周り：奥に傾く
                break;
        }

        // タップエリアに視覚的フィードバック
        const tapArea = document.getElementById(`tap-${position}`);
        if (tapArea) {
            tapArea.classList.add('active');
            setTimeout(() => {
                tapArea.classList.remove('active');
            }, 100);
        }
    }

    // 土俵の傾きを更新
    updateDohyoTilt() {
        if (this.gameState !== 'playing') return;

        // 目標の傾きに向かってスムーズに移動
        const lerpSpeed = 0.2;
        this.dohyoTilt.x += (this.targetTilt.x - this.dohyoTilt.x) * lerpSpeed;
        this.dohyoTilt.z += (this.targetTilt.z - this.dohyoTilt.z) * lerpSpeed;

        // 自然に水平に戻る（復元力）
        const restoreSpeed = 0.05;
        this.targetTilt.x *= (1 - restoreSpeed);
        this.targetTilt.z *= (1 - restoreSpeed);

        // 土俵の回転を更新
        // Z軸周りの回転（左右の傾き）
        const tiltQuatZ = new CANNON.Quaternion();
        tiltQuatZ.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), this.dohyoTilt.x);

        // X軸周りの回転（手前奥の傾き）
        const tiltQuatX = new CANNON.Quaternion();
        tiltQuatX.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), this.dohyoTilt.z);

        // クォータニオンを合成
        this.dohyo.body.quaternion = tiltQuatZ.mult(tiltQuatX);
    }

    checkWinConditions() {
        if (this.gameState !== 'playing') return;

        let activeWrestlers = 0;
        let winner = null;

        this.wrestlers.forEach(wrestler => {
            // 土俵から出たかチェック（X軸とZ軸の範囲）
            const halfWidth = this.dohyo.width / 2;
            const halfDepth = this.dohyo.depth / 2;

            if (
                (Math.abs(wrestler.body.position.x) > halfWidth ||
                    Math.abs(wrestler.body.position.z) > halfDepth) &&
                !wrestler.isOut
            ) {
                wrestler.isOut = true;
            }

            // 土俵より下に落ちたかチェック
            if (wrestler.body.position.y < -0.5 && !wrestler.isOut) {
                wrestler.isOut = true;
            }

            // 倒れたかチェック（初期回転からの変化で判定）
            const rotation = wrestler.body.quaternion;
            const euler = new CANNON.Vec3();
            rotation.toEuler(euler);

            // X軸やZ軸の回転が90度に達したら倒れたと判定
            // 板の側面の辺が土俵と並行になる = 完全に横倒し
            if ((Math.abs(euler.x) >= Math.PI / 2 || Math.abs(euler.z) >= Math.PI / 2) && !wrestler.isDown) {
                wrestler.isDown = true;
            }

            // まだ有効な力士をカウント
            if (!wrestler.isOut && !wrestler.isDown) {
                activeWrestlers++;
                winner = wrestler;
            }
        });

        // ステータス更新
        this.updateStatus();

        // 勝敗判定
        if (activeWrestlers === 1) {
            this.endGame(winner);
        } else if (activeWrestlers === 0) {
            this.endGame(null); // 引き分け
        }
    }

    updateStatus() {
        const redWrestler = this.wrestlers.find(w => w.name === 'red');
        const blueWrestler = this.wrestlers.find(w => w.name === 'blue');

        const redStatus = document.getElementById('red-status');
        const blueStatus = document.getElementById('blue-status');

        if (redWrestler) {
            redStatus.className = 'status';
            if (redWrestler.isOut) {
                redStatus.textContent = '場外';
                redStatus.classList.add('out');
            } else if (redWrestler.isDown) {
                redStatus.textContent = '倒れた';
                redStatus.classList.add('down');
            } else {
                redStatus.textContent = '準備完了';
                redStatus.classList.add('ready');
            }
        }

        if (blueWrestler) {
            blueStatus.className = 'status';
            if (blueWrestler.isOut) {
                blueStatus.textContent = '場外';
                blueStatus.classList.add('out');
            } else if (blueWrestler.isDown) {
                blueStatus.textContent = '倒れた';
                blueStatus.classList.add('down');
            } else {
                blueStatus.textContent = '準備完了';
                blueStatus.classList.add('ready');
            }
        }
    }

    endGame(winner) {
        this.gameState = 'ended';

        const winnerText = document.getElementById('winner-text');
        if (winner) {
            const winnerName = winner.name === 'red' ? '赤の力士' : '青の力士';
            winnerText.textContent = `${winnerName}の勝ち！`;
        } else {
            winnerText.textContent = '引き分け！';
        }

        setTimeout(() => {
            this.hideScreen('game-screen');
            this.showScreen('result-screen');
        }, 1000);
    }

    resetGame() {
        // 土俵の傾きをリセット
        this.dohyoTilt = { x: 0, z: 0 };
        this.targetTilt = { x: 0, z: 0 };
        this.dohyo.reset();

        // 力士の位置と状態をリセット
        // 力士の初期位置はWrestlerオブジェクト内に保存されているため、
        // ここで再計算する必要はないが、Wrestlerクラスのresetメソッドが
        // 正しく初期位置に戻すことを確認する。
        // ただし、Wrestlerクラスの初期位置はコンストラクタで渡された値(config.position)
        // を保存している。
        // 先ほどの変更でcreateWrestlers内のposition計算は更新したが、
        // 既に生成されたWrestlerインスタンスのinitialPositionは更新されない。
        // そのため、ページリロードが必要。
        // コード上はWrestler.jsの変更とmain.jsのcreateWrestlersの変更で十分。

        this.wrestlers.forEach(wrestler => {
            wrestler.reset();
        });

        this.gameState = 'playing';
        this.updateStatus();
    }

    showScreen(screenId) {
        document.getElementById(screenId).classList.add('active');
    }

    hideScreen(screenId) {
        document.getElementById(screenId).classList.remove('active');
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // 土俵の傾きを更新
        this.updateDohyoTilt();

        // 物理演算の更新
        this.world.step(1 / 60);

        // 勝敗判定
        this.checkWinConditions();

        // Three.jsオブジェクトを物理ボディと同期
        // 土俵
        this.dohyo.update();

        // 力士
        this.wrestlers.forEach(wrestler => {
            wrestler.update();
        });

        // レンダリング
        this.renderer.render(this.scene, this.camera);
    }
}

// ゲーム開始
window.addEventListener('DOMContentLoaded', () => {
    new TontonSumo();
});
