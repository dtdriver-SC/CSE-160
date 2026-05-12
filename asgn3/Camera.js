// Camera.js
// Basic first-person camera with jump.

class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.fov = 60;

    this.eye = new Vector3([16.0, 1.75, 28.0]);
    this.at = new Vector3([16.0, 1.75, 27.0]);
    this.up = new Vector3([0.0, 1.0, 0.0]);

    this.yaw = 0.0;
    this.pitch = 0.0;
    this.moveSpeed = 0.09;
    this.turnSpeed = 4.0;
    this.playerHeight = 1.75;

    this.yVelocity = 0.0;
    this.gravity = 16.0;
    this.jumpSpeed = 8.5;
    this.isOnGround = true;

    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this.resize(canvas.width / canvas.height);
    this.updateAt();
  }

  resize(aspect) {
    this.projectionMatrix.setPerspective(this.fov, aspect, 0.1, 1000.0);
  }

  getForwardVector(includePitch = true) {
    const yawRad = this.yaw * Math.PI / 180;
    const pitchRad = this.pitch * Math.PI / 180;
    const cp = includePitch ? Math.cos(pitchRad) : 1.0;
    const sp = includePitch ? Math.sin(pitchRad) : 0.0;

    return [
      Math.sin(yawRad) * cp,
      sp,
      -Math.cos(yawRad) * cp
    ];
  }

  updateAt() {
    const f = this.getForwardVector(true);
    const e = this.eye.elements;
    const a = this.at.elements;
    const u = this.up.elements;

    a[0] = e[0] + f[0];
    a[1] = e[1] + f[1];
    a[2] = e[2] + f[2];

    this.viewMatrix.setLookAt(
      e[0], e[1], e[2],
      a[0], a[1], a[2],
      u[0], u[1], u[2]
    );
  }

  updateVertical(dt, groundHeight) {
    const e = this.eye.elements;
    const floorY = this.playerHeight + groundHeight;

    this.yVelocity -= this.gravity * dt;
    e[1] += this.yVelocity * dt;

    if (e[1] <= floorY) {
      e[1] = floorY;
      this.yVelocity = 0.0;
      this.isOnGround = true;
    } else {
      this.isOnGround = false;
    }

    this.updateAt();
  }

  jump() {
    if (!this.isOnGround) return;
    this.yVelocity = this.jumpSpeed;
    this.isOnGround = false;
  }

  tryMove(dx, dz, collisionFn) {
    const e = this.eye.elements;
    const nx = e[0] + dx;
    const nz = e[2] + dz;

    if (!collisionFn || !collisionFn(nx, nz, this)) {
      e[0] = nx;
      e[2] = nz;
    }
    this.updateAt();
  }

  moveForward(collisionFn) {
    const f = this.getForwardVector(false);
    this.tryMove(f[0] * this.moveSpeed, f[2] * this.moveSpeed, collisionFn);
  }

  moveBackwards(collisionFn) {
    const f = this.getForwardVector(false);
    this.tryMove(-f[0] * this.moveSpeed, -f[2] * this.moveSpeed, collisionFn);
  }

  moveBackward(collisionFn) {
    this.moveBackwards(collisionFn);
  }

  moveLeft(collisionFn) {
    const f = this.getForwardVector(false);
    this.tryMove(f[2] * this.moveSpeed, -f[0] * this.moveSpeed, collisionFn);
  }

  moveRight(collisionFn) {
    const f = this.getForwardVector(false);
    this.tryMove(-f[2] * this.moveSpeed, f[0] * this.moveSpeed, collisionFn);
  }

  panLeft() {
    this.yaw -= this.turnSpeed;
    this.updateAt();
  }

  panRight() {
    this.yaw += this.turnSpeed;
    this.updateAt();
  }

  addYawPitch(yawDelta, pitchDelta) {
    this.yaw += yawDelta;
    this.pitch += pitchDelta;
    this.pitch = Math.max(-82, Math.min(82, this.pitch));
    this.updateAt();
  }
}
