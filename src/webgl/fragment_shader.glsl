#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

const int ABSOLUTE_MAX = 2000;

uniform float u_zoom;
uniform vec2 u_center;
uniform vec2 u_resolution;
uniform int u_maxIterations;

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  float aspectRatio = u_resolution.x / u_resolution.y;
  // Precompute constant factors used for coordinate generation.
  float scaleX = 4.0 * aspectRatio;
  float offsetX = 2.0 * aspectRatio;
  float scaleY = 4.0;
  float offsetY = 2.0;

  float factorX = (scaleX * u_zoom) / u_resolution.x;
  float factorY = (scaleY * u_zoom) / u_resolution.y;
  
  vec2 c = vec2(
    gl_FragCoord.x * factorX - offsetX * u_zoom + u_center.x,
    -(gl_FragCoord.y * factorY - offsetY * u_zoom) + u_center.y
  );
  
  float x = 0.0, y = 0.0;
  float x2 = 0.0, y2 = 0.0;
  int iter = u_maxIterations; // assume full iterations by default

  for (int i = 0; i <= ABSOLUTE_MAX; i++) {
    if (i >= u_maxIterations) {
      iter = i;
      break;
    }

    if (x2 + y2 > 4.0) {
      iter = i;
      break;
    }

    float new_x = x2 - y2 + c.x;
    y = 2.0 * x * y + c.y;
    x = new_x;
    
    x2 = x * x;
    y2 = y * y;
  }

  if (iter >= u_maxIterations) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float hue = float(iter) / 50.0;
  vec3 color = hsv2rgb(vec3(
    fract(hue + 0.95),
    0.8,
    1.0
  ));

  gl_FragColor = vec4(color, 1.0);
}
