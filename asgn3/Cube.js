// Cube.js
// Shared cube renderer. Matrix/color/texture change per draw.

class Cube {
  constructor() {
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.textureNum = -2;       // -2 means solid color.
    this.texColorWeight = 1.0;  // 1 = texture, 0 = solid color.
    this.matrix = new Matrix4();
  }

  static init(gl, a_Position, a_UV) {
    if (Cube.vertexBuffer) return;

    // x, y, z, u, v
    const v = new Float32Array([
      // Front (+Z)
      -0.5,-0.5, 0.5,  0,0,   0.5,-0.5, 0.5,  1,0,   0.5, 0.5, 0.5,  1,1,
      -0.5,-0.5, 0.5,  0,0,   0.5, 0.5, 0.5,  1,1,  -0.5, 0.5, 0.5,  0,1,
      // Back (-Z)
       0.5,-0.5,-0.5,  0,0,  -0.5,-0.5,-0.5,  1,0,  -0.5, 0.5,-0.5,  1,1,
       0.5,-0.5,-0.5,  0,0,  -0.5, 0.5,-0.5,  1,1,   0.5, 0.5,-0.5,  0,1,
      // Right (+X)
       0.5,-0.5, 0.5,  0,0,   0.5,-0.5,-0.5,  1,0,   0.5, 0.5,-0.5,  1,1,
       0.5,-0.5, 0.5,  0,0,   0.5, 0.5,-0.5,  1,1,   0.5, 0.5, 0.5,  0,1,
      // Left (-X)
      -0.5,-0.5,-0.5,  0,0,  -0.5,-0.5, 0.5,  1,0,  -0.5, 0.5, 0.5,  1,1,
      -0.5,-0.5,-0.5,  0,0,  -0.5, 0.5, 0.5,  1,1,  -0.5, 0.5,-0.5,  0,1,
      // Top (+Y)
      -0.5, 0.5, 0.5,  0,0,   0.5, 0.5, 0.5,  1,0,   0.5, 0.5,-0.5,  1,1,
      -0.5, 0.5, 0.5,  0,0,   0.5, 0.5,-0.5,  1,1,  -0.5, 0.5,-0.5,  0,1,
      // Bottom (-Y)
      -0.5,-0.5,-0.5,  0,0,   0.5,-0.5,-0.5,  1,0,   0.5,-0.5, 0.5,  1,1,
      -0.5,-0.5,-0.5,  0,0,   0.5,-0.5, 0.5,  1,1,  -0.5,-0.5, 0.5,  0,1,
    ]);

    Cube.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);

    const FSIZE = v.BYTES_PER_ELEMENT;
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 5, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
    gl.enableVertexAttribArray(a_UV);

    Cube.vertexCount = 36;
  }

  render(gl, uniforms) {
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vertexBuffer);
    gl.uniformMatrix4fv(uniforms.u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(uniforms.u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1i(uniforms.u_whichTexture, this.textureNum);
    gl.uniform1f(uniforms.u_texColorWeight, this.textureNum >= 0 ? this.texColorWeight : 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, Cube.vertexCount);
  }
}
