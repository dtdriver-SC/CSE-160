// webgl-utils.js
function getWebGLContext(canvas) {
  return canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
}