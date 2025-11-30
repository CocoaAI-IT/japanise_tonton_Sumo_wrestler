
export class Wrestler {
    constructor(scene, world, material, config) {
        this.scene = scene;
        this.world = world;
        this.material = material;

        this.name = config.name;
        this.color = config.color;
        this.initialPosition = config.position; // CANNON.Vec3

        this.mesh = null;
        this.body = null;

        this.isOut = false;
        this.isDown = false;

        this.width = 3.2;
        this.height = 4.8;
        this.depth = 0.2;

        this.init();
    }

    init() {
        // テクスチャ読み込み
        const loader = new THREE.TextureLoader();
        const texturePath = `images/sumo_${this.name}.png`;

        const leftTexture = loader.load(texturePath);
        const rightTexture = loader.load(texturePath);

        // 右側のテクスチャを反転
        rightTexture.wrapS = THREE.RepeatWrapping;
        rightTexture.repeat.x = -1;
        rightTexture.center.set(0.5, 0.5);

        // グループ（体全体）
        this.mesh = new THREE.Group();

        // くの字を2つの平面で作成（上から見て∧形状）
        // 左側の平面
        const leftGeometry = new THREE.BoxGeometry(this.width / 2, this.height, this.depth);
        const leftMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff, // テクスチャの色をそのまま表示するため白にする
            map: leftTexture,
            side: THREE.DoubleSide
        });
        const leftMesh = new THREE.Mesh(leftGeometry, leftMaterial);
        leftMesh.rotation.y = -Math.PI / 6;  // Y軸周りに-30度回転
        leftMesh.position.x = -this.width / 4;
        leftMesh.castShadow = true;
        this.mesh.add(leftMesh);

        // 右側の平面
        const rightGeometry = new THREE.BoxGeometry(this.width / 2, this.height, this.depth);
        const rightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff, // テクスチャの色をそのまま表示するため白にする
            map: rightTexture,
            side: THREE.DoubleSide
        });
        const rightMesh = new THREE.Mesh(rightGeometry, rightMaterial);
        rightMesh.rotation.y = Math.PI / 6;  // Y軸周りに+30度回転
        rightMesh.position.x = this.width / 4;
        rightMesh.castShadow = true;
        this.mesh.add(rightMesh);

        this.mesh.position.copy(this.initialPosition);
        this.scene.add(this.mesh);

        // Cannon.js物理ボディ（くの字形状を箱で近似）
        const wrestlerShape = new CANNON.Box(
            new CANNON.Vec3(this.width / 2, this.height / 2, this.depth * 3)
        );
        this.body = new CANNON.Body({
            mass: 0.25,  // 紙のように軽く
            material: this.material,
            linearDamping: 0.3,
            angularDamping: 0.5
        });
        this.body.addShape(wrestlerShape);
        this.body.position.copy(this.initialPosition);

        this.world.addBody(this.body);
    }

    update() {
        if (this.mesh && this.body) {
            this.mesh.position.copy(this.body.position);
            this.mesh.quaternion.copy(this.body.quaternion);
        }
    }

    reset() {
        if (this.body) {
            this.body.position.copy(this.initialPosition);
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            this.body.quaternion.set(0, 0, 0, 1);
        }
        this.isOut = false;
        this.isDown = false;
    }
}
