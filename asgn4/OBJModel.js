// OBJModel.js
// Simple OBJ loader/parser used for the required loaded OBJ model.

const DEFAULT_CRYSTAL_OBJ = `# Low poly crystal OBJ loaded for Assignment 4/5 lighting demo
v 0.000000 1.250000 0.000000
v 0.487480 0.650000 0.085956
v 0.374123 0.650000 0.216000
v 0.295040 0.650000 0.351614
v 0.169300 0.650000 0.465148
v 0.000000 0.650000 0.432000
v -0.156987 0.650000 0.431319
v -0.318180 0.650000 0.379192
v -0.374123 0.650000 0.216000
v -0.452027 0.650000 0.079705
v -0.487480 0.650000 -0.085956
v -0.374123 0.650000 -0.216000
v -0.295040 0.650000 -0.351614
v -0.169300 0.650000 -0.465148
v -0.000000 0.650000 -0.432000
v 0.156987 0.650000 -0.431319
v 0.318180 0.650000 -0.379192
v 0.374123 0.650000 -0.216000
v 0.452027 0.650000 -0.079705
v 0.748000 0.100000 0.000000
v 0.613431 0.100000 0.223271
v 0.531328 0.100000 0.445837
v 0.374000 0.100000 0.647787
v 0.113358 0.100000 0.642883
v -0.120442 0.100000 0.683063
v -0.374000 0.100000 0.647787
v -0.500074 0.100000 0.419612
v -0.651771 0.100000 0.237225
v -0.748000 0.100000 0.000000
v -0.613431 0.100000 -0.223271
v -0.531328 0.100000 -0.445837
v -0.374000 0.100000 -0.647787
v -0.113358 0.100000 -0.642883
v 0.120442 0.100000 -0.683063
v 0.374000 0.100000 -0.647787
v 0.500074 0.100000 -0.419612
v 0.651771 0.100000 -0.237225
v 0.411650 -0.550000 0.072585
v 0.315926 -0.550000 0.182400
v 0.249144 -0.550000 0.296919
v 0.142964 -0.550000 0.392792
v 0.000000 -0.550000 0.364800
v -0.132567 -0.550000 0.364225
v -0.268685 -0.550000 0.320207
v -0.315926 -0.550000 0.182400
v -0.381711 -0.550000 0.067306
v -0.411650 -0.550000 -0.072585
v -0.315926 -0.550000 -0.182400
v -0.249144 -0.550000 -0.296919
v -0.142964 -0.550000 -0.392792
v -0.000000 -0.550000 -0.364800
v 0.132567 -0.550000 -0.364225
v 0.268685 -0.550000 -0.320207
v 0.315926 -0.550000 -0.182400
v 0.381711 -0.550000 -0.067306
v 0.000000 -1.050000 0.000000
f 1 3 2
f 1 4 3
f 1 5 4
f 1 6 5
f 1 7 6
f 1 8 7
f 1 9 8
f 1 10 9
f 1 11 10
f 1 12 11
f 1 13 12
f 1 14 13
f 1 15 14
f 1 16 15
f 1 17 16
f 1 18 17
f 1 19 18
f 1 2 19
f 2 3 21
f 2 21 20
f 3 4 22
f 3 22 21
f 4 5 23
f 4 23 22
f 5 6 24
f 5 24 23
f 6 7 25
f 6 25 24
f 7 8 26
f 7 26 25
f 8 9 27
f 8 27 26
f 9 10 28
f 9 28 27
f 10 11 29
f 10 29 28
f 11 12 30
f 11 30 29
f 12 13 31
f 12 31 30
f 13 14 32
f 13 32 31
f 14 15 33
f 14 33 32
f 15 16 34
f 15 34 33
f 16 17 35
f 16 35 34
f 17 18 36
f 17 36 35
f 18 19 37
f 18 37 36
f 19 2 20
f 19 20 37
f 20 21 39
f 20 39 38
f 21 22 40
f 21 40 39
f 22 23 41
f 22 41 40
f 23 24 42
f 23 42 41
f 24 25 43
f 24 43 42
f 25 26 44
f 25 44 43
f 26 27 45
f 26 45 44
f 27 28 46
f 27 46 45
f 28 29 47
f 28 47 46
f 29 30 48
f 29 48 47
f 30 31 49
f 30 49 48
f 31 32 50
f 31 50 49
f 32 33 51
f 32 51 50
f 33 34 52
f 33 52 51
f 34 35 53
f 34 53 52
f 35 36 54
f 35 54 53
f 36 37 55
f 36 55 54
f 37 20 38
f 37 38 55
f 38 39 56
f 39 40 56
f 40 41 56
f 41 42 56
f 42 43 56
f 43 44 56
f 44 45 56
f 45 46 56
f 46 47 56
f 47 48 56
f 48 49 56
f 49 50 56
f 50 51 56
f 51 52 56
f 52 53 56
f 53 54 56
f 54 55 56
f 55 38 56
`;

