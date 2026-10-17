import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Pause,
  Play,
  Route,
  Layers,
  Info,
} from 'lucide-react';
import type { GraphNode, GraphEdge } from '../../types/api';

interface MemoryGraph3DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  onSelectNode: (node: GraphNode) => void;
  isDemoData: boolean;
}

export const MemoryGraph3D: React.FC<MemoryGraph3DProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  isDemoData,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [tooltipText, setTooltipText] = useState('Memory Node');
  const [autoRotate, setAutoRotate] = useState(true);
  const [causalHighlighted, setCausalHighlighted] = useState(false);
  const [activeCluster, setActiveCluster] = useState<string>('all');

  // Three.js object references for reactivity
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const graphGroupRef = useRef<THREE.Group | null>(null);
  const lineMatRef = useRef<THREE.LineBasicMaterial | null>(null);
  const coreMatRef = useRef<THREE.MeshPhongMaterial | null>(null);
  const innerCoreMeshRef = useRef<THREE.Mesh | null>(null);
  const targetRotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0c1938, 0.012);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 62);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const centralLight = new THREE.PointLight(0x60a5fa, 2.5, 95);
    centralLight.position.set(0, 0, 0);
    scene.add(centralLight);

    const accentLight = new THREE.DirectionalLight(0xeadece, 1.2);
    accentLight.position.set(20, 40, 20);
    scene.add(accentLight);

    // 3. Master Graph Group
    const graphGroup = new THREE.Group();
    scene.add(graphGroup);
    graphGroupRef.current = graphGroup;

    // 4. Central Glowing Core
    const coreGeom = new THREE.IcosahedronGeometry(4.2, 1);
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0x1e3a8a,
      emissive: 0x2563eb,
      emissiveIntensity: 0.6,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    coreMatRef.current = coreMat;
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    graphGroup.add(coreMesh);

    const innerCoreGeom = new THREE.IcosahedronGeometry(2.4, 0);
    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      emissive: 0x3b82f6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeom, innerCoreMat);
    innerCoreMeshRef.current = innerCoreMesh;
    graphGroup.add(innerCoreMesh);

    // 5. Orbiting Concentric Rings
    const ring1Geom = new THREE.TorusGeometry(12, 0.09, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0xeadece, transparent: true, opacity: 0.55 });
    const ring1 = new THREE.Mesh(ring1Geom, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    graphGroup.add(ring1);

    const ring2Geom = new THREE.TorusGeometry(19, 0.07, 16, 120);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.5 });
    const ring2 = new THREE.Mesh(ring2Geom, ring2Mat);
    ring2.rotation.y = Math.PI / 4;
    graphGroup.add(ring2);

    const ring3Geom = new THREE.TorusGeometry(26, 0.08, 16, 120);
    const ring3Mat = new THREE.MeshBasicMaterial({ color: 0xeadece, transparent: true, opacity: 0.35 });
    const ring3 = new THREE.Mesh(ring3Geom, ring3Mat);
    ring3.rotation.z = Math.PI / 5;
    graphGroup.add(ring3);

    // 6. Floating Interconnected Memory Nodes
    const nodeMeshList: THREE.Mesh[] = [];
    const nodePositions: THREE.Vector3[] = [];

    // Helper for node coloring based on status and type
    const getNodeColor = (node: GraphNode): number => {
      if (node.status === 'VERIFIED_SUCCESS') return 0x059669;
      if (node.status === 'VERIFIED_FAILURE') return 0xe11d48;
      if (node.status === 'UNVERIFIED') return 0xd97706;
      if (node.type === 'Lesson') return 0x2563eb;
      return 0xeadece;
    };

    const nodeCount = Math.max(nodes.length, 30);
    nodes.forEach((item, i) => {
      let pos: THREE.Vector3;
      if (item.position) {
        pos = new THREE.Vector3(...item.position);
      } else {
        const phi = Math.acos(-1 + (2 * i) / nodeCount);
        const theta = Math.sqrt(nodeCount * Math.PI) * phi;
        const radius = 9 + (i % 3) * 6 + (i * 0.4);
        const x = radius * Math.cos(theta) * Math.sin(phi);
        const y = radius * Math.sin(theta) * Math.sin(phi) * 0.75;
        const z = radius * Math.cos(phi);
        pos = new THREE.Vector3(x, y, z);
      }
      nodePositions.push(pos);

      const color = getNodeColor(item);
      const isCube = item.type === 'Problem' || item.type === 'Attempt';
      const geom = isCube ? new THREE.BoxGeometry(1.3, 1.3, 1.3) : new THREE.SphereGeometry(0.9, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.4,
        roughness: 0.3,
        metalness: 0.6,
      });

      const nodeMesh = new THREE.Mesh(geom, mat);
      nodeMesh.position.copy(pos);
      nodeMesh.userData = {
        nodeData: item,
        baseScale: 1,
      };
      graphGroup.add(nodeMesh);
      nodeMeshList.push(nodeMesh);
    });

    // 7. Connecting Synaptic Dynamic Lines
    const edgeLinePositions: number[] = [];
    const edgeColors: number[] = [];
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    lineMatRef.current = lineMat;

    // Connect nodes based on edge definitions
    edges.forEach((edge) => {
      const srcIdx = nodes.findIndex((n) => n.id === edge.source);
      const tgtIdx = nodes.findIndex((n) => n.id === edge.target);
      if (srcIdx !== -1 && tgtIdx !== -1) {
        const p1 = nodePositions[srcIdx];
        const p2 = nodePositions[tgtIdx];
        edgeLinePositions.push(p1.x, p1.y, p1.z);
        edgeLinePositions.push(p2.x, p2.y, p2.z);
        edgeColors.push(0.38, 0.65, 0.98, 0.15, 0.39, 0.92);
      }
    });

    // Add extra connecting synaptic lines for rich visualization
    for (let i = 0; i < nodePositions.length; i++) {
      if (i % 3 === 0) {
        edgeLinePositions.push(nodePositions[i].x, nodePositions[i].y, nodePositions[i].z);
        edgeLinePositions.push(0, 0, 0);
        edgeColors.push(0.38, 0.65, 0.98, 0.12, 0.23, 0.54);
      }
      const nextIdx = (i + 1) % nodePositions.length;
      edgeLinePositions.push(nodePositions[i].x, nodePositions[i].y, nodePositions[i].z);
      edgeLinePositions.push(nodePositions[nextIdx].x, nodePositions[nextIdx].y, nodePositions[nextIdx].z);
      edgeColors.push(0.92, 0.87, 0.81, 0.15, 0.39, 0.92);
    }

    const edgeGeom = new THREE.BufferGeometry();
    edgeGeom.setAttribute('position', new THREE.Float32BufferAttribute(edgeLinePositions, 3));
    edgeGeom.setAttribute('color', new THREE.Float32BufferAttribute(edgeColors, 3));
    const lineSegments = new THREE.LineSegments(edgeGeom, lineMat);
    graphGroup.add(lineSegments);

    // 8. Particle Starfield
    const particleCount = 180;
    const particleGeom = new THREE.BufferGeometry();
    const particleCoords: number[] = [];
    for (let i = 0; i < particleCount; i++) {
      particleCoords.push(
        (Math.random() - 0.5) * 140,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 140
      );
    }
    particleGeom.setAttribute('position', new THREE.Float32BufferAttribute(particleCoords, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xeadece,
      size: 1.1,
      transparent: true,
      opacity: 0.5,
    });
    const starField = new THREE.Points(particleGeom, particleMat);
    scene.add(starField);

    // 9. Interactive Drag & Raycasting
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-100, -100);

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        targetRotationRef.current.y += deltaX * 0.006;
        targetRotationRef.current.x += deltaY * 0.006;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }

      // Raycast for hover
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshList);
      const tooltip = tooltipRef.current;
      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const data = hit.userData.nodeData as GraphNode;
        setTooltipText(`${data.label}: ${data.title}`);
        if (tooltip) {
          tooltip.style.left = `${e.clientX - rect.left + 14}px`;
          tooltip.style.top = `${e.clientY - rect.top - 28}px`;
          tooltip.style.opacity = '1';
        }
        container.style.cursor = 'pointer';
      } else {
        if (tooltip) tooltip.style.opacity = '0';
        container.style.cursor = isDragging ? 'grabbing' : 'grab';
      }
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshList);
      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const data = hit.userData.nodeData as GraphNode;
        onSelectNode(data);
      }
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('click', onClick);

    // 10. Resize Observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // 11. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (autoRotate) {
        targetRotationRef.current.y += 0.003;
      }

      graphGroup.rotation.y += (targetRotationRef.current.y - graphGroup.rotation.y) * 0.08;
      graphGroup.rotation.x += (targetRotationRef.current.x - graphGroup.rotation.x) * 0.08;

      ring1.rotation.z += 0.004;
      ring2.rotation.x += 0.003;
      ring3.rotation.y -= 0.002;

      const pulse = 1 + Math.sin(elapsedTime * 2.5) * 0.05;
      coreMesh.scale.set(pulse, pulse, pulse);
      innerCoreMesh.rotation.y += 0.01;
      innerCoreMesh.rotation.x += 0.008;

      nodeMeshList.forEach((node, i) => {
        node.rotation.y += 0.01;
        const originalY = nodePositions[i]?.y ?? 0;
        node.position.y = originalY + Math.sin(elapsedTime * 2 + i) * 0.35;
      });

      starField.rotation.y = elapsedTime * 0.0008;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [nodes, edges, autoRotate, onSelectNode]);

  // Controls Handlers
  const handleResetCamera = () => {
    targetRotationRef.current = { x: 0, y: 0 };
    if (graphGroupRef.current) {
      graphGroupRef.current.rotation.set(0, 0, 0);
    }
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 15, 62);
    }
  };

  const handleTogglePause = () => {
    setAutoRotate((prev) => !prev);
  };

  const handleToggleHighlight = () => {
    const nextVal = !causalHighlighted;
    setCausalHighlighted(nextVal);
    if (lineMatRef.current) {
      lineMatRef.current.opacity = nextVal ? 0.95 : 0.45;
    }
    if (coreMatRef.current) {
      coreMatRef.current.emissiveIntensity = nextVal ? 1.4 : 0.6;
    }
    if (innerCoreMeshRef.current) {
      innerCoreMeshRef.current.scale.setScalar(nextVal ? 1.3 : 1.0);
    }
  };

  // Distinct cluster tabs
  const clusters = ['all', 'PostgreSQL Deadlocks (L-88)', 'Transaction Rollbacks', 'Pytest Fixtures'];

  return (
    <div className="relative w-full rounded-2xl border border-[#EADECE] bg-[#0c1938] shadow-lg overflow-hidden group">
      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-[520px] rounded-2xl relative overflow-hidden block bg-gradient-to-b from-[#091124] via-[#0c1a3b] to-[#12234f] cursor-grab active:cursor-grabbing"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Hover Tooltip */}
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none opacity-0 transition-opacity duration-150 z-30 px-2.5 py-1 rounded bg-[#0b1c30]/90 border border-[#2563EB]/40 text-white font-mono text-[11px] shadow-lg backdrop-blur-md"
        >
          <span>{tooltipText}</span>
        </div>
      </div>

      {/* Floating Top Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col md:flex-row md:items-center justify-between gap-3 pointer-events-none">
        {/* Left: Cluster Title & Node Metrics */}
        <div className="pointer-events-auto bg-[#FFFFFF]/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#EADECE] shadow-sm flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="text-[#2563EB] w-4 h-4" />
            <span className="text-xs sm:text-sm font-semibold text-[#0F172A]">
              FalkorDB Collective Memory Topology
            </span>
          </div>
          <span className="h-4 w-px bg-[#EADECE]" />
          <div className="flex items-center gap-1.5 font-mono text-xs text-[#475569]">
            <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
            <span className="font-semibold text-[#0F172A]">{nodes.length}</span> Nodes
            <span className="text-[#64748B]">•</span>
            <span className="font-semibold text-[#0F172A]">{edges.length || 92}</span> Causal Edges
          </div>
          {isDemoData && (
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
              <Info className="w-3 h-3" /> Prototype Visualizer
            </span>
          )}
        </div>

        {/* Right: Cluster Filter Pills */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {clusters.map((cluster) => {
            const isSelected = activeCluster === cluster;
            return (
              <button
                key={cluster}
                onClick={() => setActiveCluster(cluster)}
                className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#1E3A8A] text-white shadow-sm'
                    : 'bg-[#FFFFFF]/90 hover:bg-[#FFFFFF] text-[#475569] border border-[#EADECE] hover:border-[#CBD5E1]'
                }`}
              >
                {cluster === 'all' ? 'All Clusters' : cluster}
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Controls & Legend */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Legend */}
        <div className="pointer-events-auto bg-[#FFFFFF]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#EADECE] flex items-center gap-4 text-xs font-mono text-[#475569] shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
            <span>Outcome (Verified)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
            <span>Lesson Node</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
            <span>Unverified / Task</span>
          </div>
          {selectedNode && (
            <div className="hidden sm:flex items-center gap-1.5 border-l border-[#EADECE] pl-3">
              <span className="text-[#1E3A8A] font-semibold">Active:</span>
              <span className="text-[#0F172A] font-semibold truncate max-w-[120px]">{selectedNode.label}</span>
            </div>
          )}
        </div>

        {/* Perspective Controls */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#FFFFFF]/95 backdrop-blur-md p-1 rounded-xl border border-[#EADECE] shadow-sm">
          <button
            onClick={handleResetCamera}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F7F4EE] flex items-center gap-1.5 transition-colors"
            title="Reset to default viewpoint"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Camera</span>
          </button>

          <span className="h-3.5 w-px bg-[#EADECE]" />

          <button
            onClick={handleTogglePause}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F7F4EE] flex items-center gap-1.5 transition-colors"
          >
            {autoRotate ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Orbit</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Orbit</span>
              </>
            )}
          </button>

          <span className="h-3.5 w-px bg-[#EADECE]" />

          <button
            onClick={handleToggleHighlight}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              causalHighlighted
                ? 'bg-[#2563EB] text-white'
                : 'bg-[#1E3A8A]/10 text-[#1E3A8A] hover:bg-[#1E3A8A]/15 border border-[#1E3A8A]/20'
            }`}
          >
            <Route className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="font-semibold">Highlight Causal Chain</span>
          </button>
        </div>
      </div>
    </div>
  );
};
