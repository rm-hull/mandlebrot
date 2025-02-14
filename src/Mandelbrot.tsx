import React, { useRef, useEffect, useState } from "react";
import styles from "./Mandelbrot.module.css";

const Mandelbrot: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animationFrameRef = useRef<number>(0);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const [zoom, setZoom] = useState(0.5);
  const [centerX, setCenterX] = useState(-0.5);
  const [centerY, setCenterY] = useState(0.0);
  const [quality, setQuality] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [maxIterations, setMaxIterations] = useState(1000);

  // Handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to match container
    canvas.width = dimensions.width * quality * window.devicePixelRatio;
    canvas.height = dimensions.height * quality * window.devicePixelRatio;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    glRef.current = gl;

    const vertexShaderSource = `
      attribute vec4 a_position;
      void main() {
        gl_Position = a_position;
      }
    `;

    const fragmentShaderSource = `
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
        // vec2 resolution = vec2(u_canvasWidth, u_canvasHeight);
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
    `;

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

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    programRef.current = program;
    gl.useProgram(program);

    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position"
    );
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    const uniformLocations = {
      zoom: gl.getUniformLocation(program, "u_zoom"),
      center: gl.getUniformLocation(program, "u_center"),
      resolution: gl.getUniformLocation(program, "u_resolution"),
      maxIterations: gl.getUniformLocation(program, "u_maxIterations"),
    };

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    function render() {
      if (!gl || !program || !canvas) return;

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);

      gl.uniform1f(uniformLocations.zoom, zoom);
      gl.uniform2f(uniformLocations.center, centerX, centerY);
      gl.uniform2f(uniformLocations.resolution, canvas.width, canvas.height);
      gl.uniform1i(uniformLocations.maxIterations, maxIterations);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameRef.current = requestAnimationFrame(render);
    }

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(positionBuffer);
      }
    };
  }, [zoom, centerX, centerY, quality, dimensions, maxIterations]);

  const handleMouseWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.max(0.000001, Math.min(2.0, prev * zoomFactor)));
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    event.preventDefault();
    setIsDragging(true);

    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      centerX,
      centerY,
    };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStartRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const aspectRatio = rect.width / rect.height;
    const scaleX = (4 * aspectRatio * zoom) / rect.width;
    const scaleY = (4 * zoom) / rect.height;

    const deltaX = (event.clientX - dragStartRef.current.x) * scaleX;
    const deltaY = (event.clientY - dragStartRef.current.y) * scaleY;

    setCenterX(dragStartRef.current.centerX - deltaX);
    setCenterY(dragStartRef.current.centerY - deltaY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  return (
    <div ref={containerRef}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onWheel={handleMouseWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      <div className={styles.controls}>
        <center>
          WebGL Mandelbrot Renderer{" "}
          <a href="https://github.com/rm-hull/mandelbrot" target="blank">
            https://github.com/rm-hull/mandelbrot
          </a>
        </center>
        <div>
          <label>Iterations:</label>
          <input
            type="range"
            min="100"
            max="2000"
            step="1"
            value={maxIterations}
            onChange={(e) => setMaxIterations(parseFloat(e.target.value))}
          />
          <span>{maxIterations}</span>
        </div>
        <div>
          <label>Quality: </label>
          <input
            type="range"
            min="0.25"
            max="3.0"
            step="0.25"
            value={quality}
            onChange={(e) => setQuality(parseFloat(e.target.value))}
          />
          <span>{quality.toFixed(2)}x</span>
        </div>
        <div>
          <label>Zoom:</label>
          <span>{zoom.toFixed(6)}x</span>
        </div>
        <div>
          <label>Position:</label>
          <span>x = {centerX.toFixed(8)}</span>
        </div>
        <div>
          <label></label>
          <span>y = {centerY.toFixed(8)}</span>
        </div>
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
    const message = gl.getShaderInfoLog(shader);
    console.error("Shader compilation error:", message);
    gl.deleteShader(shader);
    throw new Error("Shader compilation error: " + message);
  }

  return shader;
}

export default Mandelbrot;
