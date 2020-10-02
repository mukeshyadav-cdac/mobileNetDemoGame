let game;

// global game options
let gameOptions = {
  platformStartSpeed: 350,
  spawnRange: [1000, 1500],
  platformSizeRange: [50, 250],
  playerGravity: 900,
  jumpForce: 400,
  playerStartPosition: 200,
  jumps: 5
}

window.onload = function () {
  // object containing configuration options
  let gameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: playGame,
    backgroundColor: 0x444444,

    // physics settings
    physics: {
      default: "arcade"
    }
  }
  game = new Phaser.Game(gameConfig);
  window.focus();
}

// playGame scene
class playGame extends Phaser.Scene {
  constructor() {
    super("PlayGame");
  }

  preload() {
    this.load.image("platform", "platform.png");
    this.load.image("player", "player.png");
    this.load.image("enemy", "enemy.png");
  }

  create() {

    this.text = this.add.text(20, 30, "Game Frame Rate: ", {
      font: "20px Arial",
      fill: "#ff0044",
      align: "center"
    });

    // group with all active platforms.
    this.enemyGroup = this.add.group({
      removeCallback: function (enemy) {
        enemy.scene.enemyPool.add(enemy);
      }
    })

    this.time.addEvent({ delay: 1000, callback: this.updateFrame, callbackScope: this, loop: true });

    this.enemyPool = this.add.group({
      removeCallback: function (enemy) {
        enemy.scene.enemyGroup.add(enemy);
      }
    })

    // number of consecutive jumps made by the player
    this.playerJumps = 0;
    this.coolPeiod = 0;
    this.phaserTimeStampPrivious = Date.now();
    this.deltaTime = Date.now();


    // adding a platform to the game, the arguments are platform width and x position
    this.platform = this.physics.add.sprite(game.config.width / 2, game.config.height, "platform");
    this.platform.setImmovable(true);
    this.platform.displayWidth = game.config.width;

    // adding the player;
    this.player = this.physics.add.sprite(gameOptions.playerStartPosition, game.config.height / 2, "player");
    this.player.setGravityY(gameOptions.playerGravity);

    this.addEnemy(game.config.width + 50)
    // setting collisions between the player and the platform group
    this.physics.add.collider(this.player, this.platform);
    this.physics.add.collider(this.player, this.enemyGroup, () => this.scene.start("PlayGame"));

    // checking for input
    this.input.on("pointerdown", this.jump, this);
  }

  // the core of the script: platform are added from the pool or created on the fly
  addEnemy(posX) {
    let enemy;
    let flip = Phaser.Math.Between(0, 1)
    if (this.enemyPool.getLength()) {
      enemy = this.enemyPool.getFirst();
      enemy.x = posX;
      enemy.active = true;
      enemy.visible = true;
      this.enemyPool.remove(enemy);
    }
    else {
      enemy = this.physics.add.sprite(posX, flip === 0 ? game.config.height : 0, "enemy");
      enemy.displayHeight = 400 + Phaser.Math.Between(50, 200);
      enemy.setVelocityX(gameOptions.platformStartSpeed * -1);
      // enemy.setGravityY(gameOptions.playerGravity);
      this.enemyGroup.add(enemy);
    }

    let dTime = new Date();
    this.obstacleRate = dTime.getTime() + Phaser.Math.Between(gameOptions.spawnRange[0], gameOptions.spawnRange[1]);
  }

  // the player jumps when on the ground, or once in the air as long as there are jumps left and the first jump was on the ground
  jump() {
    if (this.coolPeiod > 1) {
      this.player.setVelocityY(gameOptions.jumpForce * -1);
      this.playerJumps++;
      this.coolPeiod = 0;
    } else {
      this.coolPeiod++;
    }
  }

  update() {
    //    recycling platforms
    this.phaserTimeStamp =
      this.enemyGroup.getChildren().forEach(function (enemy) {
        if (enemy.x < 0) {
          this.enemyGroup.killAndHide(enemy);
          this.enemyGroup.remove(enemy);
        }
      }, this);

    // adding new platforms
    let dTime = new Date();
    if (this.obstacleRate < dTime.getTime()) {
      this.addEnemy(game.config.width + 50);
    }
    this.deltaTime = Date.now() - this.phaserTimeStampPrivious;
    this.phaserTimeStampPrivious = Date.now();
  }

  updateFrame() {
    this.text.setText("Game Frame Rate: " + parseInt(1000 / this.deltaTime));
  }

};

const webcamElement = document.getElementById('webcam');

let net;

async function app() {

  console.log('Loading mobilenet..');
  // Load the model.
  net = await mobilenet.load();
  console.log('Successfully loaded model');
  const webcam = await tf.data.webcam(webcamElement);
  const addExample = async classId => {
    // Capture an image from the web camera.
    const img = await webcam.capture();

    // Get the intermediate activation of MobileNet 'conv_preds' and pass that
    // to the KNN classifier.
    const activation = net.infer(img, 'conv_preds');

    // Pass the intermediate activation to the classifier.
    classifier.addExample(activation, classId);
    console.log(classifier.getNumClasses())
    // Dispose the tensor to release the memory.
    img.dispose();
  };

  document.getElementById('class-a').addEventListener('click', () => addExample(0));
  document.getElementById('class-b').addEventListener('click', () => addExample(1));

  while (true) {
    if (classifier.getNumClasses() > 0) {
      const img = await webcam.capture();

      const activation = net.infer(img, 'conv_preds');
      // Get the most likely class and confidence from the classifier module.
      const result = await classifier.predictClass(activation);

      const classes = ['A', 'B'];

      if (result) {
        console.log(classes[result.classIndex])
        console.log(result.confidences[result.classIndex] * 100)
        if (classes[result.classIndex] == 'A') {
          game.scene.scenes[0].jump()
        }
      }
      img.dispose();
    }
    // Give some breathing room by waiting for the next animation frame to
    // fire.
    await tf.nextFrame();
  }
}

const classifier = knnClassifier.create();
app();

