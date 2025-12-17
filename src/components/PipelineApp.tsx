"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Settings,
  X,
  CheckCircle2,
  GitMerge,
  Split,
  Clock,
  Trash2,
  Plus,
  Layout,
  Copy,
  ChevronDown,
  ChevronUp,
  Terminal,
  User,
  Users,
  Layers,
  Link as LinkIcon,
  Workflow,
  Check,
  Undo,
  Redo,
  GripHorizontal,
  Loader2,
} from "lucide-react";

// --- STYLING CONSTANTS ---
const NODE_WIDTH = 260;
const NODE_HEIGHT = 150;

// --- TYPES ---
type NodeStatus = "pending" | "running" | "completed" | "skipped";
type NodeType = "start" | "condition" | "merge" | "stage" | "subflow" | "end";
type EdgeType = "default" | "true" | "false";
type DragKind = NodeType | "atomic-task";

interface Task {
  id: string;
  name: string;
  command: string;
  assignee: string;
  status: NodeStatus;
}

interface PipelineNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  label: string;
  status: NodeStatus;
  tasks?: Task[];
  targetPipelineId?: string; // For subflow
}

interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
}

interface Pipeline {
  id: string;
  name: string;
  remoteId?: string; // id in the backend database
  onSuccessPipelineId: string;
  status: "idle" | "running";
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

interface DragState {
  id: string;
  startX: number;
  startY: number;
  initialNodeX: number;
  initialNodeY: number;
}

interface ConnectingState {
  sourceId: string;
  type: EdgeType;
}

// --- UTILS ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- INITIAL DATA ---
const INITIAL_PIPELINES: Pipeline[] = [
  {
    id: "p1",
    name: "Production Deploy",
    onSuccessPipelineId: "",
    status: "idle",
    nodes: [
      {
        id: "s1",
        type: "stage",
        x: 50,
        y: 150,
        label: "Build & Unit Test",
        status: "pending",
        tasks: [
          {
            id: "t1",
            name: "Checkout Code",
            command: "git pull origin main",
            assignee: "System",
            status: "pending",
          },
          {
            id: "t2",
            name: "Install Dependencies",
            command: "npm install",
            assignee: "System",
            status: "pending",
          },
          {
            id: "t3",
            name: "Run Unit Tests",
            command: "npm test",
            assignee: "DevOps Bot",
            status: "pending",
          },
        ],
      },
      {
        id: "s2",
        type: "stage",
        x: 400,
        y: 50,
        label: "Security Scan",
        status: "pending",
        tasks: [
          {
            id: "t1",
            name: "SAST Scan",
            command: "run-sast",
            assignee: "SecOps",
            status: "pending",
          },
        ],
      },
      {
        id: "s3",
        type: "stage",
        x: 400,
        y: 250,
        label: "Integration Tests",
        status: "pending",
        tasks: [
          {
            id: "t1",
            name: "Deploy to Staging",
            command: "helm upgrade staging",
            assignee: "DevOps",
            status: "pending",
          },
          {
            id: "t2",
            name: "Run Cypress",
            command: "npm run e2e",
            assignee: "QA Lead",
            status: "pending",
          },
        ],
      },
      {
        id: "s4",
        type: "merge",
        x: 750,
        y: 150,
        label: "Gate",
        status: "pending",
      },
      {
        id: "s5",
        type: "stage",
        x: 950,
        y: 150,
        label: "Deploy to Prod",
        status: "pending",
        tasks: [
          {
            id: "t1",
            name: "Manual Approval",
            command: "wait-for-approval",
            assignee: "Manager",
            status: "pending",
          },
          {
            id: "t2",
            name: "Promote Image",
            command: "docker push prod",
            assignee: "System",
            status: "pending",
          },
          {
            id: "t3",
            name: "Apply K8s",
            command: "kubectl apply -f prod.yaml",
            assignee: "Admin",
            status: "pending",
          },
        ],
      },
    ],
    edges: [
      { id: "e1", source: "s1", target: "s2", type: "default" },
      { id: "e2", source: "s1", target: "s3", type: "default" },
      { id: "e3", source: "s2", target: "s4", type: "default" },
      { id: "e4", source: "s3", target: "s4", type: "default" },
      { id: "e5", source: "s4", target: "s5", type: "default" },
    ],
  },
];

// --- MAIN COMPONENT ---
export default function PipelineApp() {
  // --- STATE ---
  const [pipelines, setPipelines] = useState<Pipeline[]>(INITIAL_PIPELINES);
  const [activePipelineId, setActivePipelineId] = useState<string>("p1");

  // Undo/Redo State
  const [history, setHistory] = useState<Pipeline[][]>([]);
  const [redoStack, setRedoStack] = useState<Pipeline[][]>([]);

  const [pipelineStatus, setPipelineStatus] = useState<"idle" | "running">(
    "idle",
  );
  const [logs, setLogs] = useState<string[]>([]);
  const [logsMinimized, setLogsMinimized] = useState(false);
  const [, setAutoRunNext] = useState(false);
  const [serverRunId, setServerRunId] = useState<string | null>(null);
  const [serverRunStatus, setServerRunStatus] = useState<
    "idle" | "running" | "completed" | "failed"
  >("idle");

  // UI State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showPipelineSettings, setShowPipelineSettings] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [connectingState, setConnectingState] =
    useState<ConnectingState | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [draggedTaskIndex, setDraggedTaskIndex] = useState<number | null>(
    null,
  );

  const canvasRef = useRef<HTMLDivElement | null>(null);

  // --- HELPERS (CONTEXT AWARE) ---
  const activePipeline =
    pipelines.find((p) => p.id === activePipelineId) || pipelines[0];
  const currentNodes = activePipeline.nodes;
  const currentEdges = activePipeline.edges;

  // Determine if we should show the sidebar
  const selectedNode = selectedNodeId
    ? currentNodes.find((n) => n.id === selectedNodeId) || null
    : null;
  const isSidebarOpen = !!selectedNode || showPipelineSettings;

  const addLog = (msg: string) =>
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const addServerLog = (msg: string) =>
    setLogs((prev) => [
      `[SERVER ${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev,
    ]);

  // --- HISTORY MANAGEMENT ---
  const addToHistory = useCallback(() => {
    const snapshot = JSON.parse(JSON.stringify(pipelines)) as Pipeline[];
    setHistory((prev) => [...prev, snapshot]);
    setRedoStack([]);
  }, [pipelines]);

  const undo = useCallback(() => {
    setHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;
      const previousState = prevHistory[prevHistory.length - 1];
      const newHistory = prevHistory.slice(0, -1);
      setRedoStack((prev) => [pipelines, ...prev]);
      setPipelines(previousState);
      return newHistory;
    });
  }, [pipelines]);

  const redo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const [nextState, ...newRedoStack] = prevRedo;
      setHistory((prev) => [...prev, pipelines]);
      setPipelines(nextState);
      return newRedoStack;
    });
  }, [pipelines]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // --- ACTIONS: GENERAL ---
  const updateGraph = (
    nodeUpdater?: (nodes: PipelineNode[]) => PipelineNode[],
    edgeUpdater?: (edges: PipelineEdge[]) => PipelineEdge[],
  ) => {
    setPipelines((prev) =>
      prev.map((p) =>
        p.id !== activePipelineId
          ? p
          : {
              ...p,
              nodes: nodeUpdater ? nodeUpdater(p.nodes) : p.nodes,
              edges: edgeUpdater ? edgeUpdater(p.edges) : p.edges,
            },
      ),
    );
  };

  // --- ACTIONS: NODES ---
  const addNode = (type: NodeType, pos?: { x: number; y: number }) => {
    addToHistory();
    const id = generateId();
    const position = pos || { x: 100, y: 100 };

    updateGraph((nodes) => [
      ...nodes,
      {
        id,
        type,
        x: position.x,
        y: position.y,
        label: `New ${
          type === "stage" ? "Stage" : type === "subflow" ? "Sub-Pipeline" : type
        }`,
        tasks: [],
        targetPipelineId: "",
        status: "pending",
      },
    ]);
    setSelectedNodeId(id);
    setShowPipelineSettings(false);
  };

  const updateNode = (id: string, updates: Partial<PipelineNode>) => {
    updateGraph((nodes) => nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const deleteNode = (id: string) => {
    const node = currentNodes.find((n) => n.id === id);
    const hasTasks = node?.tasks && node.tasks.length > 0;
    const hasEdges =
      currentEdges.some((e) => e.source === id || e.target === id) || false;

    if (
      (hasTasks || hasEdges) &&
      // eslint-disable-next-line no-alert
      !window.confirm(
        "This stage has tasks or connections. Delete it and all its connections?",
      )
    ) {
      return;
    }

    addToHistory();
    updateGraph(
      (nodes) => nodes.filter((n) => n.id !== id),
      (edges) => edges.filter((e) => e.source !== id && e.target !== id),
    );
    setSelectedNodeId(null);
  };

  // --- ACTIONS: ATOMIC TASKS ---
  const addTaskToStage = (stageId: string) => {
    const stage = currentNodes.find((n) => n.id === stageId);
    if (!stage) return;
    addToHistory();
    const newTask: Task = {
      id: generateId(),
      name: "New Task",
      command: "",
      assignee: "",
      status: "pending",
    };
    updateNode(stageId, { tasks: [...(stage.tasks || []), newTask] });
    setEditingTaskId(newTask.id);
  };

  const updateTask = (
    stageId: string,
    taskId: string,
    field: keyof Task,
    value: string,
  ) => {
    const stage = currentNodes.find((n) => n.id === stageId);
    if (!stage || !stage.tasks) return;
    const newTasks = stage.tasks.map((t) =>
      t.id === taskId ? { ...t, [field]: value } : t,
    );
    updateNode(stageId, { tasks: newTasks });
  };

  const deleteTask = (stageId: string, taskId: string) => {
    const stage = currentNodes.find((n) => n.id === stageId);
    if (!stage || !stage.tasks) return;
    addToHistory();
    updateNode(stageId, {
      tasks: stage.tasks.filter((t) => t.id !== taskId),
    });
  };

  const handleTaskDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    setDraggedTaskIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleTaskDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetIndex: number,
    stageId: string,
  ) => {
    e.preventDefault();
    if (draggedTaskIndex === null || draggedTaskIndex === targetIndex) return;
    addToHistory();
    const stage = currentNodes.find((n) => n.id === stageId);
    if (!stage || !stage.tasks) return;
    const newTasks = [...stage.tasks];
    const [draggedItem] = newTasks.splice(draggedTaskIndex, 1);
    newTasks.splice(targetIndex, 0, draggedItem);
    updateNode(stageId, { tasks: newTasks });
    setDraggedTaskIndex(null);
  };

  // --- ACTIONS: PIPELINE ---
  const addPipeline = () => {
    addToHistory();
    const newId = generateId();
    const s1Id = generateId();
    setPipelines((prev) => [
      ...prev,
      {
        id: newId,
        name: `Pipeline ${prev.length + 1}`,
        onSuccessPipelineId: "",
        status: "idle",
        nodes: [
          {
            id: s1Id,
            type: "stage",
            x: 50,
            y: 150,
            label: "Start Stage",
            status: "pending",
            tasks: [],
          },
        ],
        edges: [],
      },
    ]);
    setActivePipelineId(newId);
  };

  const deletePipeline = (
    e: React.MouseEvent<HTMLButtonElement>,
    id: string,
  ) => {
    e.stopPropagation();
    if (pipelines.length === 1) return;

    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(
      'Delete this pipeline and all its stages? This action cannot be undone (except via "Undo" if still available).',
    );
    if (!confirmed) return;

    addToHistory();
    const newPipelines = pipelines.filter((p) => p.id !== id);
    setPipelines(newPipelines);
    if (activePipelineId === id && newPipelines[0]) {
      setActivePipelineId(newPipelines[0].id);
    }
  };

  const duplicatePipeline = () => {
    addToHistory();
    const newId = generateId();
    const pipelineClone: Pipeline = JSON.parse(
      JSON.stringify(activePipeline),
    ) as Pipeline;
    pipelineClone.id = newId;
    pipelineClone.name = `${activePipeline.name} (Copy)`;
    pipelineClone.status = "idle";
    pipelineClone.onSuccessPipelineId = "";
    pipelineClone.nodes = pipelineClone.nodes.map((n) => ({
      ...n,
      status: "pending",
      tasks: n.tasks ? n.tasks.map((t) => ({ ...t, status: "pending" })) : [],
    }));
    setPipelines((prev) => [...prev, pipelineClone]);
    setActivePipelineId(newId);
  };

  const updatePipelineSettings = (updates: Partial<Pipeline>) => {
    setPipelines((prev) =>
      prev.map((p) => (p.id === activePipelineId ? { ...p, ...updates } : p)),
    );
  };

  // --- BACKEND INTEGRATION ---
  const saveActivePipelineToServer = useCallback(async () => {
    if (!activePipeline) return;
    try {
      const response = await fetch("/api/pipelines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: activePipeline.remoteId,
          name: activePipeline.name,
          definition: {
            id: activePipeline.id,
            name: activePipeline.name,
            nodes: activePipeline.nodes,
            edges: activePipeline.edges,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        addServerLog(`❌ Failed to save pipeline: ${errorText}`);
        return;
      }

      const saved = (await response.json()) as { id: string; name: string };

      setPipelines((prev) =>
        prev.map((p) =>
          p.id === activePipeline.id ? { ...p, remoteId: saved.id } : p,
        ),
      );
      addServerLog("✅ Pipeline saved to server");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addServerLog(`❌ Error saving pipeline: ${message}`);
    }
  }, [activePipeline, addServerLog]);

  const pollServerRunLogs = useCallback(
    async (runId: string) => {
      setServerRunStatus("running");
      setServerRunId(runId);

      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const res = await fetch(`/api/runs/${runId}/logs`);
          if (!res.ok) {
            const text = await res.text();
            addServerLog(`❌ Failed to fetch run logs: ${text}`);
            break;
          }
          const data = (await res.json()) as {
            status: "queued" | "running" | "completed" | "failed";
            logs: { id: string; message: string }[];
          };

          setServerRunStatus(data.status === "queued" ? "running" : data.status);

          // Replace server log section based on latest backend logs
          const newServerLogs = [...data.logs]
            .sort((a, b) => (a.id > b.id ? 1 : -1))
            .map((l) => `[SERVER LOG] ${l.message}`)
            .reverse();

          setLogs((prev) => {
            // Keep non-server logs and prepend new server logs
            const filtered = prev.filter((line) => !line.startsWith("[SERVER LOG]"));
            return [...newServerLogs, ...filtered];
          });

          if (data.status === "completed" || data.status === "failed") {
            addServerLog(
              data.status === "completed"
                ? "🏁 Server pipeline finished"
                : "🔥 Server pipeline failed",
            );
            break;
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          addServerLog(`❌ Error while polling logs: ${message}`);
          break;
        }

        // eslint-disable-next-line no-await-in-loop
        await sleep(2000);
      }

      setServerRunStatus("idle");
    },
    [addServerLog],
  );

  const runPipelineOnServer = useCallback(async () => {
    if (!activePipeline) return;

    try {
      // Ensure it is saved and has a remote id
      if (!activePipeline.remoteId) {
        await saveActivePipelineToServer();
      }

      const refreshed = pipelines.find((p) => p.id === activePipeline.id);
      if (!refreshed?.remoteId) {
        addServerLog("❌ Cannot run on server: pipeline not saved.");
        return;
      }

      addServerLog("🚀 Sending run request to server...");

      const res = await fetch("/api/run-pipeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pipelineId: refreshed.remoteId }),
      });

      if (!res.ok) {
        const text = await res.text();
        addServerLog(`❌ Failed to start server run: ${text}`);
        return;
      }

      const payload = (await res.json()) as { runId: string };
      addServerLog(`✅ Server run started (runId=${payload.runId})`);
      void pollServerRunLogs(payload.runId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addServerLog(`❌ Error starting server run: ${message}`);
    }
  }, [
    activePipeline,
    addServerLog,
    pipelines,
    pollServerRunLogs,
    saveActivePipelineToServer,
  ]);

  // --- DRAG & DROP ---
  const onDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    type: DragKind,
  ) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    [],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(
        "application/reactflow",
      ) as DragKind | "";
      if (!type) return;

      const bounds = canvasRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const x = event.clientX - bounds.left - NODE_WIDTH / 2;
      const y = event.clientY - bounds.top - NODE_HEIGHT / 2;

      if (type === "atomic-task") {
        const mouseX = event.clientX - bounds.left;
        const mouseY = event.clientY - bounds.top;

        const hitNode = currentNodes.find(
          (node) =>
            node.type === "stage" &&
            mouseX >= node.x &&
            mouseX <= node.x + NODE_WIDTH &&
            mouseY >= node.y &&
            mouseY <= node.y + 200,
        );

        if (hitNode) {
          addTaskToStage(hitNode.id);
          setSelectedNodeId(hitNode.id);
        } else {
          // eslint-disable-next-line no-alert
          alert("Drop Tasks onto a Stage to add them.");
        }
        return;
      }

      addNode(type as NodeType, { x, y });
    },
    [currentNodes, addTaskToStage, addNode],
  );

  // --- CANVAS EVENTS (SMOOTH DRAG) ---
  const updateNodeRef = useRef(updateNode);
  updateNodeRef.current = updateNode;

  useEffect(() => {
    if (!dragState) return;

    const handleWindowMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const newX = dragState.initialNodeX + dx;
      const newY = dragState.initialNodeY + dy;
      updateNodeRef.current(dragState.id, { x: newX, y: newY });
    };

    const handleWindowUp = () => setDragState(null);

    window.addEventListener("mousemove", handleWindowMove);
    window.addEventListener("mouseup", handleWindowUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMove);
      window.removeEventListener("mouseup", handleWindowUp);
    };
  }, [dragState]);

  const handleMouseDownNode = (
    e: React.MouseEvent<HTMLDivElement>,
    id: string,
  ) => {
    e.stopPropagation();
    if (pipelineStatus === "running") return;
    addToHistory();
    setSelectedNodeId(id);
    setEditingTaskId(null);
    setShowPipelineSettings(false);

    const node = currentNodes.find((n) => n.id === id);
    if (!node) return;

    setDragState({
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialNodeX: node.x,
      initialNodeY: node.y,
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleCanvasMouseUp = () => {
    setConnectingState(null);
  };

  const startConnection = (
    e: React.MouseEvent<HTMLDivElement>,
    nodeId: string,
    type: EdgeType = "default",
  ) => {
    e.stopPropagation();
    if (pipelineStatus !== "running") {
      setConnectingState({ sourceId: nodeId, type });
    }
  };

  const completeConnection = (
    e: React.MouseEvent<HTMLDivElement>,
    targetId: string,
  ) => {
    e.stopPropagation();
    if (!connectingState || pipelineStatus === "running") return;
    if (connectingState.sourceId === targetId) return;

    const sourceNode = currentNodes.find(
      (n) => n.id === connectingState.sourceId,
    );
    const targetNode = currentNodes.find((n) => n.id === targetId);

    // Basic guards to avoid confusing connections
    if (!sourceNode || !targetNode) return;
    if (sourceNode.type === "end") return; // cannot connect from end
    if (targetNode.type === "start") return; // cannot connect into start

    addToHistory();
    updateGraph(undefined, (prevEdges) => {
      const exists = prevEdges.find(
        (edge) =>
          edge.source === connectingState.sourceId &&
          edge.target === targetId,
      );
      if (exists) return prevEdges;
      return [
        ...prevEdges,
        {
          id: generateId(),
          source: connectingState.sourceId,
          target: targetId,
          type: connectingState.type,
        },
      ];
    });
    setConnectingState(null);
  };

  // --- ENGINE ---
  const updateTaskStatus = (
    stageId: string,
    taskId: string,
    status: NodeStatus,
  ) => {
    setPipelines((prev) =>
      prev.map((p) =>
        p.id !== activePipelineId
          ? p
          : {
              ...p,
              nodes: p.nodes.map((n) =>
                n.id === stageId
                  ? {
                      ...n,
                      tasks: n.tasks?.map((t) =>
                        t.id === taskId ? { ...t, status } : t,
                      ),
                    }
                  : n,
              ),
            },
      ),
    );
  };

  const updateStatusUI = (nodeId: string, status: NodeStatus | "skipped") => {
    setPipelines((prev) =>
      prev.map((p) =>
        p.id !== activePipelineId
          ? p
          : {
              ...p,
              nodes: p.nodes.map((n) =>
                n.id === nodeId ? { ...n, status } : n,
              ),
            },
      ),
    );
  };

  const runGraph = async (
    graphNodes: PipelineNode[],
    graphEdges: PipelineEdge[],
  ) => {
    const nodesSnapshot: PipelineNode[] = graphNodes.map((n) => ({
      ...n,
      status: "pending",
    }));
    const statusMap: Record<string, NodeStatus | "skipped"> = {};
    nodesSnapshot.forEach((n) => {
      statusMap[n.id] = "pending";
    });

    const getReadyNodes = () =>
      nodesSnapshot.filter((node) => {
        if (statusMap[node.id] !== "pending") return false;
        const parents = graphEdges.filter((e) => e.target === node.id);
        if (parents.length === 0) return true;
        return parents.every(
          (p) =>
            statusMap[p.source] === "completed" ||
            statusMap[p.source] === "skipped",
        );
      });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const readyNodes = getReadyNodes();
      if (readyNodes.length === 0) {
        if (!nodesSnapshot.some((n) => statusMap[n.id] === "running")) break;
        // wait briefly
        // eslint-disable-next-line no-await-in-loop
        await sleep(100);
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await Promise.all(
        readyNodes.map(async (node) => {
          const parents = graphEdges.filter((e) => e.target === node.id);
          const allSkipped =
            parents.length > 0 &&
            parents.every((p) => statusMap[p.source] === "skipped");

          if (allSkipped) {
            statusMap[node.id] = "skipped";
            updateStatusUI(node.id, "skipped");
            addLog(`  ⏭ Skipped Node: ${node.label}`);
            return;
          }

          statusMap[node.id] = "running";
          updateStatusUI(node.id, "running");

          if (node.type === "stage") {
            addLog(`📂 Stage: "${node.label}" Started`);

            if (node.tasks && node.tasks.length > 0) {
              for (const task of node.tasks) {
                updateTaskStatus(node.id, task.id, "running");
                addLog(`  🔨 Task Exec: ${task.name}`);
                // simulate work
                // eslint-disable-next-line no-await-in-loop
                await sleep(800 + Math.random() * 500);
                updateTaskStatus(node.id, task.id, "completed");
                if (task.command) {
                  addLog(`    > ${task.command} (Done)`);
                }
              }
            } else {
              // eslint-disable-next-line no-await-in-loop
              await new Promise((r) => setTimeout(r, 1000));
            }
          } else if (node.type === "subflow") {
            const target = pipelines.find(
              (p) => p.id === node.targetPipelineId,
            );
            addLog(
              `  🔄 Triggering Sub-Pipeline: ${
                target ? target.name : "Unknown"
              }`,
            );
            // eslint-disable-next-line no-await-in-loop
            await sleep(1500);
          } else {
            addLog(`  Processing: ${node.label}`);
            // eslint-disable-next-line no-await-in-loop
            await sleep(1000);
          }

          let decision: "true" | "false" | null = null;
          if (node.type === "condition") {
            decision = Math.random() > 0.5 ? "true" : "false";
            addLog(`  🔀 Condition: ${decision.toUpperCase()}`);
          }

          statusMap[node.id] = "completed";
          updateStatusUI(node.id, "completed");
          if (node.type === "stage") {
            addLog(`✅ Stage: "${node.label}" Completed`);
          }

          if (node.type === "condition" && decision) {
            statusMap[`${node.id}_decision`] = decision as NodeStatus;
          }
        }),
      );
    }
  };

  const runPipeline = async () => {
    if (pipelineStatus === "running") return;
    setPipelineStatus("running");
    setLogs([]);
    if (logsMinimized) setLogsMinimized(false);

    addLog(`🚀 Starting Pipeline: ${activePipeline.name}`);

    // Reset all nodes & tasks
    setPipelines((prev) =>
      prev.map((p) =>
        p.id !== activePipelineId
          ? p
          : {
              ...p,
              status: "running",
              nodes: p.nodes.map((n) => ({
                ...n,
                status: "pending",
                tasks: n.tasks
                  ? n.tasks.map((t) => ({ ...t, status: "pending" }))
                  : [],
              })),
            },
      ),
    );

    await sleep(600);
    await runGraph(activePipeline.nodes, activePipeline.edges);

    setPipelineStatus("idle");
    addLog(`🏁 Pipeline "${activePipeline.name}" Finished.`);

    if (activePipeline.onSuccessPipelineId) {
      const nextP = pipelines.find(
        (p) => p.id === activePipeline.onSuccessPipelineId,
      );
      if (nextP) {
        addLog(`🔗 Chaining: Triggering "${nextP.name}"...`);
        setTimeout(() => {
          setActivePipelineId(nextP.id);
          setAutoRunNext(true);
        }, 1500);
      }
    }
  };

  return (
    <div className="flex h-screen w-full flex-col font-sans text-slate-900 bg-slate-100 overflow-hidden">
      {/* HEADER & PIPELINE TABS */}
      <div className="bg-white border-b flex flex-col shadow-sm z-20 relative">
        <div className="h-14 flex items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <GitMerge size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">
                FlowForge Enterprise
              </h1>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={history.length === 0}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                history.length === 0
                  ? "text-slate-300"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo size={14} /> Undo
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                redoStack.length === 0
                  ? "text-slate-300"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo size={14} /> Redo
            </button>
            <button
              onClick={duplicatePipeline}
              className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md text-xs font-medium transition-colors"
            >
              <Copy size={14} /> Duplicate
            </button>
            <button
              onClick={saveActivePipelineToServer}
              className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md text-xs font-medium transition-colors"
            >
              <CheckCircle2 size={14} /> Save
            </button>
            <button
              onClick={() => {
                setShowPipelineSettings(true);
                setSelectedNodeId(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 rounded-md text-xs font-medium transition-colors ${
                showPipelineSettings ? "text-blue-600 bg-slate-100" : "text-slate-600"
              }`}
              title="Pipeline Settings"
            >
              <Settings size={14} /> Settings
            </button>
            <button
              onClick={runPipeline}
              disabled={pipelineStatus === "running"}
              className={`flex items-center gap-2 px-6 py-1.5 rounded-md text-sm font-bold text-white transition-all shadow-md ml-2 ${
                pipelineStatus === "running"
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95"
              }`}
            >
              {pipelineStatus === "running" ? (
                <Clock size={16} className="animate-spin" />
              ) : (
                <Play size={16} />
              )}
              {pipelineStatus === "running" ? "Running..." : "Run Pipeline"}
            </button>
            <button
              onClick={runPipelineOnServer}
              disabled={serverRunStatus === "running"}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold border ml-2 transition-all ${
                serverRunStatus === "running"
                  ? "border-amber-300 text-amber-500 bg-amber-50 cursor-wait"
                  : "border-slate-300 text-slate-600 bg-white hover:bg-slate-100"
              }`}
              title="Run this pipeline on the backend server"
            >
              <Terminal size={14} />
              {serverRunStatus === "running" ? "Server Running..." : "Run on Server"}
            </button>
          </div>
        </div>

        {/* Pipeline Tabs */}
        <div className="flex items-center px-4 pt-2 gap-2 bg-slate-50 overflow-x-auto">
          {pipelines.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                setActivePipelineId(p.id);
                setSelectedNodeId(null);
                setShowPipelineSettings(false);
              }}
              className={`group flex items-center gap-2 px-4 py-2 rounded-t-lg border-t border-x cursor-pointer select-none text-sm transition-all min-w-[120px] max-w-[200px] ${
                activePipelineId === p.id
                  ? "bg-white border-slate-300 text-blue-600 font-bold relative -mb-[1px] z-10"
                  : "bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200"
              }`}
            >
              <Layout
                size={14}
                className={
                  activePipelineId === p.id ? "text-blue-500" : "opacity-50"
                }
              />
              <span className="truncate flex-1">{p.name}</span>

              {pipelines.length > 1 && (
                <button
                  onClick={(e) => deletePipeline(e, p.id)}
                  className={`p-1 rounded-full hover:bg-red-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ${
                    activePipelineId === p.id ? "opacity-100" : ""
                  }`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addPipeline}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors mb-1 ml-1"
            title="New Pipeline"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR: STAGE FACTORY */}
        <div className="w-64 bg-slate-50 border-r flex flex-col z-20 transition-all duration-300">
          <div className="p-4 border-b">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Stage Factory
            </h2>
            <div className="grid gap-3">
              <button
                draggable
                onDragStart={(e) => onDragStart(e, "stage")}
                className="p-3 bg-white border rounded shadow-sm hover:border-blue-400 text-left flex items-center gap-3 transition-colors cursor-grab"
              >
                <Layers size={16} className="text-blue-500" />{" "}
                <span>Stage (Container)</span>
              </button>
              <button
                draggable
                onDragStart={(e) => onDragStart(e, "condition")}
                className="p-3 bg-white border rounded shadow-sm hover:border-amber-400 text-left flex items-center gap-3 transition-colors cursor-grab"
              >
                <Split size={16} className="text-amber-500" />{" "}
                <span>Condition Rule</span>
              </button>
              <button
                draggable
                onDragStart={(e) => onDragStart(e, "merge")}
                className="p-3 bg-white border rounded shadow-sm hover:border-purple-400 text-left flex items-center gap-3 transition-colors cursor-grab"
              >
                <GitMerge size={16} className="text-purple-500" />{" "}
                <span>Merge Point</span>
              </button>
              <button
                draggable
                onDragStart={(e) => onDragStart(e, "subflow")}
                className="p-3 bg-white border rounded shadow-sm hover:border-indigo-400 text-left flex items-center gap-3 transition-colors cursor-grab"
              >
                <Workflow size={16} className="text-indigo-500" />{" "}
                <span>Sub-Pipeline</span>
              </button>

              <div className="mt-4 pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Task Components
                </h3>
                <button
                  draggable
                  onDragStart={(e) => onDragStart(e, "atomic-task")}
                  className="w-full p-3 bg-white border border-dashed border-slate-400 rounded shadow-sm hover:border-blue-500 hover:text-blue-600 text-left flex items-center gap-3 transition-colors cursor-grab"
                >
                  <Terminal size={16} /> <span>Atomic Task</span>
                </button>
                <p className="text-[10px] text-slate-400 mt-2 px-1">
                  Drag "Atomic Task" directly onto a Stage in the canvas to add
                  it.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CANVAS AREA */}
        <div
          className="flex-1 relative overflow-hidden bg-slate-100 cursor-move"
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {/* BACKGROUND GRID */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: "radial-gradient(#475569 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* SVG LAYER (EDGES) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
              </marker>
            </defs>
            {currentEdges.map((edge) => {
              const src = currentNodes.find((n) => n.id === edge.source);
              const tgt = currentNodes.find((n) => n.id === edge.target);
              if (!src || !tgt) return null;

              const x1 = src.x + NODE_WIDTH;
              const y1 = src.y + 50;
              let finalY1 = y1;

              if (src.type === "condition") {
                if (edge.type === "true") finalY1 = src.y + 35;
                if (edge.type === "false") finalY1 = src.y + 105;
              }

              const x2 = tgt.x;
              const y2 = tgt.y + 50;

              const isSourceActive =
                src.status === "completed" || src.status === "running";
              const edgeColor =
                edge.type === "true"
                  ? "#10b981"
                  : edge.type === "false"
                  ? "#ef4444"
                  : "#94a3b8";
              const edgeWidth = isSourceActive ? 3 : 2;

              return (
                <g key={edge.id}>
                  <path
                    d={`M ${x1} ${finalY1} C ${x1 + 80} ${finalY1}, ${
                      x2 - 80
                    } ${y2}, ${x2} ${y2}`}
                    stroke={isSourceActive ? "#6366f1" : edgeColor}
                    strokeWidth={edgeWidth}
                    fill="none"
                    markerEnd="url(#arrowhead)"
                    className={
                      isSourceActive ? "transition-colors duration-500" : ""
                    }
                    strokeDasharray={isSourceActive ? "10,5" : ""}
                  />
                  {(edge.type === "true" || edge.type === "false") && (
                    <text
                      x={(x1 + x2) / 2}
                      y={(finalY1 + y2) / 2 - 10}
                      textAnchor="middle"
                      fill={edgeColor}
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {edge.type.toUpperCase()}
                    </text>
                  )}
                </g>
              );
            })}
            {connectingState && (
              <path
                d={(() => {
                  const src = currentNodes.find(
                    (n) => n.id === connectingState.sourceId,
                  );
                  if (!src) return "";
                  let y = src.y + 50;
                  if (src.type === "condition") {
                    if (connectingState.type === "true") y = src.y + 35;
                    if (connectingState.type === "false") y = src.y + 105;
                  }
                  return `M ${src.x + NODE_WIDTH} ${y} C ${
                    src.x + NODE_WIDTH + 80
                  } ${y}, ${mousePos.x - 80} ${mousePos.y}, ${mousePos.x} ${
                    mousePos.y
                  }`;
                })()}
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5,5"
                fill="none"
              />
            )}
          </svg>

          {/* NODE LAYER */}
          {currentNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;

            const statusStyles: Record<string, string> = {
              pending: "border-slate-300 bg-white",
              running:
                "border-blue-500 ring-2 ring-blue-200 bg-white shadow-[0_0_20px_rgba(59,130,246,0.5)]",
              completed: "border-green-500 bg-green-50",
              skipped: "border-slate-200 bg-slate-50 opacity-60",
            };

            const Icon =
              node.type === "start"
                ? Play
                : node.type === "condition"
                ? Split
                : node.type === "merge"
                ? GitMerge
                : node.type === "stage"
                ? Layers
                : node.type === "subflow"
                ? Workflow
                : node.type === "end"
                ? CheckCircle2
                : Settings;

            const targetName =
              node.type === "subflow" && node.targetPipelineId
                ? pipelines.find((p) => p.id === node.targetPipelineId)?.name
                : null;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                className={`absolute rounded-lg shadow-md border-2 transition-all cursor-move select-none flex flex-col overflow-hidden ${
                  statusStyles[node.status] || statusStyles.pending
                } ${
                  isSelected
                    ? "ring-2 ring-blue-400 border-blue-500 z-20"
                    : "z-10"
                }`}
                style={{
                  width: NODE_WIDTH,
                  minHeight: node.type === "stage" ? NODE_HEIGHT : 80,
                  height: node.type === "stage" ? "auto" : NODE_HEIGHT,
                  left: node.x,
                  top: node.y,
                }}
              >
                {node.type !== "start" && (
                  <div
                    className="absolute left-0 top-8 -translate-x-1/2 w-4 h-4 bg-slate-400 rounded-full border-2 border-white hover:bg-blue-500 cursor-crosshair z-20"
                    onMouseUp={(e) => completeConnection(e, node.id)}
                  />
                )}

                <div className="flex items-center gap-2 p-3 border-b bg-slate-50/50">
                  <div
                    className={`p-1.5 rounded ${
                      node.type === "stage"
                        ? "bg-blue-100 text-blue-600"
                        : node.type === "subflow"
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {node.type === "stage" ? (
                      <Layers size={14} />
                    ) : node.type === "condition" ? (
                      <Split size={14} />
                    ) : node.type === "subflow" ? (
                      <Workflow size={14} />
                    ) : (
                      <Settings size={14} />
                    )}
                  </div>
                  <div className="font-bold text-sm truncate flex-1">
                    {node.label}
                  </div>
                  {node.status === "completed" && (
                    <Check size={16} className="text-green-600" />
                  )}
                </div>

                {/* STAGE CONTENT: TASK LIST VISUALIZATION */}
                {node.type === "stage" && (
                  <div className="p-3 bg-white">
                    {node.tasks && node.tasks.length > 0 ? (
                      <div className="space-y-2">
                        {node.tasks.map((task, idx) => (
                          <div
                            key={task.id}
                            className={`flex items-center gap-2 text-xs p-1.5 rounded border ${
                              task.status === "running"
                                ? "bg-blue-50 border-blue-200"
                                : task.status === "completed"
                                ? "bg-green-50 border-green-200"
                                : "border-slate-100"
                            }`}
                          >
                            <div className="w-4 h-4 flex items-center justify-center">
                              {task.status === "running" ? (
                                <Loader2
                                  size={12}
                                  className="animate-spin text-blue-500"
                                />
                              ) : task.status === "completed" ? (
                                <Check
                                  size={12}
                                  className="text-green-600"
                                />
                              ) : (
                                <span className="text-slate-400 font-mono">
                                  {idx + 1}
                                </span>
                              )}
                            </div>
                            <span
                              className={`truncate flex-1 ${
                                task.status === "completed"
                                  ? "text-green-700"
                                  : "text-slate-700"
                              }`}
                            >
                              {task.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-[10px] text-slate-400 py-2 border border-dashed rounded">
                        Drop Tasks Here
                      </div>
                    )}
                  </div>
                )}

                {/* SUBFLOW CONTENT */}
                {node.type === "subflow" && (
                  <div className="p-4 text-center">
                    <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 truncate">
                      Link: {targetName || "Select Pipeline"}
                    </div>
                  </div>
                )}

                {/* CONDITION CONTENT */}
                {node.type === "condition" && (
                  <div className="p-4 relative h-16">
                    <div
                      className="absolute right-0 top-1/4 translate-x-1/2 w-4 h-4 bg-green-400 rounded-full border-2 border-white hover:scale-125 cursor-crosshair z-20"
                      title="True"
                      onMouseDown={(e) => startConnection(e, node.id, "true")}
                    />
                    <div
                      className="absolute right-0 top-3/4 translate-x-1/2 w-4 h-4 bg-red-400 rounded-full border-2 border-white hover:scale-125 cursor-crosshair z-20"
                      title="False"
                      onMouseDown={(e) => startConnection(e, node.id, "false")}
                    />
                    <div className="text-xs text-center text-slate-500 mt-1">
                      Evaluate Rule
                    </div>
                  </div>
                )}

                {node.type !== "condition" && node.type !== "end" && (
                  <div
                    className="absolute right-0 top-8 translate-x-1/2 w-4 h-4 bg-slate-400 rounded-full border-2 border-white hover:bg-blue-500 cursor-crosshair z-20"
                    onMouseDown={(e) => startConnection(e, node.id)}
                  />
                )}
              </div>
            );
          })}

          <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur p-3 rounded-lg shadow text-xs text-slate-500 pointer-events-none select-none border">
            <div className="font-bold mb-1">Controls</div>
            <div>• Drag Stages to build Pipeline</div>
            <div>• Drag Atomic Tasks ONTO a Stage</div>
            <div>• Click Stage to manage Tasks</div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: THE STAGE MANAGER */}
        {isSidebarOpen && (
          <div className="w-80 bg-white border-l z-20 shadow-xl flex flex-col animate-in slide-in-from-right-10 duration-200">
            <div className="h-14 border-b flex items-center px-4 justify-between bg-slate-50">
              <h2 className="font-bold text-sm text-slate-800">
                {selectedNode
                  ? "Stage Manager"
                  : showPipelineSettings
                  ? "Pipeline Settings"
                  : "Properties"}
              </h2>
              <button
                onClick={() => {
                  setSelectedNodeId(null);
                  setShowPipelineSettings(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-6 flex-1 overflow-y-auto bg-white custom-scrollbar">
              {selectedNode ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  {/* STAGE HEADER */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Stage Name
                    </label>
                    <input
                      onFocus={addToHistory}
                      value={selectedNode.label}
                      onChange={(e) =>
                        updateNode(selectedNode.id, { label: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700"
                    />
                  </div>

                  {/* TASK MANAGER LIST */}
                  {selectedNode.type === "stage" && (
                    <div className="mt-2 border-t pt-4">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex justify-between items-center">
                        <span>Atomic Tasks</span>
                        <button
                          onClick={() => addTaskToStage(selectedNode.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-[10px] flex items-center gap-1 transition-colors shadow-sm"
                        >
                          <Plus size={12} /> New Task
                        </button>
                      </label>

                      <div className="space-y-3">
                        {(!selectedNode.tasks ||
                          selectedNode.tasks.length === 0) && (
                          <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-lg text-xs text-slate-400 bg-slate-50">
                            Stage is empty.
                            <br />
                            Add a task or drag one here.
                          </div>
                        )}

                        {selectedNode.tasks &&
                          selectedNode.tasks.map((task, idx) => (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) =>
                                handleTaskDragStart(e, idx)
                              }
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                              }}
                              onDrop={(e) =>
                                handleTaskDrop(e, idx, selectedNode.id)
                              }
                              className={`border rounded-lg bg-white shadow-sm text-xs relative group transition-all ${
                                draggedTaskIndex === idx
                                  ? "opacity-50 ring-2 ring-blue-400"
                                  : "hover:border-blue-300"
                              }`}
                            >
                              {/* Task Header / Handle */}
                              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-t-lg border-b border-slate-100 cursor-move">
                                <GripHorizontal
                                  size={14}
                                  className="text-slate-400"
                                />
                                <div className="bg-blue-100 text-blue-700 w-5 h-5 flex items-center justify-center rounded-full font-bold text-[10px]">
                                  {idx + 1}
                                </div>
                                {editingTaskId === task.id ? (
                                  <input
                                    autoFocus
                                    className="bg-white border rounded px-1.5 py-0.5 flex-1 outline-none focus:ring-1 focus:ring-blue-500"
                                    value={task.name}
                                    onChange={(e) =>
                                      updateTask(
                                        selectedNode.id,
                                        task.id,
                                        "name",
                                        e.target.value,
                                      )
                                    }
                                    onBlur={() => setEditingTaskId(null)}
                                  />
                                ) : (
                                  <span
                                    className="flex-1 font-semibold text-slate-700 cursor-text"
                                    onClick={() => setEditingTaskId(task.id)}
                                  >
                                    {task.name}
                                  </span>
                                )}
                                <button
                                  onClick={() =>
                                    deleteTask(selectedNode.id, task.id)
                                  }
                                  className="text-slate-300 hover:text-red-500 p-1"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              {/* Task Details */}
                              <div className="p-3 space-y-2">
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase">
                                    Command
                                  </label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Terminal
                                      size={12}
                                      className="text-slate-400"
                                    />
                                    <input
                                      className="bg-slate-50 border rounded px-2 py-1.5 w-full font-mono text-[10px] text-slate-600 outline-none focus:bg-white focus:border-blue-400 transition-colors"
                                      value={task.command}
                                      onChange={(e) =>
                                        updateTask(
                                          selectedNode.id,
                                          task.id,
                                          "command",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="e.g. npm run build"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase">
                                    Assignee
                                  </label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <User
                                      size={12}
                                      className="text-slate-400"
                                    />
                                    <input
                                      className="bg-white border rounded px-2 py-1.5 w-full text-[10px] outline-none focus:border-blue-400"
                                      value={task.assignee}
                                      onChange={(e) =>
                                        updateTask(
                                          selectedNode.id,
                                          task.id,
                                          "assignee",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Unassigned"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {selectedNode.type === "subflow" && (
                    <div className="bg-indigo-50 p-3 rounded border border-indigo-100">
                      <label className="block text-xs font-medium text-indigo-700 mb-1">
                        Target Pipeline
                      </label>
                      <select
                        value={selectedNode.targetPipelineId || ""}
                        onChange={(e) =>
                          updateNode(selectedNode.id, {
                            targetPipelineId: e.target.value,
                          })
                        }
                        className="w-full px-2 py-2 border rounded text-sm mb-2"
                      >
                        <option value="">-- Select --</option>
                        {pipelines
                          .filter((p) => p.id !== activePipelineId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 rounded text-xs text-slate-500 flex justify-between mt-6">
                    <span>Type:</span>
                    <span className="font-semibold uppercase">
                      {selectedNode.type}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteNode(selectedNode.id)}
                    className="w-full py-2 text-red-600 border border-red-200 hover:bg-red-50 rounded text-sm transition-colors flex items-center justify-center gap-2 mt-2"
                  >
                    <Trash2 size={14} /> Delete Stage
                  </button>
                </div>
              ) : showPipelineSettings ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Pipeline Name
                    </label>
                    <input
                      onFocus={addToHistory}
                      value={activePipeline.name}
                      onChange={(e) =>
                        updatePipelineSettings({ name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-blue-900"
                    />
                  </div>
                  <div className="mb-6 p-3 bg-teal-50 rounded border border-teal-100">
                    <div className="flex items-center gap-2 mb-2 text-teal-700">
                      <LinkIcon size={14} />
                      <label className="text-xs font-bold uppercase tracking-wider">
                        Chain Trigger
                      </label>
                    </div>
                    <select
                      value={activePipeline.onSuccessPipelineId || ""}
                      onChange={(e) =>
                        updatePipelineSettings({
                          onSuccessPipelineId: e.target.value,
                        })
                      }
                      className="w-full px-2 py-2 border rounded text-sm bg-white"
                    >
                      <option value="">Do nothing (End)</option>
                      {pipelines
                        .filter((p) => p.id !== activePipelineId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            Run "{p.name}"
                          </option>
                        ))}
                    </select>
                    <div className="text-[10px] text-teal-600 mt-1 leading-tight">
                      Automatically runs the selected pipeline after this one
                      finishes successfully.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* LOGS PANEL */}
      <div
        className={`border-t bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 z-30 ${
          logsMinimized ? "h-9" : "h-48"
        }`}
      >
        <div
          onClick={() => setLogsMinimized(!logsMinimized)}
          className="h-9 px-4 flex items-center justify-between bg-slate-800 cursor-pointer hover:bg-slate-700 select-none border-b border-slate-700"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 tracking-wider">
            <Terminal size={12} /> EXECUTION CONSOLE
          </div>
          {logsMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
        {!logsMinimized && (
          <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
            {logs.length === 0 && <div className="opacity-50">Ready...</div>}
            {logs.map((log, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                className="mb-1 border-l-2 border-slate-700 pl-2"
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>
        {`@keyframes progress-bar { 0% { width: 0%; transform: translateX(-100%); } 50% { width: 100%; transform: translateX(0); } 100% { width: 100%; transform: translateX(100%); }`}
      </style>
    </div>
  );
}
