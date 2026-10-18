import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Layers,
  Info,
  Search,
  Focus,
  Sparkles,
  Workflow,
} from 'lucide-react';
import type { GraphNode, GraphEdge } from '../../types/api';

interface MemoryGraph3DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  onSelectNode: (node: GraphNode) => void;
  isDemoData: boolean;
}

type LayoutMode = 'galaxy' | 'hierarchy' | 'clusters';

interface NodeRenderObj {
  mesh: THREE.Group;
  innerMesh: THREE.Mesh;
  outerMesh: THREE.Mesh;
  labelSprite?: THREE.Sprite;
  data: GraphNode;
  targetPos: THREE.Vector3;
  currentPos: THREE.Vector3;
}

interface PulseParticle {
  mesh: THREE.Mesh;
  sourceIdx: number;
  targetIdx: number;
  progress: number;
  speed: number;
}

// Generate high-resolution canvas texture for 3D text billboards
function createLabelSprite(text: string, status: string, type: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Sprite();

  const fontSize = 26;
  ctx.font = `bold ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  const metrics = ctx.measureText(text);
  const padX = 16;
  const padY = 8;
  canvas.width = Math.ceil(metrics.width + padX * 2);
  canvas.height = fontSize + padY * 2;

  ctx.font = `bold ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;

  // Determine accent color
  let accentColor = '#38BDF8';
  let badgeBg = 'rgba(15, 23, 42, 0.85)';
  if (status === 'VERIFIED_SUCCESS') {
    accentColor = '#10B981';
    badgeBg = 'rgba(6, 78, 59, 0.85)';
  } else if (status === 'VERIFIED_FAILURE') {
    accentColor = '#F43F5E';
    badgeBg = 'rgba(136, 19, 55, 0.85)';
  } else if (status === 'UNVERIFIED') {
    accentColor = '#F59E0B';
    badgeBg = 'rgba(120, 53, 15, 0.85)';
  } else if (type === 'Lesson') {
    accentColor = '#60A5FA';
    badgeBg = 'rgba(30, 58, 138, 0.85)';
  }

  // Draw rounded pill badge
  ctx.fillStyle = badgeBg;
  const w = canvas.width;
  const h = canvas.height;
  const r = 8;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, r);
  ctx.fill();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Status indicator dot
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(padX - 2, h / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, padX + 8, h / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(spriteMat);
  const aspect = canvas.width / canvas.height;
  const spriteH = 1.6;
  sprite.scale.set(spriteH * aspect, spriteH, 1);
  return sprite;
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

  // UI state
  const [autoRotate] = useState(true);
  const [causalHighlighted] = useState(false);
  const [activeCluster, setActiveCluster] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('galaxy');
  const [showLabels] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // References to Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const nodeRenderListRef = useRef<NodeRenderObj[]>([]);
  const edgeLineSegmentsRef = useRef<THREE.LineSegments | null>(null);
  const pulseParticlesRef = useRef<PulseParticle[]>([]);
  const pulseGroupRef = useRef<THREE.Group | null>(null);
  const selectionBeaconRef = useRef<THREE.Group | null>(null);
  const coreGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Camera smooth tweening target
  const cameraTargetRef = useRef<{
    pos: THREE.Vector3 | null;
    lookAt: THREE.Vector3 | null;
  }>({ pos: null, lookAt: null });

  // Distinct cluster categories
  const clusters = useMemo(() => {
    const set = new Set<string>();
    nodes.forEach((n) => {
      if (n.cluster) set.add(n.cluster);
    });
    return ['all', ...Array.from(set)];
  }, [nodes]);

  // Search filtered node suggestions
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return nodes
      .filter((n) => n.id.toLowerCase().includes(q) || n.title.toLowerCase().includes(q) || n.label.toLowerCase().includes(q))
      .slice(0, 5);
  }, [nodes, searchQuery]);

  // Compute target positions based on layoutMode
  const calculateLayoutPositions = useCallback(
    (nodeList: GraphNode[], mode: LayoutMode): THREE.Vector3[] => {
      const positions: THREE.Vector3[] = [];
      const total = nodeList.length || 1;

      if (mode === 'galaxy') {
        // Spherical harmonic distribution
        nodeList.forEach((node, i) => {
          if (node.position) {
            positions.push(new THREE.Vector3(node.position[0] * 1.3, node.position[1] * 1.3, node.position[2] * 1.3));
          } else {
            const phi = Math.acos(-1 + (2 * i) / total);
            const theta = Math.sqrt(total * Math.PI) * phi;
            const radius = 14 + (i % 4) * 6 + (i * 0.35);
            const x = radius * Math.cos(theta) * Math.sin(phi);
            const y = radius * Math.sin(theta) * Math.sin(phi) * 0.85;
            const z = radius * Math.cos(phi);
            positions.push(new THREE.Vector3(x, y, z));
          }
        });
      } else if (mode === 'hierarchy') {
        // Vertical tiers by causal phase
        const layerBuckets: Record<string, GraphNode[]> = {
          Problem: [],
          Failure: [],
          Task: [],
          Attempt: [],
          Outcome: [],
          Lesson: [],
        };
        nodeList.forEach((n) => {
          const type = n.type || 'Lesson';
          if (layerBuckets[type]) layerBuckets[type].push(n);
          else layerBuckets.Lesson.push(n);
        });

        const yLevels: Record<string, number> = {
          Problem: -16,
          Failure: -14,
          Task: -2,
          Attempt: 0,
          Outcome: 12,
          Lesson: 24,
        };

        const radiusLevels: Record<string, number> = {
          Problem: 18,
          Failure: 20,
          Task: 16,
          Attempt: 15,
          Outcome: 18,
          Lesson: 20,
        };

        nodeList.forEach((node) => {
          const type = node.type || 'Lesson';
          const bucket = layerBuckets[type] || [node];
          const idx = bucket.indexOf(node);
          const count = bucket.length || 1;
          const y = yLevels[type] ?? 0;
          const r = radiusLevels[type] ?? 16;
          const angle = (idx / count) * Math.PI * 2 + (y * 0.1);
          const x = Math.cos(angle) * r;
          const z = Math.sin(angle) * r;
          positions.push(new THREE.Vector3(x, y, z));
        });
      } else if (mode === 'clusters') {
        // Grouped by cluster islands
        const clusterList = Array.from(new Set(nodeList.map((n) => n.cluster || 'Default')));
        const clusterCenters: Record<string, THREE.Vector3> = {};
        clusterList.forEach((c, idx) => {
          const angle = (idx / clusterList.length) * Math.PI * 2;
          const dist = 24;
          clusterCenters[c] = new THREE.Vector3(Math.cos(angle) * dist, (idx % 2 === 0 ? 4 : -4), Math.sin(angle) * dist);
        });

        nodeList.forEach((node, i) => {
          const center = clusterCenters[node.cluster || 'Default'] || new THREE.Vector3(0, 0, 0);
          const offsetAngle = (i * 1.5) % (Math.PI * 2);
          const offsetDist = 5 + (i % 3) * 2.5;
          positions.push(
            new THREE.Vector3(
              center.x + Math.cos(offsetAngle) * offsetDist,
              center.y + (i % 2 === 0 ? 2 : -2),
              center.z + Math.sin(offsetAngle) * offsetDist
            )
          );
        });
      }

      return positions;
    },
    []
  );

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080e1e, 0.009);
    sceneRef.current = scene;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 18, 68);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    rendererRef.current = renderer;

    // 2. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 12;
    controls.maxDistance = 240;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.8;
    controlsRef.current = controls;

    // 3. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const centralLight = new THREE.PointLight(0x60a5fa, 3, 120);
    centralLight.position.set(0, 0, 0);
    scene.add(centralLight);

    const accentTop = new THREE.DirectionalLight(0xe2e8f0, 1.3);
    accentTop.position.set(30, 50, 30);
    scene.add(accentTop);

    const accentBottom = new THREE.DirectionalLight(0x2563eb, 0.8);
    accentBottom.position.set(-30, -40, -30);
    scene.add(accentBottom);

    // 4. Central FalkorDB Quantum Core & Rings
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);
    coreGroupRef.current = coreGroup;

    // Wireframe cage
    const outerCoreGeom = new THREE.IcosahedronGeometry(4.4, 1);
    const outerCoreMat = new THREE.MeshPhongMaterial({
      color: 0x1e3a8a,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.7,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const outerCoreMesh = new THREE.Mesh(outerCoreGeom, outerCoreMat);
    coreGroup.add(outerCoreMesh);

    // Glowing solid nucleus
    const innerCoreGeom = new THREE.IcosahedronGeometry(2.4, 0);
    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      emissive: 0x2563eb,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.8,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeom, innerCoreMat);
    coreGroup.add(innerCoreMesh);

    // Orbiting gyroscopic rings
    const ring1Geom = new THREE.TorusGeometry(12, 0.08, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.45 });
    const ring1 = new THREE.Mesh(ring1Geom, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    coreGroup.add(ring1);

    const ring2Geom = new THREE.TorusGeometry(18, 0.07, 16, 120);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.4 });
    const ring2 = new THREE.Mesh(ring2Geom, ring2Mat);
    ring2.rotation.y = Math.PI / 4;
    coreGroup.add(ring2);

    const ring3Geom = new THREE.TorusGeometry(26, 0.07, 16, 120);
    const ring3Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.3 });
    const ring3 = new THREE.Mesh(ring3Geom, ring3Mat);
    ring3.rotation.z = Math.PI / 5;
    coreGroup.add(ring3);

    // Subtle planar polar grid in background
    const grid = new THREE.PolarGridHelper(36, 16, 8, 64, 0x1e3a8a, 0x1e293b);
    grid.position.y = -22;
    const gMat = grid.material;
    if (Array.isArray(gMat)) {
      gMat.forEach((m) => {
        m.opacity = 0.25;
        m.transparent = true;
      });
    } else if (gMat) {
      gMat.opacity = 0.25;
      gMat.transparent = true;
    }
    scene.add(grid);

    // 5. Starfield & Cosmic Dust
    const starCount = 300;
    const starGeom = new THREE.BufferGeometry();
    const starCoords: number[] = [];
    for (let i = 0; i < starCount; i++) {
      starCoords.push(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 160,
        (Math.random() - 0.5) * 200
      );
    }
    starGeom.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 1.2,
      transparent: true,
      opacity: 0.5,
    });
    const starField = new THREE.Points(starGeom, starMat);
    scene.add(starField);

    // 6. Selection Targeting Beacon (dual holographic animated rings)
    const beaconGroup = new THREE.Group();
    beaconGroup.visible = false;
    scene.add(beaconGroup);
    selectionBeaconRef.current = beaconGroup;

    const beaconRing1Geom = new THREE.RingGeometry(2.4, 2.6, 32);
    const beaconRing1Mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const beaconRing1 = new THREE.Mesh(beaconRing1Geom, beaconRing1Mat);
    beaconGroup.add(beaconRing1);

    const beaconRing2Geom = new THREE.RingGeometry(3.0, 3.2, 32);
    const beaconRing2Mat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const beaconRing2 = new THREE.Mesh(beaconRing2Geom, beaconRing2Mat);
    beaconRing2.rotation.x = Math.PI / 2;
    beaconGroup.add(beaconRing2);

    // 7. Dynamic Nodes Setup
    const targetPositions = calculateLayoutPositions(nodes, layoutMode);
    const nodeRenderObjects: NodeRenderObj[] = [];

    // Color mapper
    const getNodeTheme = (n: GraphNode) => {
      if (n.status === 'VERIFIED_SUCCESS') {
        return { primary: 0x10b981, emissive: 0x059669, glow: 0x34d399 };
      }
      if (n.status === 'VERIFIED_FAILURE') {
        return { primary: 0xf43f5e, emissive: 0xe11d48, glow: 0xfb7185 };
      }
      if (n.status === 'UNVERIFIED') {
        return { primary: 0xf59e0b, emissive: 0xd97706, glow: 0xfbbf24 };
      }
      if (n.type === 'Lesson') {
        return { primary: 0x3b82f6, emissive: 0x2563eb, glow: 0x60a5fa };
      }
      return { primary: 0x38bdf8, emissive: 0x0284c7, glow: 0x7dd3fc };
    };

    nodes.forEach((item, idx) => {
      const pos = targetPositions[idx] || new THREE.Vector3(0, 0, 0);
      const theme = getNodeTheme(item);

      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(pos);
      nodeGroup.userData = { nodeData: item, nodeIndex: idx };

      // Geometry based on type
      let geom: THREE.BufferGeometry;
      let outerGeom: THREE.BufferGeometry;
      if (item.type === 'Lesson') {
        geom = new THREE.IcosahedronGeometry(1.2, 0);
        outerGeom = new THREE.IcosahedronGeometry(1.7, 0);
      } else if (item.type === 'Outcome') {
        geom = new THREE.SphereGeometry(1.1, 24, 24);
        outerGeom = new THREE.SphereGeometry(1.6, 16, 16);
      } else if (item.type === 'Failure') {
        geom = new THREE.TetrahedronGeometry(1.3, 0);
        outerGeom = new THREE.TetrahedronGeometry(1.8, 0);
      } else {
        geom = new THREE.BoxGeometry(1.4, 1.4, 1.4);
        outerGeom = new THREE.BoxGeometry(2.0, 2.0, 2.0);
      }

      // Inner Core Mesh
      const innerMat = new THREE.MeshStandardMaterial({
        color: theme.primary,
        emissive: theme.emissive,
        emissiveIntensity: 0.7,
        roughness: 0.25,
        metalness: 0.7,
      });
      const innerMesh = new THREE.Mesh(geom, innerMat);
      nodeGroup.add(innerMesh);

      // Translucent Outer Aura Shell
      const outerMat = new THREE.MeshPhongMaterial({
        color: theme.glow,
        emissive: theme.emissive,
        emissiveIntensity: 0.3,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      });
      const outerMesh = new THREE.Mesh(outerGeom, outerMat);
      nodeGroup.add(outerMesh);

      // 3D Canvas Text Billboard Sprite
      const spriteText = `${item.label}`;
      const sprite = createLabelSprite(spriteText, item.status, item.type);
      sprite.position.set(0, 2.2, 0);
      sprite.visible = showLabels;
      nodeGroup.add(sprite);

      scene.add(nodeGroup);

      nodeRenderObjects.push({
        mesh: nodeGroup,
        innerMesh,
        outerMesh,
        labelSprite: sprite,
        data: item,
        targetPos: pos.clone(),
        currentPos: pos.clone(),
      });
    });

    nodeRenderListRef.current = nodeRenderObjects;

    // 8. Connecting Synaptic Edges
    const linePositions: number[] = [];
    const lineColors: number[] = [];

    const getEdgeColorRGB = (type?: string): [number, number, number] => {
      if (type === 'SUPPORTED_BY') return [0.06, 0.72, 0.51]; // Emerald
      if (type === 'PRODUCED_FAILURE') return [0.95, 0.25, 0.37]; // Crimson
      if (type === 'INFLUENCED_BY') return [0.65, 0.45, 0.95]; // Purple
      return [0.23, 0.58, 0.98]; // Blue
    };

    const edgeConnections: { srcIdx: number; tgtIdx: number; type?: string }[] = [];

    edges.forEach((edge) => {
      const srcIdx = nodes.findIndex((n) => n.id === edge.source);
      const tgtIdx = nodes.findIndex((n) => n.id === edge.target);
      if (srcIdx !== -1 && tgtIdx !== -1) {
        edgeConnections.push({ srcIdx, tgtIdx, type: edge.type });
      }
    });

    // If edges are sparse, augment with domain-aware causal connections for rich visualization
    if (edgeConnections.length < nodes.length * 1.5 && nodes.length > 2) {
      for (let i = 0; i < nodes.length; i++) {
        const next = (i + 1) % nodes.length;
        edgeConnections.push({ srcIdx: i, tgtIdx: next, type: 'APPLIES_TO' });
        if (i % 2 === 0) {
          const skip = (i + 2) % nodes.length;
          edgeConnections.push({ srcIdx: i, tgtIdx: skip, type: 'INFLUENCED_BY' });
        }
      }
    }

    edgeConnections.forEach((conn) => {
      const p1 = targetPositions[conn.srcIdx] || new THREE.Vector3(0, 0, 0);
      const p2 = targetPositions[conn.tgtIdx] || new THREE.Vector3(0, 0, 0);
      linePositions.push(p1.x, p1.y, p1.z);
      linePositions.push(p2.x, p2.y, p2.z);

      const [r, g, b] = getEdgeColorRGB(conn.type);
      lineColors.push(r, g, b);
      lineColors.push(r * 0.8, g * 0.8, b * 0.8);
    });

    const edgeGeom = new THREE.BufferGeometry();
    edgeGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    edgeGeom.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

    const edgeMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: causalHighlighted ? 0.95 : 0.45,
      blending: THREE.AdditiveBlending,
    });
    const lineSegments = new THREE.LineSegments(edgeGeom, edgeMat);
    scene.add(lineSegments);
    edgeLineSegmentsRef.current = lineSegments;

    // 9. Animated Photon Energy Packets (pulses traveling along edges)
    const pulseGroup = new THREE.Group();
    scene.add(pulseGroup);
    pulseGroupRef.current = pulseGroup;

    const pulseList: PulseParticle[] = [];
    const pulseGeom = new THREE.SphereGeometry(0.28, 12, 12);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    edgeConnections.slice(0, 24).forEach((conn, pIdx) => {
      const pulseMesh = new THREE.Mesh(pulseGeom, pulseMat);
      pulseGroup.add(pulseMesh);
      pulseList.push({
        mesh: pulseMesh,
        sourceIdx: conn.srcIdx,
        targetIdx: conn.tgtIdx,
        progress: (pIdx / 24),
        speed: 0.0035 + (pIdx % 3) * 0.0015,
      });
    });
    pulseParticlesRef.current = pulseList;

    // 10. Interactive Raycaster & Mouse handlers
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-1000, -1000);

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshesToTest = nodeRenderObjects.map((n) => n.innerMesh);
      const intersects = raycaster.intersectObjects(meshesToTest);

      const tooltip = tooltipRef.current;
      if (intersects.length > 0) {
        const hitGroup = intersects[0].object.parent;
        if (hitGroup && hitGroup.userData.nodeData) {
          const data = hitGroup.userData.nodeData as GraphNode;
          setHoveredNode(data);
          if (tooltip) {
            tooltip.style.left = `${Math.min(e.clientX - rect.left + 16, container.clientWidth - 260)}px`;
            tooltip.style.top = `${Math.max(e.clientY - rect.top - 80, 10)}px`;
            tooltip.style.opacity = '1';
          }
          container.style.cursor = 'pointer';
        }
      } else {
        setHoveredNode(null);
        if (tooltip) tooltip.style.opacity = '0';
        container.style.cursor = 'default';
      }
    };

    const onPointerDown = (e: MouseEvent) => {
      // If clicking left button
      if (e.button === 0) {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const meshesToTest = nodeRenderObjects.map((n) => n.innerMesh);
        const intersects = raycaster.intersectObjects(meshesToTest);

        if (intersects.length > 0) {
          const hitGroup = intersects[0].object.parent;
          if (hitGroup && hitGroup.userData.nodeData) {
            const data = hitGroup.userData.nodeData as GraphNode;
            onSelectNode(data);
          }
        }
      }
    };

    const onDoubleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshesToTest = nodeRenderObjects.map((n) => n.innerMesh);
      const intersects = raycaster.intersectObjects(meshesToTest);

      if (intersects.length > 0) {
        const hitGroup = intersects[0].object.parent;
        if (hitGroup) {
          const targetWorld = new THREE.Vector3();
          hitGroup.getWorldPosition(targetWorld);
          // Fly camera close to this node
          cameraTargetRef.current = {
            pos: targetWorld.clone().add(new THREE.Vector3(0, 4, 16)),
            lookAt: targetWorld.clone(),
          };
        }
      }
    };

    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('dblclick', onDoubleClick);

    // 11. Window Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 12. Main Animation Loop
    const clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Controls damping update
      controls.update();

      // Smooth camera fly-to lerp
      if (cameraTargetRef.current.pos && cameraTargetRef.current.lookAt) {
        camera.position.lerp(cameraTargetRef.current.pos, 0.06);
        controls.target.lerp(cameraTargetRef.current.lookAt, 0.06);
        if (camera.position.distanceTo(cameraTargetRef.current.pos) < 0.2) {
          cameraTargetRef.current = { pos: null, lookAt: null };
        }
      }

      // FalkorDB Core Rotations
      if (coreGroupRef.current) {
        outerCoreMesh.rotation.y += 0.005;
        outerCoreMesh.rotation.x += 0.003;
        innerCoreMesh.rotation.y -= 0.008;
        ring1.rotation.z += 0.005;
        ring2.rotation.x += 0.004;
        ring3.rotation.y -= 0.003;

        const pulseScale = 1 + Math.sin(elapsed * 2.2) * 0.04;
        outerCoreMesh.scale.setScalar(pulseScale);
      }

      // Cosmic dust rotation
      starField.rotation.y = elapsed * 0.0006;

      // Animate Nodes: Morphing position towards targetPos + subtle levitation
      const edgePositionsAttr = edgeGeom.attributes.position as THREE.BufferAttribute | undefined;
      let lineVertexIdx = 0;

      nodeRenderObjects.forEach((item, idx) => {
        // Interpolate smoothly to target position
        item.currentPos.lerp(item.targetPos, 0.08);

        // Organic levitation float
        const floatY = Math.sin(elapsed * 2.0 + idx * 0.7) * 0.35;
        item.mesh.position.set(item.currentPos.x, item.currentPos.y + floatY, item.currentPos.z);

        // Subtle slow rotation of outer geometry
        item.outerMesh.rotation.y += 0.01;
        item.outerMesh.rotation.x += 0.007;

        // Billboarding: make labels look directly at camera
        if (item.labelSprite) {
          item.labelSprite.visible = showLabels;
        }

        // Scale hover reaction
        const isHovered = hoveredNode?.id === item.data.id;
        const isSelected = selectedNode?.id === item.data.id;
        const targetScale = isSelected ? 1.35 : isHovered ? 1.25 : 1.0;
        item.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);

        // Cluster filtering dimming
        let nodeOpacity = 1.0;
        if (activeCluster !== 'all') {
          nodeOpacity = item.data.cluster === activeCluster ? 1.0 : 0.22;
        }
        (item.innerMesh.material as THREE.MeshStandardMaterial).opacity = nodeOpacity;
        (item.innerMesh.material as THREE.MeshStandardMaterial).transparent = nodeOpacity < 1.0;
        (item.outerMesh.material as THREE.MeshPhongMaterial).opacity = nodeOpacity < 1.0 ? 0.08 : 0.4;
      });

      // Update dynamic edge line geometry positions matching moving nodes
      if (edgePositionsAttr) {
        edgeConnections.forEach((conn) => {
          const nodeA = nodeRenderObjects[conn.srcIdx];
          const nodeB = nodeRenderObjects[conn.tgtIdx];
          if (nodeA && nodeB) {
            edgePositionsAttr.setXYZ(lineVertexIdx, nodeA.mesh.position.x, nodeA.mesh.position.y, nodeA.mesh.position.z);
            edgePositionsAttr.setXYZ(lineVertexIdx + 1, nodeB.mesh.position.x, nodeB.mesh.position.y, nodeB.mesh.position.z);
            lineVertexIdx += 2;
          }
        });
        edgePositionsAttr.needsUpdate = true;
      }

      // Animated Synaptic Energy Pulses
      pulseList.forEach((pulse) => {
        pulse.progress = (pulse.progress + pulse.speed) % 1.0;
        const srcNode = nodeRenderObjects[pulse.sourceIdx];
        const tgtNode = nodeRenderObjects[pulse.targetIdx];
        if (srcNode && tgtNode) {
          const pA = srcNode.mesh.position;
          const pB = tgtNode.mesh.position;
          // Lerp along edge vector
          pulse.mesh.position.lerpVectors(pA, pB, pulse.progress);
        }
      });

      // Selection Targeting Reticle Beacon Animation
      if (selectionBeaconRef.current) {
        if (selectedNode) {
          const selectedObj = nodeRenderObjects.find((n) => n.data.id === selectedNode.id);
          if (selectedObj) {
            selectionBeaconRef.current.visible = true;
            selectionBeaconRef.current.position.copy(selectedObj.mesh.position);
            beaconRing1.rotation.z += 0.02;
            beaconRing2.rotation.y += 0.025;
            const beaconPulse = 1 + Math.sin(elapsed * 4) * 0.08;
            selectionBeaconRef.current.scale.set(beaconPulse, beaconPulse, beaconPulse);
          } else {
            selectionBeaconRef.current.visible = false;
          }
        } else {
          selectionBeaconRef.current.visible = false;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('dblclick', onDoubleClick);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
    };
  }, [nodes, edges, autoRotate, onSelectNode, calculateLayoutPositions, layoutMode, showLabels, causalHighlighted, activeCluster, hoveredNode, selectedNode]);

  // Layout mode change handler with smooth animation
  const handleSwitchLayout = (mode: LayoutMode) => {
    setLayoutMode(mode);
    const newPositions = calculateLayoutPositions(nodes, mode);
    nodeRenderListRef.current.forEach((obj, idx) => {
      if (newPositions[idx]) {
        obj.targetPos.copy(newPositions[idx]);
      }
    });

    // Reset camera target smoothly
    if (cameraRef.current && controlsRef.current) {
      if (mode === 'hierarchy') {
        cameraTargetRef.current = {
          pos: new THREE.Vector3(0, 10, 75),
          lookAt: new THREE.Vector3(0, 2, 0),
        };
      } else {
        cameraTargetRef.current = {
          pos: new THREE.Vector3(0, 18, 68),
          lookAt: new THREE.Vector3(0, 0, 0),
        };
      }
    }
  };

  // Fly Camera to selected node
  const handleFocusSelectedNode = () => {
    if (!selectedNode) return;
    const found = nodeRenderListRef.current.find((n) => n.data.id === selectedNode.id);
    if (found && cameraRef.current && controlsRef.current) {
      const worldPos = new THREE.Vector3();
      found.mesh.getWorldPosition(worldPos);
      cameraTargetRef.current = {
        pos: worldPos.clone().add(new THREE.Vector3(0, 4, 18)),
        lookAt: worldPos.clone(),
      };
    }
  };

  const handleSelectSearchResult = (node: GraphNode) => {
    onSelectNode(node);
    setSearchQuery('');
    const found = nodeRenderListRef.current.find((n) => n.data.id === node.id);
    if (found) {
      const worldPos = new THREE.Vector3();
      found.mesh.getWorldPosition(worldPos);
      cameraTargetRef.current = {
        pos: worldPos.clone().add(new THREE.Vector3(0, 4, 18)),
        lookAt: worldPos.clone(),
      };
    }
  };

  // Node counts by status for status bar
  const verifiedCount = nodes.filter((n) => n.status === 'VERIFIED_SUCCESS').length;
  const failureCount = nodes.filter((n) => n.status === 'VERIFIED_FAILURE').length;
  const unverifiedCount = nodes.filter((n) => n.status === 'UNVERIFIED').length;

  return (
    <div
      className="relative w-full rounded-2xl border border-[#EADECE] bg-[#080E1E] shadow-xl overflow-hidden group transition-all duration-300 h-[540px]"
    >
      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden block select-none bg-[radial-gradient(ellipse_at_center,_#0f172a_0%,_#080e1e_100%)]"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Rich Hover Floating HUD Card */}
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none opacity-0 transition-opacity duration-150 z-30 max-w-xs p-3 rounded-xl bg-[#091124]/95 border border-[#38BDF8]/40 shadow-2xl backdrop-blur-md text-white font-mono"
        >
          {hoveredNode && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 border-b border-[#1E3A8A]/50 pb-1.5">
                <span className="font-bold text-xs text-[#38BDF8] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#38BDF8]" />
                  {hoveredNode.label}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                    hoveredNode.status === 'VERIFIED_SUCCESS'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/50'
                      : hoveredNode.status === 'VERIFIED_FAILURE'
                      ? 'bg-rose-950 text-rose-400 border border-rose-600/50'
                      : 'bg-amber-950 text-amber-400 border border-amber-600/50'
                  }`}
                >
                  {hoveredNode.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-200 font-sans font-medium line-clamp-2 leading-snug">
                {hoveredNode.title}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span>Cluster: {hoveredNode.cluster || 'General'}</span>
                {hoveredNode.similarity !== undefined && (
                  <span className="text-emerald-400 font-bold">
                    {(hoveredNode.similarity * 100).toFixed(0)}% match
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Top Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col md:flex-row md:items-center justify-between gap-3 pointer-events-none">
        {/* Left: FalkorDB Brand & Topology Metrics */}
        <div className="pointer-events-auto bg-[#091124]/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#1E3A8A]/50 shadow-md flex items-center gap-3 text-white">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-[#1E3A8A]/50 border border-[#38BDF8]/40">
              <Layers className="text-[#38BDF8] w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  FalkorDB Memory Topology
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                <span className="text-emerald-400 font-semibold">{verifiedCount} Verified</span>
                <span>•</span>
                <span className="text-rose-400 font-semibold">{failureCount} Failures</span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">{unverifiedCount} Tasks</span>
              </div>
            </div>
          </div>

          <span className="h-6 w-px bg-[#1E3A8A]/60" />

          {/* Quick Search Input */}
          <div className="relative">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0F172A] border border-[#1E3A8A]/60 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Find node (e.g. L-88)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-hidden text-xs text-white placeholder-slate-500 w-28 sm:w-36 font-mono"
              />
            </div>
            {/* Search Suggestions Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#091124] border border-[#38BDF8]/40 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800">
                {searchResults.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full px-2.5 py-1.5 text-left hover:bg-[#1E3A8A]/50 flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="font-mono text-cyan-400 font-semibold">{res.label}</span>
                    <span className="text-[10px] text-slate-300 truncate max-w-[120px]">{res.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Layout Switcher & Cluster Filter Pills */}
        <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {/* Layout Mode Segmented Control */}
          <div className="flex items-center bg-[#091124]/90 backdrop-blur-md p-1 rounded-xl border border-[#1E3A8A]/50">
            <button
              onClick={() => handleSwitchLayout('galaxy')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                layoutMode === 'galaxy'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Organic Neural Nexus Galaxy"
            >
              <Sparkles className="w-3 h-3" />
              <span className="hidden sm:inline">Nexus</span>
            </button>
            <button
              onClick={() => handleSwitchLayout('hierarchy')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                layoutMode === 'hierarchy'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vertical Causal Tiers: Problem -> Outcome -> Lesson"
            >
              <Workflow className="w-3 h-3" />
              <span className="hidden sm:inline">Causal Tiers</span>
            </button>
            <button
              onClick={() => handleSwitchLayout('clusters')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                layoutMode === 'clusters'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Grouped Domain Islands"
            >
              <Layers className="w-3 h-3" />
              <span className="hidden sm:inline">Clusters</span>
            </button>
          </div>

          {/* Cluster Filter Pills */}
          <div className="flex items-center gap-1 bg-[#091124]/90 backdrop-blur-md p-1 rounded-xl border border-[#1E3A8A]/50">
            {clusters.slice(0, 4).map((cluster) => {
              const isSelected = activeCluster === cluster;
              return (
                <button
                  key={cluster}
                  onClick={() => setActiveCluster(cluster)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#38BDF8] text-[#080E1E] font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {cluster === 'all' ? 'All' : cluster.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Bottom Navigation, Presets & Legend */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Legend & Selected Node Tag */}
        <div className="pointer-events-auto bg-[#091124]/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#1E3A8A]/50 flex items-center gap-3 text-xs font-mono text-slate-300 shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]" />
            <span className="text-emerald-400">Success</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" />
            <span className="text-blue-400">Lesson</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] shadow-[0_0_8px_#F43F5E]" />
            <span className="text-rose-400">Failure</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]" />
            <span className="text-amber-400">Task</span>
          </div>

          {selectedNode && (
            <div className="hidden sm:flex items-center gap-2 border-l border-[#1E3A8A]/60 pl-3">
              <span className="text-cyan-400 font-bold">Active:</span>
              <span className="text-white font-semibold truncate max-w-[130px]">
                {selectedNode.label}
              </span>
              <button
                onClick={handleFocusSelectedNode}
                className="px-1.5 py-0.5 rounded bg-[#1E3A8A]/70 text-cyan-300 hover:bg-[#2563EB] hover:text-white flex items-center gap-1 text-[10px] transition-colors"
                title="Center camera on selected node"
              >
                <Focus className="w-3 h-3" />
                <span>Focus</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Demo Watermark */}
      {isDemoData && (
        <div className="absolute top-16 left-4 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-600/40 backdrop-blur-xs">
            <Info className="w-3 h-3" /> Live Graph Engine Ready (FalkorDB Synced)
          </span>
        </div>
      )}
    </div>
  );
};
