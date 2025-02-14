import {
  useRef,
  useEffect,
  useState,
  useCallback,
  MouseEvent,
  WheelEvent,
} from "react";
import styles from "./Mandelbrot.module.css";
import vertexShaderSource from "./webgl/vertex_shader.glsl?raw";
import fragmentShaderSource from "./webgl/fragment_shader.glsl?raw";
import { useGLSL } from "./hooks/useGLSL";
import classNames from "classnames";

type Point = { x: number; y: number };

export default function Mandelbrot() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<(Point & { center: Point }) | null>(null);

  const [zoom, setZoom] = useState(0.5);
  const [center, setCenter] = useState<Point>({ x: -0.5, y: 0.0 });
  const [quality, setQuality] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [maxIterations, setMaxIterations] = useState(1000);

  const { canvasRef, glRef, programRef } = useGLSL(
    vertexShaderSource,
    fragmentShaderSource
  );

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
  }, [dimensions, canvasRef, quality]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const program = programRef.current;
    if (!canvas || !gl || !program) return;

    const uniformLocations = {
      zoom: gl.getUniformLocation(program, "u_zoom"),
      center: gl.getUniformLocation(program, "u_center"),
      resolution: gl.getUniformLocation(program, "u_resolution"),
      maxIterations: gl.getUniformLocation(program, "u_maxIterations"),
    };

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform1f(uniformLocations.zoom, zoom);
    gl.uniform2f(uniformLocations.center, center.x, center.y);
    gl.uniform2f(uniformLocations.resolution, canvas.width, canvas.height);
    gl.uniform1i(uniformLocations.maxIterations, maxIterations);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, [
    zoom,
    center,
    quality,
    dimensions,
    maxIterations,
    canvasRef,
    glRef,
    programRef,
  ]);

  const handleMouseWheel = useCallback(
    (event: WheelEvent<HTMLCanvasElement>) => {
      const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
      setZoom((prev) => Math.max(0.000001, Math.min(2.0, prev * zoomFactor)));
    },
    []
  );

  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      setIsDragging(true);
      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        center,
      };
    },
    [center]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || !dragStartRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const aspectRatio = rect.width / rect.height;
      const scaleX = (4 * aspectRatio * zoom) / rect.width;
      const scaleY = (4 * zoom) / rect.height;

      const deltaX = (event.clientX - dragStartRef.current.x) * scaleX;
      const deltaY = (event.clientY - dragStartRef.current.y) * scaleY;

      setCenter({
        x: dragStartRef.current.center.x - deltaX,
        y: dragStartRef.current.center.y - deltaY,
      });
    },
    [canvasRef, isDragging, zoom]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  return (
    <div ref={containerRef}>
      <canvas
        ref={canvasRef}
        className={classNames(styles.canvas, { [styles.dragging]: isDragging })}
        style={{ width: "100%", height: "100vh" }}
        onWheel={handleMouseWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      <div className={styles.controls}>
        <center>
          <div>WebGL Mandelbrot Renderer</div>
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
          <label>Quality:</label>
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
          <span>x = {center.x.toFixed(8)}</span>
        </div>
        <div>
          <label />
          <span>y = {center.y.toFixed(8)}</span>
        </div>
      </div>
    </div>
  );
}
