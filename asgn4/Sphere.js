// Sphere.js
// Procedural sphere with normals. This makes the lighting easy to see.

class Sphere {
  constructor() {
    this.color = [1.0, 0.25, 0.10, 1.0];
    this.textureNum = -2;
    this.texColorWeight = 0.0;
    this.matrix = new Matrix4();
  }

  static init(gl, a_Position, a_UV, a_Normal) {
    if (Sphere.vertexBuffer) return;

    const latBands = 18;
    const lonBands = 36;
    const radius = 0.5;
    const data = [];

    function vertex(theta, phi) {
      const sinTheta = Math.sin(theta);
      const x = Math.cos(phi) * sinTheta;
      const y = Math.cos(theta);
      const z = Math.sin(phi) * sinTheta;
      const u = phi / (Math.PI * 2);
      const v = theta / Math.PI;
      return [x * radius, y * radius, z * radius, u, v, x, y, z];
    }

    function pushVertex(v) {
      for (let i = 0; i < v.length; i++) data.push(v[i]);
    }

    for (let lat = 0; lat < latBands; lat++) {
      const theta1 = lat * Math.PI / latBands;
      const theta2 = (lat + 1) * Math.PI / latBands;

      for (let lon = 0; lon < lonBands; lon++) {
        const phi1 = lon * 2 * Math.PI / lonBands;
        const phi2 = (lon + 1) * 2 * Math.PI / lonBands;

        const v1 = vertex(theta1, phi1);
        const v2 = vertex(theta2, phi1);
        const v3 = vertex(theta2, phi2);
        const v4 = vertex(theta1, phi2);

        pushVertex(v1); pushVertex(v2); pushVertex(v3);
        pushVertex(v1); pushVertex(v3); pushVertex(v4);
      }
    }

    const v = new Float32Array(data);
    Sphere.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);

    Sphere.FSIZE = v.BYTES_PER_ELEMENT;
    Sphere.stride = Sphere.FSIZE * 8;
    Sphere.vertexCount = data.length / 8;
    Sphere.attribs = { a_Position, a_UV, a_Normal };
  }

  static bind(gl) {
    gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.vertexBuffer);
    gl.vertexAttribPointer(Sphere.attribs.a_Position, 3, gl.FLOAT, false, Sphere.stride, 0);
    gl.enableVertexAttribArray(Sphere.attribs.a_Position);

    gl.vertexAttribPointer(Sphere.attribs.a_UV, 2, gl.FLOAT, false, Sphere.stride, Sphere.FSIZE * 3);
    gl.enableVertexAttribArray(Sphere.attribs.a_UV);

    gl.vertexAttribPointer(Sphere.attribs.a_Normal, 3, gl.FLOAT, false, Sphere.stride, Sphere.FSIZE * 5);
    gl.enableVertexAttribArray(Sphere.attribs.a_Normal);
  }

  render(gl, uniforms) {
    Sphere.bind(gl);

    const normalMatrix = new Matrix4();
    normalMatrix.setInverseOf(this.matrix);
    normalMatrix.transpose();

    gl.uniformMatrix4fv(uniforms.u_ModelMatrix, false, this.matrix.elements);
    gl.uniformMatrix4fv(uniforms.u_NormalMatrix, false, normalMatrix.elements);
    gl.uniform4f(uniforms.u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1i(uniforms.u_whichTexture, this.textureNum);
    gl.uniform1f(uniforms.u_texColorWeight, this.textureNum >= 0 ? this.texColorWeight : 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, Sphere.vertexCount);
  }
}
