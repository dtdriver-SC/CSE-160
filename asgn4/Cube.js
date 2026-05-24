// Cube.js
// Shared cube renderer with UVs and normals for Phong lighting.

class Cube {
  constructor() {
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.textureNum = -2;       // -2 means solid color.
    this.texColorWeight = 1.0;  // 1 = texture, 0 = solid color.
    this.matrix = new Matrix4();
  }

  static init(gl, a_Position, a_UV, a_Normal) {
    if (Cube.vertexBuffer) return;

    // x, y, z, u, v, nx, ny, nz
    const v = new Float32Array([
      // Front (+Z)
      -0.5,-0.5, 0.5,  0,0,  0,0,1,   0.5,-0.5, 0.5,  1,0,  0,0,1,   0.5, 0.5, 0.5,  1,1,  0,0,1,
      -0.5,-0.5, 0.5,  0,0,  0,0,1,   0.5, 0.5, 0.5,  1,1,  0,0,1,  -0.5, 0.5, 0.5,  0,1,  0,0,1,
      // Back (-Z)
       0.5,-0.5,-0.5,  0,0,  0,0,-1, -0.5,-0.5,-0.5,  1,0,  0,0,-1, -0.5, 0.5,-0.5,  1,1,  0,0,-1,
       0.5,-0.5,-0.5,  0,0,  0,0,-1, -0.5, 0.5,-0.5,  1,1,  0,0,-1,  0.5, 0.5,-0.5,  0,1,  0,0,-1,
      // Right (+X)
       0.5,-0.5, 0.5,  0,0,  1,0,0,   0.5,-0.5,-0.5,  1,0,  1,0,0,   0.5, 0.5,-0.5,  1,1,  1,0,0,
       0.5,-0.5, 0.5,  0,0,  1,0,0,   0.5, 0.5,-0.5,  1,1,  1,0,0,   0.5, 0.5, 0.5,  0,1,  1,0,0,
      // Left (-X)
      -0.5,-0.5,-0.5,  0,0, -1,0,0,  -0.5,-0.5, 0.5,  1,0, -1,0,0,  -0.5, 0.5, 0.5,  1,1, -1,0,0,
      -0.5,-0.5,-0.5,  0,0, -1,0,0,  -0.5, 0.5, 0.5,  1,1, -1,0,0,  -0.5, 0.5,-0.5,  0,1, -1,0,0,
      // Top (+Y)
      -0.5, 0.5, 0.5,  0,0,  0,1,0,   0.5, 0.5, 0.5,  1,0,  0,1,0,   0.5, 0.5,-0.5,  1,1,  0,1,0,
      -0.5, 0.5, 0.5,  0,0,  0,1,0,   0.5, 0.5,-0.5,  1,1,  0,1,0,  -0.5, 0.5,-0.5,  0,1,  0,1,0,
      // Bottom (-Y)
      -0.5,-0.5,-0.5,  0,0,  0,-1,0,  0.5,-0.5,-0.5,  1,0,  0,-1,0,  0.5,-0.5, 0.5,  1,1,  0,-1,0,
      -0.5,-0.5,-0.5,  0,0,  0,-1,0,  0.5,-0.5, 0.5,  1,1,  0,-1,0, -0.5,-0.5, 0.5,  0,1,  0,-1,0,
    ]);

    Cube.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);

    Cube.FSIZE = v.BYTES_PER_ELEMENT;
    Cube.stride = Cube.FSIZE * 8;
    Cube.vertexCount = 36;
    Cube.attribs = { a_Position, a_UV, a_Normal };
  }

  static bind(gl) {
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vertexBuffer);
    gl.vertexAttribPointer(Cube.attribs.a_Position, 3, gl.FLOAT, false, Cube.stride, 0);
    gl.enableVertexAttribArray(Cube.attribs.a_Position);

    gl.vertexAttribPointer(Cube.attribs.a_UV, 2, gl.FLOAT, false, Cube.stride, Cube.FSIZE * 3);
    gl.enableVertexAttribArray(Cube.attribs.a_UV);

    gl.vertexAttribPointer(Cube.attribs.a_Normal, 3, gl.FLOAT, false, Cube.stride, Cube.FSIZE * 5);
    gl.enableVertexAttribArray(Cube.attribs.a_Normal);
  }

  render(gl, uniforms) {
    Cube.bind(gl);

    const normalMatrix = new Matrix4();
    normalMatrix.setInverseOf(this.matrix);
    normalMatrix.transpose();

    gl.uniformMatrix4fv(uniforms.u_ModelMatrix, false, this.matrix.elements);
    gl.uniformMatrix4fv(uniforms.u_NormalMatrix, false, normalMatrix.elements);
    gl.uniform4f(uniforms.u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1i(uniforms.u_whichTexture, this.textureNum);
    gl.uniform1f(uniforms.u_texColorWeight, this.textureNum >= 0 ? this.texColorWeight : 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, Cube.vertexCount);
  }
}
