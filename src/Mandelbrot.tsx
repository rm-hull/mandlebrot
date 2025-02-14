import React, { useRef, useEffect, useState } from "react";
import styles from "./Mandelbrot.module.css";
import vertexShaderSource from "./webgl/vertex_shader.glsl?raw";
import fragmentShaderSource from "./webgl/fragment_shader.glsl?raw";

export default function Mandelbrot() {
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
          height: "100vh",
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
}

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
