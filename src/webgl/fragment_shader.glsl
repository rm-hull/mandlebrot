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
  
  vec2 c = vec2(
    (gl_FragCoord.x / u_resolution.x * 4.0 * aspectRatio - 2.0 * aspectRatio) * u_zoom + u_center.x,
    -(gl_FragCoord.y / u_resolution.y * 4.0 - 2.0) * u_zoom + u_center.y
  );
  
  vec2 z = vec2(0.0);
  int iter = 0;

  for (int i = 0; i <= ABSOLUTE_MAX; i++) {
    if (i >= u_maxIterations) {
      iter = i;
      break;
    }

    float x = z.x * z.x - z.y * z.y + c.x;
    float y = 2.0 * z.x * z.y + c.y;

    if (x * x + y * y > 4.0) {
      iter = i;
      break;
    } 
    z = vec2(x, y);
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
