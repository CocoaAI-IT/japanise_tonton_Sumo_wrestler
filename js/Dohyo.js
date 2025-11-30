
export class Dohyo {
    constructor(scene, world, groundMaterial) {
        this.scene = scene;
        this.world = world;
        this.groundMaterial = groundMaterial;

        this.width = 10;
        this.depth = 8;
        this.height = 1.5;

        this.mesh = null;
        this.body = null;
        this.baseQuaternion = null;

        this.init();
    }

    init() {
        // Three.js視覚的メッシュをグループにまとめる
        this.mesh = new THREE.Group();

        // 土俵本体（箱型）
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const material = new THREE.MeshStandardMaterial({
            color: 0xd2b48c,
            roughness: 0.8,
            metalness: 0.2
        });
        const dohyoMesh = new THREE.Mesh(geometry, material);
        dohyoMesh.receiveShadow = true;
        this.mesh.add(dohyoMesh);

        // 円形の土俵ライン（俵）- 土俵上面に配置
        const ringRadius = 3;  // 円形土俵の半径
        const ringTube = 0.1;  // 俵の太さ
        const torusGeometry = new THREE.TorusGeometry(ringRadius, ringTube, 16, 100);
        const torusMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.7
        });
        const torusMesh = new THREE.Mesh(torusGeometry, torusMaterial);
        torusMesh.rotation.x = Math.PI / 2;  // 水平に配置
        torusMesh.position.y = this.height / 2 + 0.01;  // 土俵上面のすぐ上
        this.mesh.add(torusMesh);

        // 四隅の丸マーカー（青と赤）
        const markerRadius = 0.3;
        const markerGeometry = new THREE.CircleGeometry(markerRadius, 32);

        // 左奥 - 青
        const blueMarker1 = new THREE.Mesh(
            markerGeometry,
            new THREE.MeshStandardMaterial({ color: 0x0000ff, side: THREE.DoubleSide })
        );
        blueMarker1.rotation.x = -Math.PI / 2;
        blueMarker1.position.set(-this.width / 2 + 0.8, this.height / 2 + 0.02, -this.depth / 2 + 0.8);
        this.mesh.add(blueMarker1);

        // 右奥 - 赤
        const redMarker1 = new THREE.Mesh(
            markerGeometry,
            new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide })
        );
        redMarker1.rotation.x = -Math.PI / 2;
        redMarker1.position.set(this.width / 2 - 0.8, this.height / 2 + 0.02, -this.depth / 2 + 0.8);
        this.mesh.add(redMarker1);

        // 左手前 - 青
        const blueMarker2 = new THREE.Mesh(
            markerGeometry,
            new THREE.MeshStandardMaterial({ color: 0x0000ff, side: THREE.DoubleSide })
        );
        blueMarker2.rotation.x = -Math.PI / 2;
        blueMarker2.position.set(-this.width / 2 + 0.8, this.height / 2 + 0.02, this.depth / 2 - 0.8);
        this.mesh.add(blueMarker2);

        // 右手前 - 赤
        const redMarker2 = new THREE.Mesh(
            markerGeometry,
            new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide })
        );
        redMarker2.rotation.x = -Math.PI / 2;
        redMarker2.position.set(this.width / 2 - 0.8, this.height / 2 + 0.02, this.depth / 2 - 0.8);
        this.mesh.add(redMarker2);

        // 仕切り線（白線）
        const lineWidth = 1.0;  // 線の長さ（横幅）
        const lineThickness = 0.15; // 線の太さ
        const lineSpacing = 0.6; // 中心からの距離

        const lineGeometry = new THREE.PlaneGeometry(lineWidth, lineThickness);
        const lineMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });

        // 奥側の線
        const line1 = new THREE.Mesh(lineGeometry, lineMaterial);
        line1.rotation.x = -Math.PI / 2;
        line1.position.set(0, this.height / 2 + 0.02, -lineSpacing);
        this.mesh.add(line1);

        // 手前側の線
        const line2 = new THREE.Mesh(lineGeometry, lineMaterial);
        line2.rotation.x = -Math.PI / 2;
        line2.position.set(0, this.height / 2 + 0.02, lineSpacing);
        this.mesh.add(line2);

        this.mesh.position.set(0, 0, 0);
        this.scene.add(this.mesh);

        // Cannon.js物理ボディ（水平な平面）
        const dohyoShape = new CANNON.Box(new CANNON.Vec3(this.width / 2, this.height / 2, this.depth / 2));
        this.body = new CANNON.Body({
            mass: 100, // 動的オブジェクト（重い）
            material: this.groundMaterial,
            linearDamping: 0.99, // 動きを抑制
            angularDamping: 0.99 // 回転を抑制
        });
        this.body.addShape(dohyoShape);
        this.body.position.set(0, 0, 0);
        this.body.quaternion.set(0, 0, 0, 1); // 初期回転なし

        // キネマティックボディに変更
        this.body.type = CANNON.Body.KINEMATIC;

        this.world.addBody(this.body);

        this.baseQuaternion = this.body.quaternion.clone();
    }

    update() {
        if (this.mesh && this.body) {
            this.mesh.position.copy(this.body.position);
            this.mesh.quaternion.copy(this.body.quaternion);
        }
    }

    reset() {
        if (this.body) {
            this.body.quaternion.copy(this.baseQuaternion);
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
        }
    }
}