class OBJModel {
  constructor(path, fallbackText) {
    this.path = path;
    this.fallbackText = fallbackText || DEFAULT_CRYSTAL_OBJ;
    this.color = [0.45, 0.95, 1.0, 1.0];
    this.textureNum = -2;
    this.texColorWeight = 0.0;
    this.matrix = new Matrix4();
    this.vertexBuffer = null;
    this.vertexCount = 0;
    this.loaded = false;
    this.attribs = null;
    this.FSIZE = 4;
    this.stride = 32;
  }

  load(gl, attribs) {
    this.attribs = attribs;
    this.loadFromText(gl, this.fallbackText);

    if (this.path && window.fetch) {
      fetch(this.path)
        .then(response => {
          if (!response.ok) throw new Error('OBJ fetch failed');
          return response.text();
        })
        .then(text => this.loadFromText(gl, text))
        .catch(() => {
          console.log('Using built-in OBJ fallback. Live Server/GitHub Pages will load models/crystal.obj normally.');
        });
    }
  }

  loadFromText(gl, text) {
    const data = this.parseOBJ(text);
    if (!data.length) return;

    const vertices = new Float32Array(data);
    if (!this.vertexBuffer) this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.FSIZE = vertices.BYTES_PER_ELEMENT;
    this.stride = this.FSIZE * 8;
    this.vertexCount = data.length / 8;
    this.loaded = true;
  }

  parseOBJ(text) {
    const positions = [[0, 0, 0]];
    const texcoords = [[0, 0]];
    const normals = [[0, 1, 0]];
    const out = [];
    const lines = text.split(/\r?\n/);

    function parseIndex(value, length) {
      const n = parseInt(value, 10);
      if (Number.isNaN(n)) return 0;
      return n < 0 ? length + n : n;
    }

    function sub(a, b) {
      return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }

    function cross(a, b) {
      return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
      ];
    }

    function normalize(v) {
      const len = Math.hypot(v[0], v[1], v[2]);
      if (len < 0.00001) return [0, 1, 0];
      return [v[0] / len, v[1] / len, v[2] / len];
    }

    function parseFaceVertex(token) {
      const parts = token.split('/');
      return {
        p: parseIndex(parts[0], positions.length),
        t: parts[1] ? parseIndex(parts[1], texcoords.length) : 0,
        n: parts[2] ? parseIndex(parts[2], normals.length) : 0
      };
    }

    function pushVertex(v, fallbackNormal) {
      const p = positions[v.p] || [0, 0, 0];
      const uv = texcoords[v.t] || [0, 0];
      const n = v.n ? (normals[v.n] || fallbackNormal) : fallbackNormal;
      out.push(p[0], p[1], p[2], uv[0], uv[1], n[0], n[1], n[2]);
    }

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const parts = line.split(/\s+/);
      const keyword = parts[0];

      if (keyword === 'v') {
        positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
      } else if (keyword === 'vt') {
        texcoords.push([parseFloat(parts[1]), parseFloat(parts[2])]);
      } else if (keyword === 'vn') {
        normals.push(normalize([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]));
      } else if (keyword === 'f') {
        const verts = parts.slice(1).map(parseFaceVertex);
        for (let i = 1; i < verts.length - 1; i++) {
          const tri = [verts[0], verts[i], verts[i + 1]];
          const p0 = positions[tri[0].p];
          const p1 = positions[tri[1].p];
          const p2 = positions[tri[2].p];
          const faceNormal = normalize(cross(sub(p1, p0), sub(p2, p0)));
          pushVertex(tri[0], faceNormal);
          pushVertex(tri[1], faceNormal);
          pushVertex(tri[2], faceNormal);
        }
      }
    }

    return out;
  }

  bind(gl) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(this.attribs.a_Position, 3, gl.FLOAT, false, this.stride, 0);
    gl.enableVertexAttribArray(this.attribs.a_Position);

    gl.vertexAttribPointer(this.attribs.a_UV, 2, gl.FLOAT, false, this.stride, this.FSIZE * 3);
    gl.enableVertexAttribArray(this.attribs.a_UV);

    gl.vertexAttribPointer(this.attribs.a_Normal, 3, gl.FLOAT, false, this.stride, this.FSIZE * 5);
    gl.enableVertexAttribArray(this.attribs.a_Normal);
  }

  render(gl, uniforms) {
    if (!this.loaded || !this.vertexBuffer) return;
    this.bind(gl);

    const normalMatrix = new Matrix4();
    normalMatrix.setInverseOf(this.matrix);
    normalMatrix.transpose();

    gl.uniformMatrix4fv(uniforms.u_ModelMatrix, false, this.matrix.elements);
    gl.uniformMatrix4fv(uniforms.u_NormalMatrix, false, normalMatrix.elements);
    gl.uniform4f(uniforms.u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1i(uniforms.u_whichTexture, this.textureNum);
    gl.uniform1f(uniforms.u_texColorWeight, this.textureNum >= 0 ? this.texColorWeight : 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
  }
}
