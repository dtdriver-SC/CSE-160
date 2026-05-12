// Matrix4.js
// Small Matrix4 helper for this assignment.

class Matrix4 {
  constructor(src) {
    if (src && src.elements) {
      this.elements = new Float32Array(src.elements);
    } else {
      this.elements = new Float32Array(16);
      this.setIdentity();
    }
  }

  setIdentity() {
    const e = this.elements;
    e[0] = 1; e[4] = 0; e[8]  = 0; e[12] = 0;
    e[1] = 0; e[5] = 1; e[9]  = 0; e[13] = 0;
    e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
    e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
    return this;
  }

  set(src) {
    const s = src.elements || src;
    const d = this.elements;
    for (let i = 0; i < 16; i++) d[i] = s[i];
    return this;
  }

  multiply(other) {
    const a = this.elements;
    const b = other.elements || other;
    const e = new Float32Array(16);

    for (let i = 0; i < 4; i++) {
      const ai0 = a[i];
      const ai1 = a[i + 4];
      const ai2 = a[i + 8];
      const ai3 = a[i + 12];
      e[i]      = ai0 * b[0]  + ai1 * b[1]  + ai2 * b[2]  + ai3 * b[3];
      e[i + 4]  = ai0 * b[4]  + ai1 * b[5]  + ai2 * b[6]  + ai3 * b[7];
      e[i + 8]  = ai0 * b[8]  + ai1 * b[9]  + ai2 * b[10] + ai3 * b[11];
      e[i + 12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15];
    }

    this.elements = e;
    return this;
  }

  concat(other) {
    return this.multiply(other);
  }

  setTranslate(x, y, z) {
    this.setIdentity();
    const e = this.elements;
    e[12] = x;
    e[13] = y;
    e[14] = z;
    return this;
  }

  translate(x, y, z) {
    const e = this.elements;
    e[12] += e[0] * x + e[4] * y + e[8]  * z;
    e[13] += e[1] * x + e[5] * y + e[9]  * z;
    e[14] += e[2] * x + e[6] * y + e[10] * z;
    e[15] += e[3] * x + e[7] * y + e[11] * z;
    return this;
  }

  setScale(x, y, z) {
    this.setIdentity();
    const e = this.elements;
    e[0] = x;
    e[5] = y;
    e[10] = z;
    return this;
  }

  scale(x, y, z) {
    const e = this.elements;
    e[0] *= x; e[1] *= x; e[2] *= x; e[3] *= x;
    e[4] *= y; e[5] *= y; e[6] *= y; e[7] *= y;
    e[8] *= z; e[9] *= z; e[10] *= z; e[11] *= z;
    return this;
  }

  rotate(angle, x, y, z) {
    let len = Math.sqrt(x * x + y * y + z * z);
    if (len === 0) return this;
    x /= len; y /= len; z /= len;

    const rad = Math.PI * angle / 180;
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const nc = 1 - c;

    const r = new Matrix4();
    const e = r.elements;
    e[0] = x * x * nc + c;
    e[1] = x * y * nc + z * s;
    e[2] = x * z * nc - y * s;
    e[3] = 0;

    e[4] = x * y * nc - z * s;
    e[5] = y * y * nc + c;
    e[6] = y * z * nc + x * s;
    e[7] = 0;

    e[8] = x * z * nc + y * s;
    e[9] = y * z * nc - x * s;
    e[10] = z * z * nc + c;
    e[11] = 0;

    e[12] = 0;
    e[13] = 0;
    e[14] = 0;
    e[15] = 1;

    return this.multiply(r);
  }

  setPerspective(fovy, aspect, near, far) {
    const e = this.elements;
    const rd = 1 / (far - near);
    const s = 1 / Math.tan((Math.PI * fovy / 180) / 2);

    e[0] = s / aspect; e[4] = 0; e[8]  = 0;                         e[12] = 0;
    e[1] = 0;          e[5] = s; e[9]  = 0;                         e[13] = 0;
    e[2] = 0;          e[6] = 0; e[10] = -(far + near) * rd;         e[14] = -2 * near * far * rd;
    e[3] = 0;          e[7] = 0; e[11] = -1;                        e[15] = 0;
    return this;
  }

  setLookAt(ex, ey, ez, ax, ay, az, ux, uy, uz) {
    let fx = ax - ex;
    let fy = ay - ey;
    let fz = az - ez;
    let rlf = 1 / Math.sqrt(fx * fx + fy * fy + fz * fz);
    fx *= rlf; fy *= rlf; fz *= rlf;

    let sx = fy * uz - fz * uy;
    let sy = fz * ux - fx * uz;
    let sz = fx * uy - fy * ux;
    let rls = 1 / Math.sqrt(sx * sx + sy * sy + sz * sz);
    sx *= rls; sy *= rls; sz *= rls;

    const ux2 = sy * fz - sz * fy;
    const uy2 = sz * fx - sx * fz;
    const uz2 = sx * fy - sy * fx;

    const e = this.elements;
    e[0] = sx;  e[4] = sy;  e[8]  = sz;  e[12] = 0;
    e[1] = ux2; e[5] = uy2; e[9]  = uz2; e[13] = 0;
    e[2] = -fx; e[6] = -fy; e[10] = -fz; e[14] = 0;
    e[3] = 0;   e[7] = 0;   e[11] = 0;   e[15] = 1;

    return this.translate(-ex, -ey, -ez);
  }
}

class Vector3 {
  constructor(src) {
    this.elements = new Float32Array(3);
    if (src) this.set(src);
  }

  set(src) {
    const s = src.elements || src;
    this.elements[0] = s[0];
    this.elements[1] = s[1];
    this.elements[2] = s[2];
    return this;
  }

  add(other) {
    const a = this.elements;
    const b = other.elements || other;
    a[0] += b[0]; a[1] += b[1]; a[2] += b[2];
    return this;
  }

  sub(other) {
    const a = this.elements;
    const b = other.elements || other;
    a[0] -= b[0]; a[1] -= b[1]; a[2] -= b[2];
    return this;
  }

  mul(s) {
    const a = this.elements;
    a[0] *= s; a[1] *= s; a[2] *= s;
    return this;
  }

  normalize() {
    const a = this.elements;
    const len = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    if (len > 0) {
      a[0] /= len; a[1] /= len; a[2] /= len;
    }
    return this;
  }
}
