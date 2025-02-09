import React, { useRef, useEffect, useState } from "react";

const Mandelbrot: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1.0);
  const [centerX, setCenterX] = useState(0.0);
  const [centerY, setCenterY] = useState(0.0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; // Handle null canvas

    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    // Vertex Shader
    const vertexShaderSource = `
      attribute vec4 a_position;
      void main() {
        gl_Position = a_position;
      }
    `;

    // Fragment Shader (Mandelbrot calculation)
    const fragmentShaderSource = `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif

      uniform float u_zoom;
      uniform float u_centerX;
      uniform float u_centerY;
  
      const int MAX_ITERATIONS = 256;
  
      void main() {
        float width = float(${canvas.width});
        float height = float(${canvas.height});
      
        vec2 c = vec2(gl_FragCoord.x / width * 4.0 * u_zoom - 2.0 * u_zoom + u_centerX, gl_FragCoord.y / height * 4.0 * u_zoom - 2.0 * u_zoom + u_centerY);
        vec2 z = vec2(0.0, 0.0);
      
        int iterations = 0;
        for (int i = 0; i < MAX_ITERATIONS; i++) {
          float x = z.x * z.x - z.y * z.y + c.x;
          float y = 2.0 * z.x * z.y + c.y;
          if (x * x + y * y > 4.0) break;
          z = vec2(x, y);
          iterations = i + 1;
        }

        if (iterations == MAX_ITERATIONS) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }
      
        float colorValue = float(iterations) / float(MAX_ITERATIONS);

        // Color mapping (example: smooth rainbow palette)
        vec3 color;
        if (colorValue < 0.25) {
          color = vec3(0.0, colorValue * 4.0, 1.0);
        } else if (colorValue < 0.5) {
          color = vec3(0.0, 1.0, 1.0 - (colorValue - 0.25) * 4.0);
        } else if (colorValue < 0.75) {
          color = vec3((colorValue - 0.5) * 4.0, 1.0, 0.0);
        } else {
          color = vec3(1.0, 1.0 - (colorValue - 0.75) * 4.0, 0.0);
        }

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // ... (Helper functions to compile shaders - see below) ...
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Set up vertex data (a simple quad)
    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position"
    );
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const zoomUniformLocation = gl.getUniformLocation(program, "u_zoom");
    const centerXUniformLocation = gl.getUniformLocation(program, "u_centerX");
    const centerYUniformLocation = gl.getUniformLocation(program, "u_centerY");

    function render() {
      if (gl == null) {
        return;
      }

      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform1f(zoomUniformLocation, zoom);
      gl.uniform1f(centerXUniformLocation, centerX);
      gl.uniform1f(centerYUniformLocation, centerY);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black
    render();

    return () => {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, [zoom, centerX, centerY]); // Re-render when zoom or center changes

  const handleZoomChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(parseFloat(event.target.value));
  };

  const handleCenterXChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCenterX(parseFloat(event.target.value));
  };

  const handleCenterYChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCenterY(parseFloat(event.target.value));
  };

  return (
    <div>
      <canvas ref={canvasRef} width={1024} height={1024} />
      <div>
        Zoom:{" "}
        <input
          type="range"
          min="0.001"
          max="1.0"
          step="0.001"
          value={zoom}
          onChange={handleZoomChange}
        />{" "}
        {zoom}
      </div>
      <div>
        Center X:{" "}
        <input
          type="range"
          min="-2.0"
          max="2.0"
          step="0.01"
          value={centerX}
          onChange={handleCenterXChange}
        />{" "}
        {centerX}
      </div>
      <div>
        Center Y:{" "}
        <input
          type="range"
          min="-2.0"
          max="2.0"
          step="0.01"
          value={centerY}
          onChange={handleCenterYChange}
        />{" "}
        {centerY}
      </div>
    </div>
  );
};

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Failed to create shader");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    throw new Error("Shader compilation error:" + gl.getShaderInfoLog(shader));
  }

  return shader;
}

export default Mandelbrot;
