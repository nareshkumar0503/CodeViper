import React, { useEffect, useRef, useState } from "react";
import {
  PencilLine, Eraser, Square, Circle, Type, ArrowRight, Undo2, Redo2, 
  Image as ImageIcon, Hand, PanelTop, Play, MessageCircle, User, 
  Plus, Minus, Upload, Download, Save, Trash2, Copy, Layers, Move,
  ChevronLeft, ChevronRight, Settings, Palette, Scissors, Grid3X3, Ruler,
  MousePointer, RotateCcw, RotateCw, ZoomIn, Shapes, Brush, Droplet,
  Highlighter, LassoSelect, ZapOff, FlipHorizontal, FlipVertical, Sliders,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Focus, Eye, EyeOff
} from "lucide-react";
import toast from "react-hot-toast";

const DrawingTool = ({ socketRef, roomId, username }) => {
  // Canvas References
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const contextRef = useRef(null);
  const overlayContextRef = useRef(null);
  const fileInputRef = useRef(null);
  const importInputRef = useRef(null);
  
  // Core Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#FFFFFF");
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState("select");
  const [opacity, setOpacity] = useState(1);
  const [blendMode, setBlendMode] = useState("source-over");
  
  // Brush State
  const [brushType, setBrushType] = useState("round"); // round, square, texture
  const [brushHardness, setBrushHardness] = useState(1); // 0-1 softness
  const [brushSpacing, setBrushSpacing] = useState(1); // distance between brush stamps
  const [brushOpacity, setBrushOpacity] = useState(1); // 0-1 opacity per stroke
  const [brushTexture, setBrushTexture] = useState(null); // texture pattern for brushes
  const [brushScatter, setBrushScatter] = useState(0); // random position variation
  
  // Eraser State
  const [eraserType, setEraserType] = useState("normal"); // normal, pixel, background
  const [eraserSize, setEraserSize] = useState(20);
  const [eraserHardness, setEraserHardness] = useState(0.5);
  const [eraserOpacity, setEraserOpacity] = useState(1);
  
  // History State
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [historyLimit, setHistoryLimit] = useState(30);
  
  // Shape State
  const [currentShape, setCurrentShape] = useState(null);
  const [shapeFill, setShapeFill] = useState(false);
  const [shapeFillColor, setShapeFillColor] = useState("rgba(255,255,255,0.3)");
  const [shapeBorderStyle, setShapeBorderStyle] = useState("solid");
  const [cornerRadius, setCornerRadius] = useState(0);
  
  // Element Selection State
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState(null);
  const [multiSelectElements, setMultiSelectElements] = useState([]);
  
  // Canvas View State
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [grid, setGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [rulers, setRulers] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapToElements, setSnapToElements] = useState(true);
  
  // UI State
  const [activeUser, setActiveUser] = useState(null);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showToolSettings, setShowToolSettings] = useState(true);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [activeColorPicker, setActiveColorPicker] = useState(null);
  const [recentColors, setRecentColors] = useState(["#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"]);
  
  // Text State
  const [textProps, setTextProps] = useState({
    content: "",
    fontFamily: "Inter",
    fontSize: 16,
    bold: false,
    italic: false,
    underline: false,
    align: "left",
    position: { x: 0, y: 0 },
    isEditing: false,
  });
  
  // Layer State
  const [layers, setLayers] = useState([
    { id: "layer1", name: "Layer 1", visible: true, locked: false, opacity: 1 }
  ]);
  const [activeLayer, setActiveLayer] = useState("layer1");
  
  // Page State
  const [pages, setPages] = useState([
    { id: "page1", name: "Page 1", shapes: [], images: [], bgColor: "#000000", layers: ["layer1"] },
  ]);
  const [activePage, setActivePage] = useState("page1");

  // Fonts and settings
  const fonts = ["Inter", "Helvetica", "Arial", "Times New Roman", "Courier New", "Georgia", "Roboto", "Open Sans", "Montserrat"];
  const blendModes = [
    { name: "Normal", value: "source-over" },
    { name: "Multiply", value: "multiply" },
    { name: "Screen", value: "screen" },
    { name: "Overlay", value: "overlay" },
    { name: "Darken", value: "darken" },
    { name: "Lighten", value: "lighten" },
    { name: "Color Dodge", value: "color-dodge" },
    { name: "Color Burn", value: "color-burn" },
    { name: "Hard Light", value: "hard-light" },
    { name: "Soft Light", value: "soft-light" },
    { name: "Difference", value: "difference" },
    { name: "Exclusion", value: "exclusion" },
    { name: "Hue", value: "hue" },
    { name: "Saturation", value: "saturation" },
    { name: "Color", value: "color" },
    { name: "Luminosity", value: "luminosity" }
  ];

  // Brush presets
  const brushPresets = [
    { name: "Pencil", type: "round", hardness: 1, spacing: 0.1, opacity: 1, scatter: 0, size: 2 },
    { name: "Marker", type: "square", hardness: 0.9, spacing: 0.05, opacity: 0.8, scatter: 0, size: 8 },
    { name: "Airbrush", type: "round", hardness: 0.3, spacing: 0.1, opacity: 0.3, scatter: 0.2, size: 20 },
    { name: "Chalk", type: "texture", hardness: 0.7, spacing: 0.15, opacity: 0.9, scatter: 0.1, size: 10 },
    { name: "Ink", type: "round", hardness: 1, spacing: 0, opacity: 1, scatter: 0, size: 3 },
  ];

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    
    canvas.width = window.innerWidth - (showLeftSidebar ? 240 : 0) - (showRightSidebar ? 260 : 0);
    canvas.height = window.innerHeight - 80;
    
    overlayCanvas.width = canvas.width;
    overlayCanvas.height = canvas.height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    const overlayContext = overlayCanvas.getContext("2d");
    
    context.lineCap = "round";
    context.lineJoin = "round";
    contextRef.current = context;
    overlayContextRef.current = overlayContext;

    // Apply initial settings
    contextRef.current.globalAlpha = opacity;
    contextRef.current.globalCompositeOperation = blendMode;

    redrawCanvas();

    const handleResize = () => {
      canvas.width = window.innerWidth - (showLeftSidebar ? 240 : 0) - (showRightSidebar ? 260 : 0);
      canvas.height = window.innerHeight - 80;
      overlayCanvas.width = canvas.width;
      overlayCanvas.height = canvas.height;
      redrawCanvas();
    };

    window.addEventListener("resize", handleResize);
    
    // Add key event listeners for shortcuts
    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showLeftSidebar, showRightSidebar, activePage, opacity, blendMode]);

  // Redraw on state changes
  useEffect(() => {
    redrawCanvas();
    if (grid) drawGrid();
    if (rulers) drawRulers();
  }, [grid, gridSize, zoom, offset, activePage, rulers, snapToGrid]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Don't trigger shortcuts when typing text
    if (textProps.isEditing) return;
    
    const ctrlOrCmd = e.ctrlKey || e.metaKey;
    
    switch (e.key.toLowerCase()) {
      case "v":
        setTool("select");
        break;
      case "b":
        setTool("pencil");
        break;
      case "e":
        setTool("eraser");
        break;
      case "r":
        setTool("rectangle");
        break;
      case "c":
        setTool("circle");
        break;
      case "t":
        setTool("text");
        break;
      case "a":
        setTool("arrow");
        break;
      case "h":
        setTool("hand");
        break;
      case "l":
        setTool("line");
        break;
      case "i":
        fileInputRef.current.click();
        break;
      case "g":
        setGrid(!grid);
        break;
      case "+":
        if (ctrlOrCmd) {
          e.preventDefault();
          setZoom((prev) => Math.min(prev + 0.1, 5));
        }
        break;
      case "-":
        if (ctrlOrCmd) {
          e.preventDefault();
          setZoom((prev) => Math.max(prev - 0.1, 0.1));
        }
        break;
      case "0":
        if (ctrlOrCmd) {
          e.preventDefault();
          setZoom(1);
          setOffset({ x: 0, y: 0 });
        }
        break;
      case "z":
        if (ctrlOrCmd) {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
        break;
      case "y":
        if (ctrlOrCmd) {
          e.preventDefault();
          handleRedo();
        }
        break;
      case "[":
        setLineWidth((prev) => Math.max(prev - 1, 1));
        break;
      case "]":
        setLineWidth((prev) => Math.min(prev + 1, 100));
        break;
      case "delete":
      case "backspace":
        if (selectedElement) {
          deleteSelectedElement();
        }
        break;
      case "escape":
        setSelectedElement(null);
        setMultiSelectElements([]);
        setSelectionBox(null);
        setTextProps({ ...textProps, isEditing: false });
        break;
    }
  };

  // Collaboration handlers
  useEffect(() => {
    if (!socketRef.current) return;

    const handleRemoteDrawing = ({ username: remoteUser, type, data }) => {
      setActiveUser(remoteUser);
      const context = contextRef.current;
      context.globalAlpha = data.opacity || 1;
      context.globalCompositeOperation = data.tool === "eraser" ? 
        (data.eraserType === "background" ? "destination-out" : "source-over") : 
        data.blendMode || "source-over";
      context.strokeStyle = data.tool === "eraser" ? getCurrentPage().bgColor : data.color;
      context.lineWidth = data.lineWidth / zoom;

      if (data.page !== activePage) return;

      switch (type) {
        case "START":
          context.beginPath();
          context.moveTo(data.x, data.y);
          
          // For brush strokes
          if (data.brushType) {
            applyBrushSettings(context, data);
          }
          break;
          
        case "DRAW":
          if (data.tool === "pencil" || data.tool === "eraser") {
            if (data.brushType === "texture") {
              drawTexturedBrush(context, data);
            } else {
              context.lineTo(data.x, data.y);
              context.stroke();
              
              // For scatter brushes
              if (data.brushScatter > 0) {
                drawScatteredDots(context, data);
              }
            }
          }
          break;
          
        case "SHAPE":
          redrawCanvas();
          drawTemporaryShape(data);
          break;
          
        case "FINISH":
          context.closePath();
          context.globalAlpha = 1;
          context.globalCompositeOperation = "source-over";
          setActiveUser(null);
          break;
      }
    };

    const handleRemoteShapeAdd = ({ shape, page }) => {
      if (isValidShape(shape) && page === activePage) {
        const currentPageData = getCurrentPage();
        updatePageData(currentPageData.id, { shapes: [...currentPageData.shapes, shape] });
        redrawCanvas();
      }
    };

    const handleRemoteTextAdd = ({ textObject, page }) => {
      if (isValidShape(textObject) && page === activePage) {
        const currentPageData = getCurrentPage();
        updatePageData(currentPageData.id, { shapes: [...currentPageData.shapes, textObject] });
        redrawCanvas();
      }
    };

    const handleRemoteImageAdd = ({ imageObject, page }) => {
      if (page === activePage) {
        const img = new Image();
        img.onload = () => {
          const currentPageData = getCurrentPage();
          updatePageData(currentPageData.id, { images: [...currentPageData.images, { ...imageObject, image: img }] });
          redrawCanvas();
        };
        img.src = imageObject.src;
      }
    };

    const handleRemoteElementMove = ({ elementId, newPosition, page }) => {
      if (page === activePage) {
        const currentPageData = getCurrentPage();
        updatePageData(currentPageData.id, {
          shapes: currentPageData.shapes.map((s) => (s.id === elementId ? { ...s, ...newPosition } : s)),
          images: currentPageData.images.map((i) => (i.id === elementId ? { ...i, ...newPosition } : i)),
        });
        redrawCanvas();
      }
    };

    const handleRemoteCanvasReset = ({ bgColor, page }) => {
      if (page === activePage) {
        updatePageData(activePage, { shapes: [], images: [], bgColor });
        redrawCanvas();
      }
    };

    // Register all socket event listeners
    if (socketRef.current) {
      socketRef.current.on("DRAWING_UPDATE", handleRemoteDrawing);
      socketRef.current.on("SHAPE_ADD", handleRemoteShapeAdd);
      socketRef.current.on("TEXT_ADD", handleRemoteTextAdd);
      socketRef.current.on("IMAGE_ADD", handleRemoteImageAdd);
      socketRef.current.on("ELEMENT_MOVE", handleRemoteElementMove);
      socketRef.current.on("CANVAS_RESET", handleRemoteCanvasReset);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("DRAWING_UPDATE", handleRemoteDrawing);
        socketRef.current.off("SHAPE_ADD", handleRemoteShapeAdd);
        socketRef.current.off("TEXT_ADD", handleRemoteTextAdd);
        socketRef.current.off("IMAGE_ADD", handleRemoteImageAdd);
        socketRef.current.off("ELEMENT_MOVE", handleRemoteElementMove);
        socketRef.current.off("CANVAS_RESET", handleRemoteCanvasReset);
      }
    };
  }, [socketRef, activePage, zoom]);

  // Enhanced brush functions
  const applyBrushSettings = (context, data) => {
    // Apply brush properties from data or current settings
    const type = data.brushType || brushType;
    const hardness = data.brushHardness || brushHardness;
    const size = (data.lineWidth || lineWidth) / zoom;
    
    // Different cap and join styles based on brush type
    if (type === "square") {
      context.lineCap = "butt";
      context.lineJoin = "miter";
    } else {
      context.lineCap = "round";
      context.lineJoin = "round";
    }
    
    // Adjust brush softness for non-texture brushes
    if (type !== "texture" && hardness < 1) {
      context.shadowBlur = size * (1 - hardness) * 2;
      context.shadowColor = data.color || color;
    } else {
      context.shadowBlur = 0;
    }
  };
  
  const drawTexturedBrush = (context, data) => {
    const { x, y, prevX, prevY, lineWidth } = data;
    const spacing = (data.brushSpacing || brushSpacing) * lineWidth * 0.1;
    const dx = x - (prevX || x);
    const dy = y - (prevY || y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.floor(distance / spacing));
    
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const stepX = prevX + dx * t;
      const stepY = prevY + dy * t;
      
      const size = (lineWidth / zoom) * (Math.random() * 0.4 + 0.8); // Some variation in size
      
      context.save();
      // Random opacity for texture feel
      context.globalAlpha = (data.brushOpacity || brushOpacity) * (Math.random() * 0.3 + 0.7);
      
      context.beginPath();
      context.arc(stepX, stepY, size / 2, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  };
  
  const drawScatteredDots = (context, data) => {
    const { x, y, lineWidth, brushScatter } = data;
    const scatter = brushScatter || brushScatter;
    const maxDots = Math.floor(lineWidth / 2) * scatter;
    
    context.save();
    
    for (let i = 0; i < maxDots; i++) {
      const offsetX = (Math.random() - 0.5) * lineWidth * scatter * 2;
      const offsetY = (Math.random() - 0.5) * lineWidth * scatter * 2;
      const dotSize = Math.random() * lineWidth * 0.3;
      
      context.globalAlpha = Math.random() * 0.7;
      context.beginPath();
      context.arc(x + offsetX, y + offsetY, dotSize, 0, Math.PI * 2);
      context.fill();
    }
    
    context.restore();
  };

  // Apply currently selected brush preset
  const applyBrushPreset = (preset) => {
    setBrushType(preset.type);
    setBrushHardness(preset.hardness);
    setBrushSpacing(preset.spacing);
    setBrushOpacity(preset.opacity);
    setBrushScatter(preset.scatter);
    setLineWidth(preset.size);
    toast.success(`Applied ${preset.name} brush`);
  };

  // Enhanced eraser function
  const applyEraserSettings = () => {
    const context = contextRef.current;
    
    context.globalAlpha = eraserOpacity;
    
    if (eraserType === "background") {
      // Background eraser - completely removes pixels (transparent)
      context.globalCompositeOperation = "destination-out";
    } else if (eraserType === "pixel") {
      // Pixel eraser - removes color based on sampling
      context.globalCompositeOperation = "destination-out";
    } else {
      // Normal eraser - paints with background color
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = getCurrentPage().bgColor;
    }
    
    context.lineWidth = eraserSize / zoom;
    context.shadowBlur = eraserSize * (1 - eraserHardness) / zoom;
    context.shadowColor = getCurrentPage().bgColor;
  };

  const resetBrushSettings = () => {
    const context = contextRef.current;
    context.globalAlpha = opacity;
    context.globalCompositeOperation = blendMode;
    context.strokeStyle = color;
    context.lineWidth = lineWidth / zoom;
    context.shadowBlur = 0;
  };

  // Helper functions
  const isValidShape = (shape) => {
    return shape && shape.x !== undefined && shape.y !== undefined && 
           (shape.width !== undefined || shape.radius !== undefined) && 
           (shape.height !== undefined || shape.type === "circle");
  };

  const getCurrentPage = () => pages.find((page) => page.id === activePage) || pages[0];

  const updatePageData = (pageId, newData) => {
    setPages((prev) =>
      prev.map((page) => (page.id === pageId ? { ...page, ...newData } : page))
    );
  };

  const addRecentColor = (newColor) => {
    if (!recentColors.includes(newColor)) {
      setRecentColors([newColor, ...recentColors.slice(0, 11)]);
    }
  };

  // Grid and rulers
  const drawGrid = () => {
    const context = overlayContextRef.current;
    context.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    
    context.strokeStyle = "#333333";
    context.lineWidth = 0.5 / zoom;
    const adjustedGridSize = gridSize * zoom;
    const startX = offset.x % adjustedGridSize;
    const startY = offset.y % adjustedGridSize;

    context.beginPath();
    for (let x = startX; x < overlayCanvasRef.current.width; x += adjustedGridSize) {
      context.moveTo(x, 0);
      context.lineTo(x, overlayCanvasRef.current.height);
    }
    
    for (let y = startY; y < overlayCanvasRef.current.height; y += adjustedGridSize) {
      context.moveTo(0, y);
      context.lineTo(overlayCanvasRef.current.width, y);
    }
    context.stroke();
  };

  const drawRulers = () => {
    const context = overlayContextRef.current;
    const rulerSize = 20;
    const rulerMarkSize = 5;
    const largeMarkInterval = 100;
    
    // Draw ruler backgrounds
    context.fillStyle = "rgba(30, 30, 30, 0.8)";
    context.fillRect(0, 0, overlayCanvasRef.current.width, rulerSize);
    context.fillRect(0, 0, rulerSize, overlayCanvasRef.current.height);
    
    // Draw ruler marks
    context.strokeStyle = "#aaaaaa";
    context.fillStyle = "#cccccc";
    context.font = "8px sans-serif";
    context.textAlign = "center";
    
    // Horizontal ruler marks
    for (let x = offset.x % (gridSize * zoom); x < overlayCanvasRef.current.width; x += gridSize * zoom) {
      const realX = x / zoom - offset.x;
      if (realX % largeMarkInterval < 0.1) {
        // Large mark
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, rulerSize);
        context.stroke();
        // Label
        context.fillText(Math.round(realX).toString(), x, rulerSize - 2);
      } else {
        // Small mark
        context.beginPath();
        context.moveTo(x, rulerSize - rulerMarkSize);
        context.lineTo(x, rulerSize);
        context.stroke();
      }
    }
    
    // Vertical ruler marks
    context.textAlign = "right";
    for (let y = offset.y % (gridSize * zoom); y < overlayCanvasRef.current.height; y += gridSize * zoom) {
      const realY = y / zoom - offset.y;
      if (realY % largeMarkInterval < 0.1) {
        // Large mark
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(rulerSize, y);
        context.stroke();
        // Label
        context.fillText(Math.round(realY).toString(), rulerSize - 2, y + 3);
      } else {
        // Small mark
        context.beginPath();
        context.moveTo(rulerSize - rulerMarkSize, y);
        context.lineTo(rulerSize, y);
        context.stroke();
      }
    }
    
    // Draw ruler corner
    context.fillStyle = "rgba(40, 40, 40, 0.9)";
    context.fillRect(0, 0, rulerSize, rulerSize);
  };

  // Drawing handlers
  const startDrawing = (e) => {
    const { offsetX, offsetY } = getCoordinates(e);

    if (tool === "select" || tool === "hand" || tool === "lassoSelect") {
      handleSelectionToolStart(offsetX, offsetY);
      return;
    }

    if (tool === "text") {
      setTextProps({ 
        ...textProps, 
        position: { x: offsetX, y: offsetY }, 
        isEditing: true,
        content: selectedElement?.type === "text" ? selectedElement.content : ""
      });
      return;
    }

    setIsDrawing(true);
    
    // Apply tool-specific settings
    if (tool === "eraser") {
      applyEraserSettings();
    } else {
      // Apply brush settings for pencil
      const context = contextRef.current;
      context.globalAlpha = opacity;
      context.globalCompositeOperation = blendMode;
      context.strokeStyle = color;
      context.lineWidth = lineWidth / zoom;
      
      if (tool === "pencil") {
        applyBrushSettings(context, {
          brushType,
          brushHardness,
          color,
          lineWidth,
        });
      }
    }
    
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    
    const drawingData = {
      x: offsetX, 
      y: offsetY, 
      tool,
      color,
      lineWidth, 
      opacity,
      blendMode,
      brushType,
      brushHardness,
      brushOpacity,
      brushScatter,
      eraserType,
      eraserSize,
      eraserHardness,
      eraserOpacity,
    };
    
    broadcastDrawing("START", drawingData);

    if (["rectangle", "circle", "line", "arrow", "polygon"].includes(tool)) {
      setCurrentShape({
        type: tool,
        startX: offsetX,
        startY: offsetY,
        endX: offsetX,
        endY: offsetY,
        color,
        lineWidth,
        fill: shapeFill,
        fillColor: shapeFillColor,
        borderStyle: shapeBorderStyle,
        cornerRadius: tool === "rectangle" ? cornerRadius : 0,
        page: activePage,
        id: `shape_${Date.now()}`,
      });
    }
  };

  const draw = (e) => {
    if (!isDrawing && !isDragging && !selectionBox) return;

    const { offsetX, offsetY } = getCoordinates(e);
    
    // Handle different modes
    if (isDragging) {
      handleDragging(offsetX, offsetY);
      return;
    }
    
    if (selectionBox) {
      updateSelectionBox(offsetX, offsetY);
      return;
    }

    if (!isDrawing) return;

    const context = contextRef.current;
    const prevX = parseFloat(context.currentX || offsetX);
    const prevY = parseFloat(context.currentY || offsetY);
    
    context.currentX = offsetX;
    context.currentY = offsetY;

    if (tool === "pencil" || tool === "eraser") {
      if (brushType === "texture" && tool === "pencil") {
        drawTexturedBrush(context, { 
          x: offsetX, 
          y: offsetY, 
          prevX, 
          prevY, 
          lineWidth, 
          brushSpacing,
          brushOpacity,
          color 
        });
      } else {
        context.lineTo(offsetX, offsetY);
        context.stroke();
        
        // Add scatter effect for pencil if needed
        if (tool === "pencil" && brushScatter > 0) {
          drawScatteredDots(context, { 
            x: offsetX, 
            y: offsetY,
            lineWidth,
            brushScatter,
            color
          });
        }
      }
      
      broadcastDrawing("DRAW", { 
        x: offsetX, 
        y: offsetY, 
        prevX, 
        prevY, 
        tool, 
        brushType,
        brushSpacing,
        brushOpacity,
        brushScatter,
        eraserType,
      });
    } else if (currentShape) {
      const updatedShape = { ...currentShape, endX: offsetX, endY: offsetY };
      setCurrentShape(updatedShape);
      redrawCanvas();
      drawTemporaryShape(updatedShape);
      broadcastDrawing("SHAPE", updatedShape);
    }
  };

  const finishDrawing = () => {
    if (isDragging) {
      setIsDragging(false);
      saveToHistory();
      return;
    }
    
    if (selectionBox) {
      finalizeSelection();
      return;
    }

    if (!isDrawing && !currentShape) return;

    setIsDrawing(false);
    contextRef.current.closePath();
    
    // Reset brush settings
    resetBrushSettings();
    
    broadcastDrawing("FINISH");

    if (currentShape) {
      const finalShape = {
        ...currentShape,
        x: Math.min(currentShape.startX, currentShape.endX),
        y: Math.min(currentShape.startY, currentShape.endY),
        width: Math.abs(currentShape.endX - currentShape.startX) || 1,
        height: Math.abs(currentShape.endY - currentShape.startY) || 1,
      };
      
      // Skip tiny accidental shapes
      if (finalShape.width < 3 && finalShape.height < 3) {
        setCurrentShape(null);
        return;
      }
      
      const currentPageData = getCurrentPage();
      updatePageData(currentPageData.id, { shapes: [...currentPageData.shapes, finalShape] });
      setCurrentShape(null);
      if (socketRef.current) {
        socketRef.current.emit("SHAPE_ADD", { roomId, username, shape: finalShape, page: activePage });
      }
    }

    saveToHistory();
  };

  // Selection tools
  const handleSelectionToolStart = (x, y) => {
    if (tool === "select" || tool === "lassoSelect") {
      const element = findElementAtPosition(x, y);
      
      if (element) {
        // Element found - start dragging
        setSelectedElement(element);
        setIsDragging(true);
        setDragOffset({ x: x - element.x, y: y - element.y });
        
        if (element.type === "text") {
          setTextProps({ ...element, isEditing: false });
        }
      } else {
        // No element - start selection box
        setSelectedElement(null);
        setTextProps({ ...textProps, isEditing: false });
        setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
      }
    } else if (tool === "hand") {
      setIsDragging(true);
      setDragOffset({ x: x, y: y });
    }
  };
  
  const updateSelectionBox = (x, y) => {
    if (!selectionBox) return;
    
    setSelectionBox({ ...selectionBox, endX: x, endY: y });
    
    // Draw selection box on overlay canvas
    const context = overlayContextRef.current;
    context.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    
    if (grid) drawGrid();
    if (rulers) drawRulers();
    
    context.strokeStyle = "#3498db";
    context.lineWidth = 1;
    context.setLineDash([5, 5]);
    
    const selX = Math.min(selectionBox.startX, x);
    const selY = Math.min(selectionBox.startY, y);
    const selWidth = Math.abs(x - selectionBox.startX);
    const selHeight = Math.abs(y - selectionBox.startY);
    
    context.strokeRect(selX, selY, selWidth, selHeight);
    context.setLineDash([]);
    
    // Show dimensions
    if (selWidth > 20 && selHeight > 20) {
      context.fillStyle = "#3498db";
      context.fillRect(selX + selWidth / 2 - 30, selY + selHeight / 2 - 10, 60, 20);
      context.fillStyle = "#ffffff";
      context.font = "12px Inter";
      context.textAlign = "center";
      context.fillText(`${Math.round(selWidth)} × ${Math.round(selHeight)}`, selX + selWidth / 2, selY + selHeight / 2 + 5);
    }
  };
  
  const finalizeSelection = () => {
    if (!selectionBox) return;
    
    // Find all elements within selection box
    const currentPageData = getCurrentPage();
    const selX = Math.min(selectionBox.startX, selectionBox.endX);
    const selY = Math.min(selectionBox.startY, selectionBox.endY);
    const selWidth = Math.abs(selectionBox.endX - selectionBox.startX);
    const selHeight = Math.abs(selectionBox.endY - selectionBox.startY);
    
    // Skip tiny accidental selections
    if (selWidth < 5 && selHeight < 5) {
      setSelectionBox(null);
      return;
    }
    
    const selectedElements = [
      ...currentPageData.shapes.filter(shape => {
        return shape.x >= selX && shape.y >= selY && 
               (shape.x + (shape.width || 0)) <= selX + selWidth && 
               (shape.y + (shape.height || 0)) <= selY + selHeight;
      }),
      ...currentPageData.images.filter(img => {
        return img.x >= selX && img.y >= selY && 
               (img.x + img.width) <= selX + selWidth && 
               (img.y + img.height) <= selY + selHeight;
      })
    ];
    
    if (selectedElements.length === 1) {
      // If only one element, select it directly
      setSelectedElement(selectedElements[0]);
    } else if (selectedElements.length > 1) {
      // If multiple elements, set as multi-selection
      setMultiSelectElements(selectedElements);
    }
    
    setSelectionBox(null);
    
    // Clear overlay canvas and redraw
    overlayContextRef.current.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    if (grid) drawGrid();
    if (rulers) drawRulers();
  };
  
  const handleDragging = (x, y) => {
    if (selectedElement) {
      // Dragging an element
      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;
      
      // Apply grid snapping if enabled
      let snappedX = newX;
      let snappedY = newY;
      
      if (snapToGrid) {
        snappedX = Math.round(newX / gridSize) * gridSize;
        snappedY = Math.round(newY / gridSize) * gridSize;
      }
      
      const currentPageData = getCurrentPage();
      updatePageData(currentPageData.id, {
        shapes: currentPageData.shapes.map((s) =>
          s.id === selectedElement.id ? { ...s, x: snappedX, y: snappedY } : s
        ),
        images: currentPageData.images.map((i) =>
          i.id === selectedElement.id ? { ...i, x: snappedX, y: snappedY } : i
        ),
      });
      
      redrawCanvas();
      broadcastElementMove(selectedElement.id, { x: snappedX, y: snappedY });
    } else if (multiSelectElements.length > 0) {
      // Dragging multiple elements
      const dx = x - dragOffset.x;
      const dy = y - dragOffset.y;
      
      const currentPageData = getCurrentPage();
      const newShapes = currentPageData.shapes.map(s => {
        if (multiSelectElements.some(el => el.id === s.id)) {
          return { ...s, x: s.x + dx, y: s.y + dy };
        }
        return s;
      });
      
      const newImages = currentPageData.images.map(i => {
        if (multiSelectElements.some(el => el.id === i.id)) {
          return { ...i, x: i.x + dx, y: i.y + dy };
        }
        return i;
      });
      
      updatePageData(currentPageData.id, {
        shapes: newShapes,
        images: newImages
      });
      
      // Update drag offset to prevent cumulative movement
      setDragOffset({ x, y });
      redrawCanvas();
      
      // For multi-select, we don't broadcast each move to reduce network traffic
    } else if (tool === "hand") {
      // Panning the canvas
      const dx = (x - dragOffset.x) / zoom;
      const dy = (y - dragOffset.y) / zoom;
      setOffset((prev) => ({ x: prev.x - dx, y: prev.y - dy }));
      setDragOffset({ x, y });
      redrawCanvas();
    }
  };

  // Delete selected elements
  const deleteSelectedElement = () => {
    const currentPageData = getCurrentPage();
    
    if (selectedElement) {
      // Delete single element
      updatePageData(currentPageData.id, {
        shapes: currentPageData.shapes.filter(s => s.id !== selectedElement.id),
        images: currentPageData.images.filter(i => i.id !== selectedElement.id)
      });
      setSelectedElement(null);
      toast.success("Element deleted");
    } else if (multiSelectElements.length > 0) {
      // Delete multiple elements
      const elementIds = multiSelectElements.map(el => el.id);
      updatePageData(currentPageData.id, {
        shapes: currentPageData.shapes.filter(s => !elementIds.includes(s.id)),
        images: currentPageData.images.filter(i => !elementIds.includes(i.id))
      });
      setMultiSelectElements([]);
      toast.success(`${elementIds.length} elements deleted`);
    }
    
    redrawCanvas();
    saveToHistory();
  };

  // Socket communication
  const broadcastDrawing = (type, data) => {
    if (socketRef.current) {
      socketRef.current.emit("DRAWING_UPDATE", {
        roomId,
        username,
        type,
        data: { 
          ...data, 
          tool, 
          color, 
          lineWidth, 
          opacity,
          blendMode,
          brushType,
          brushHardness,
          brushOpacity,
          brushScatter,
          eraserType,
          eraserSize,
          eraserHardness,
          eraserOpacity,
          bgColor: getCurrentPage().bgColor, 
          page: activePage 
        },
      });
    }
  };

  const broadcastElementMove = (elementId, newPosition) => {
    if (socketRef.current) {
      socketRef.current.emit("ELEMENT_MOVE", { 
        roomId, 
        username, 
        elementId, 
        newPosition, 
        page: activePage 
      });
    }
  };

  // Coordinate helpers
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Handle both mouse and touch events
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;

    let offsetX = (clientX - rect.left) / zoom - offset.x;
    let offsetY = (clientY - rect.top) / zoom - offset.y;

    // Apply grid snapping if enabled
    if (snapToGrid && !isDragging && tool !== "hand" && tool !== "pencil" && tool !== "eraser") {
      offsetX = Math.round(offsetX / gridSize) * gridSize;
      offsetY = Math.round(offsetY / gridSize) * gridSize;
    }

    return { offsetX, offsetY };
  };

  const findElementAtPosition = (x, y) => {
    const currentPageData = getCurrentPage();
    
    // Check shapes first (in reverse order to get top-most element)
    for (let i = currentPageData.shapes.length - 1; i >= 0; i--) {
      const shape = currentPageData.shapes[i];
      
      // Skip if not valid shape data
      if (!isValidShape(shape)) continue;
      
      if (shape.type === "circle") {
        // Special handling for circles
        const centerX = shape.x + shape.width / 2;
        const centerY = shape.y + shape.height / 2;
        const radius = shape.width / 2;
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        
        if (distance <= radius) {
          return shape;
        }
      } else if (x >= shape.x && x <= shape.x + (shape.width || 100) && 
                 y >= shape.y && y <= shape.y + (shape.height || 50)) {
        return shape;
      }
    }

    // Then check images
    for (let i = currentPageData.images.length - 1; i >= 0; i--) {
      const img = currentPageData.images[i];
      if (x >= img.x && x <= img.x + img.width && 
          y >= img.y && y <= img.y + img.height) {
        return img;
      }
    }
    
    return null;
  };

  // Shape drawing
  const drawTemporaryShape = (shape) => {
    const context = overlayContextRef.current;
    context.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    
    if (grid) drawGrid();
    if (rulers) drawRulers();
    
    context.save();
    context.scale(zoom, zoom);
    context.translate(offset.x, offset.y);
    context.beginPath();
    context.strokeStyle = shape.color || "#FFFFFF";
    context.lineWidth = (shape.lineWidth || 2) / zoom;
    
    // Apply line style if specified
    if (shape.borderStyle === "dashed") {
      context.setLineDash([10, 5]);
    } else if (shape.borderStyle === "dotted") {
      context.setLineDash([2, 4]);
    } else {
      context.setLineDash([]);
    }

    // Set fill style
    if (shape.fill || shapeFill) {
      context.fillStyle = shape.fillColor || shapeFillColor;
    }

    const startX = shape.startX;
    const startY = shape.startY;
    const endX = shape.endX;
    const endY = shape.endY;
    const width = endX - startX;
    const height = endY - startY;

    switch (shape.type) {
      case "rectangle":
        if (shape.cornerRadius > 0) {
          const radius = Math.min(shape.cornerRadius, Math.abs(width) / 2, Math.abs(height) / 2);
          roundRect(context, startX, startY, width, height, radius);
        } else {
          context.rect(startX, startY, width, height);
        }
        break;
        
      case "circle":
        const centerX = startX;
        const centerY = startY;
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        break;
        
      case "arrow":
        drawArrow(context, startX, startY, endX, endY);
        break;
        
      case "line":
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        break;
        
      case "polygon":
        drawPolygon(context, startX, startY, endX, endY);
        break;
    }

    if (shape.fill || shapeFill) {
      context.fill();
    }
    
    context.stroke();
    context.restore();
    
    // Show dimensions for shapes
    if (Math.abs(width) > 20 && Math.abs(height) > 20) {
      const centerX = (startX + endX) / 2 * zoom + offset.x;
      const centerY = (startY + endY) / 2 * zoom + offset.y;
      
      context.fillStyle = "#3498db";
      context.fillRect(centerX - 30, centerY - 10, 60, 20);
      context.fillStyle = "#ffffff";
      context.font = "12px Inter";
      context.textAlign = "center";
      context.fillText(`${Math.abs(Math.round(width))} × ${Math.abs(Math.round(height))}`, centerX, centerY + 5);
    }
  };

  const roundRect = (context, x, y, width, height, radius) => {
    if (width < 0) {
      x = x + width;
      width = Math.abs(width);
    }
    if (height < 0) {
      y = y + height;
      height = Math.abs(height);
    }
    
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
  };

  const drawArrow = (context, fromX, fromY, toX, toY) => {
    // Arrow line
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    
    // Arrow head
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const headLength = 20 / zoom;
    
    context.moveTo(toX, toY);
    context.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    
    context.moveTo(toX, toY);
    context.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
  };

  const drawPolygon = (context, startX, startY, endX, endY) => {
    // Calculate center for equilateral triangle
    const centerX = (startX + endX) / 2;
    const height = Math.abs(endY - startY);
    
    context.moveTo(startX, endY);
    context.lineTo(endX, endY);
    context.lineTo(centerX, startY);
    context.closePath();
  };

  // Canvas operations
  const redrawCanvas = () => {
    const context = contextRef.current;
    const overlayContext = overlayContextRef.current;
    
    // Clear both canvases
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    overlayContext.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    
    const currentPageData = getCurrentPage();
    
    // Fill canvas with background color
    context.save();
    context.fillStyle = currentPageData.bgColor || "#000000";
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Apply transformation for zoom and pan
    context.scale(zoom, zoom);
    context.translate(offset.x, offset.y);
    
    // Get active layer
    const activeLayerObj = layers.find(l => l.id === activeLayer);
    
    // First draw all shapes
    currentPageData.shapes.forEach((shape) => {
      if (!isValidShape(shape)) return;
      
      // Apply layer opacity if this shape belongs to a layer
      const shapeLayer = shape.layer || "layer1";
      const layerObj = layers.find(l => l.id === shapeLayer);
      
      if (layerObj && !layerObj.visible) return; // Skip if layer is hidden
      
      context.globalAlpha = layerObj ? layerObj.opacity : 1;
      
      context.beginPath();
      context.strokeStyle = shape.color || "#FFFFFF";
      context.lineWidth = (shape.lineWidth || 2) / zoom;
      context.fillStyle = shape.fillColor || "rgba(255,255,255,0.3)";
      
      // Apply line style if specified
      if (shape.borderStyle === "dashed") {
        context.setLineDash([10, 5]);
      } else if (shape.borderStyle === "dotted") {
        context.setLineDash([2, 4]);
      } else {
        context.setLineDash([]);
      }

      switch (shape.type) {
        case "rectangle":
          if (shape.cornerRadius > 0) {
            const radius = Math.min(
              shape.cornerRadius, 
              shape.width / 2, 
              shape.height / 2
            );
            roundRect(context, shape.x, shape.y, shape.width, shape.height, radius);
          } else {
            context.rect(shape.x, shape.y, shape.width, shape.height);
          }
          
          if (shape.fill) {
            context.fill();
          }
          context.stroke();
          break;
          
        case "circle":
          context.arc(
            shape.x + shape.width / 2,
            shape.y + shape.height / 2,
            shape.width / 2,
            0,
            Math.PI * 2
          );
          
          if (shape.fill) {
            context.fill();
          }
          context.stroke();
          break;
          
        case "arrow":
          drawArrow(
            context, 
            shape.x, 
            shape.y, 
            shape.x + shape.width, 
            shape.y + shape.height
          );
          context.stroke();
          break;
          
        case "line":
          context.moveTo(shape.x, shape.y);
          context.lineTo(shape.x + shape.width, shape.y + shape.height);
          context.stroke();
          break;
          
        case "polygon":
          const centerX = shape.x + shape.width / 2;
          context.moveTo(shape.x, shape.y + shape.height);
          context.lineTo(shape.x + shape.width, shape.y + shape.height);
          context.lineTo(centerX, shape.y);
          context.closePath();
          
          if (shape.fill) {
            context.fill();
          }
          context.stroke();
          break;
          
        case "text":
          // Setup text styling
          context.font = `${shape.bold ? "bold " : ""}${shape.italic ? "italic " : ""}${shape.fontSize || 16}px ${shape.fontFamily || "Inter"}`;
          context.textAlign = shape.align || "left";
          context.fillStyle = shape.color || "#FFFFFF";
          context.fillText(shape.content || "", shape.x, shape.y);
          
          // Add underline if specified
          if (shape.underline) {
            const textWidth = context.measureText(shape.content || "").width;
            context.beginPath();
            context.moveTo(shape.x, shape.y + 2);
            context.lineTo(shape.x + textWidth, shape.y + 2);
            context.stroke();
          }
          break;
      }
      
      // Reset opacity
      context.globalAlpha = 1;
    });

    // Then draw all images
    currentPageData.images.forEach((img) => {
      if (img.image && img.x !== undefined && img.y !== undefined) {
        // Apply layer settings
        const imageLayer = img.layer || "layer1";
        const layerObj = layers.find(l => l.id === imageLayer);
        
        if (layerObj && !layerObj.visible) return; // Skip if layer is hidden
        
        context.globalAlpha = layerObj ? layerObj.opacity : 1;
        context.drawImage(
          img.image, 
          img.x, 
          img.y, 
          img.width || 100, 
          img.height || 100
        );
        context.globalAlpha = 1;
      }
    });

    // Draw selection visuals
    if (selectedElement && selectedElement.x !== undefined && selectedElement.y !== undefined) {
      drawSelectionBorder(context, selectedElement);
    } else if (multiSelectElements.length > 0) {
      // Draw group selection
      for (const element of multiSelectElements) {
        drawSelectionBorder(context, element, true);
      }
      
      // Draw group bounding box
      const minX = Math.min(...multiSelectElements.map(el => el.x));
      const minY = Math.min(...multiSelectElements.map(el => el.y));
      const maxX = Math.max(...multiSelectElements.map(el => el.x + (el.width || 100)));
      const maxY = Math.max(...multiSelectElements.map(el => el.y + (el.height || 50)));
      
      context.strokeStyle = "#2980b9";
      context.lineWidth = 2 / zoom;
      context.setLineDash([10, 5]);
      context.strokeRect(minX - 10, minY - 10, maxX - minX + 20, maxY - minY + 20);
      context.setLineDash([]);
    }
    
    // Draw remote user indicator if applicable
    if (activeUser && activeUser !== username) {
      context.fillStyle = "rgba(255, 0, 0, 0.7)";
      context.beginPath();
      context.arc(20, 20, 10, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#fff";
      context.font = "10px Inter";
      context.fillText(activeUser, 35, 25);
    }
    
    context.restore();
    
    // Draw grid and rulers on overlay canvas
    if (grid) drawGrid();
    if (rulers) drawRulers();
  };
  
  const drawSelectionBorder = (context, element, isGrouped = false) => {
    context.strokeStyle = isGrouped ? "#27ae60" : "#3498db";
    context.lineWidth = 2 / zoom;
    context.setLineDash([5, 5]);
    
    const padding = 4;
    
    if (element.type === "circle") {
      // For circles, draw a square bounding box
      context.strokeRect(
        element.x - padding,
        element.y - padding,
        element.width + padding * 2,
        element.height + padding * 2
      );
    } else {
      context.strokeRect(
        element.x - padding,
        element.y - padding,
        (element.width || 100) + padding * 2,
        (element.height || 50) + padding * 2
      );
    }
    
    context.setLineDash([]);
    
    // Draw resize handles if not in a group
    if (!isGrouped) {
      drawResizeHandles(context, element);
    }
  };
  
  const drawResizeHandles = (context, element) => {
    const handleSize = 8 / zoom;
    context.fillStyle = "#3498db";
    
    // Corner handles
    [
      { x: element.x, y: element.y }, // top-left
      { x: element.x + (element.width || 100), y: element.y }, // top-right
      { x: element.x, y: element.y + (element.height || 50) }, // bottom-left
      { x: element.x + (element.width || 100), y: element.y + (element.height || 50) } // bottom-right
    ].forEach(pos => {
      context.fillRect(
        pos.x - handleSize / 2,
        pos.y - handleSize / 2,
        handleSize,
        handleSize
      );
    });
    
    // Middle handles
    [
      { x: element.x + (element.width || 100) / 2, y: element.y }, // top-center
      { x: element.x + (element.width || 100), y: element.y + (element.height || 50) / 2 }, // middle-right
      { x: element.x + (element.width || 100) / 2, y: element.y + (element.height || 50) }, // bottom-center
      { x: element.x, y: element.y + (element.height || 50) / 2 } // middle-left
    ].forEach(pos => {
      context.fillRect(
        pos.x - handleSize / 2,
        pos.y - handleSize / 2,
        handleSize,
        handleSize
      );
    });
    
    // Rotation handle on top
    context.beginPath();
    context.arc(
      element.x + (element.width || 100) / 2,
      element.y - 20 / zoom,
      handleSize / 2,
      0,
      Math.PI * 2
    );
    context.fill();
    
    // Line from center to rotation handle
    context.beginPath();
    context.strokeStyle = "#3498db";
    context.moveTo(element.x + (element.width || 100) / 2, element.y);
    context.lineTo(element.x + (element.width || 100) / 2, element.y - 20 / zoom);
    context.stroke();
  };

  // History management
  const saveToHistory = () => {
    const dataURL = canvasRef.current.toDataURL();
    
    // Limit history size
    if (history.length >= historyLimit) {
      setHistory(prev => prev.slice(1));
    }
    
    setHistory(prev => [...prev, { page: activePage, dataURL }]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    
    const newHistory = [...history];
    const lastState = newHistory.pop();
    
    if (lastState.page !== activePage) {
      toast.error("Cannot undo - different page");
      return;
    }
    
    setRedoStack([{ page: activePage, dataURL: lastState.dataURL }, ...redoStack]);
    setHistory(newHistory);
    
    // If no more history for this page, clear canvas
    if (!newHistory.find(h => h.page === activePage)) {
      const currentPageData = getCurrentPage();
      updatePageData(currentPageData.id, { shapes: [], images: [] });
      redrawCanvas();
      return;
    }
    
    // Otherwise load the last state for this page
    const prevState = newHistory.filter(h => h.page === activePage).pop();
    if (prevState) {
      const img = new Image();
      img.onload = () => {
        contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        contextRef.current.drawImage(img, 0, 0);
      };
      img.src = prevState.dataURL;
    }
    
    toast.success("Undo successful");
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const newRedoStack = [...redoStack];
    const nextState = newRedoStack.shift();
    
    if (nextState.page !== activePage) {
      toast.error("Cannot redo - different page");
      return;
    }
    
    setHistory([...history, { page: activePage, dataURL: nextState.dataURL }]);
    setRedoStack(newRedoStack);
    
    const img = new Image();
    img.onload = () => {
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      contextRef.current.drawImage(img, 0, 0);
    };
    img.src = nextState.dataURL;
    
    toast.success("Redo successful");
  };

  // File operations
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      toast.error("No file selected");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const imageObject = {
          id: `image_${Date.now()}`,
          image: img,
          x: 100,
          y: 100,
          width: Math.min(img.width, 500),
          height: Math.min(img.height, 500) * (Math.min(img.width, 500) / img.width),
          layer: activeLayer,
          page: activePage,
        };
        
        const currentPageData = getCurrentPage();
        updatePageData(currentPageData.id, { 
          images: [...currentPageData.images, imageObject] 
        });
        
        redrawCanvas();
        setSelectedElement(imageObject);
        
        if (socketRef.current) {
          socketRef.current.emit("IMAGE_ADD", {
            roomId,
            username,
            imageObject: { 
              ...imageObject, 
              image: undefined, 
              src: event.target.result 
            },
            page: activePage,
          });
        }
        
        toast.success("Image uploaded successfully");
        saveToHistory();
      };
      
      img.onerror = () => {
        toast.error("Failed to load image");
      };
      
      img.src = event.target.result;
    };
    
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    
    reader.readAsDataURL(file);
  };

  const handleExport = () => {
    const exportData = JSON.stringify({
      pages,
      layers,
      version: "2.0"
    });
    
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "canvas-export.json";
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("Canvas exported successfully");
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) {
      toast.error("No file selected for import");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        
        // Handle both formats - just pages array or object with pages and layers
        if (Array.isArray(importedData)) {
          setPages(importedData);
        } else {
          setPages(importedData.pages || []);
          if (importedData.layers) {
            setLayers(importedData.layers);
          }
        }
        
        setActivePage(importedData.pages?.[0]?.id || importedData[0]?.id);
        redrawCanvas();
        toast.success("Canvas imported successfully");
      } catch (error) {
        toast.error("Failed to import canvas data");
        console.error("Import error:", error);
      }
    };
    
    reader.onerror = () => {
      toast.error("Failed to read import file");
    };
    
    reader.readAsText(file);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = `canvas-page-${activePage}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Canvas downloaded as PNG");
  };

  // Page and layer management
  const addPage = () => {
    const newPageId = `page${pages.length + 1}`;
    const newLayerId = `layer_${newPageId}_1`;
    
    // Create a new layer for this page
    setLayers([
      ...layers,
      { id: newLayerId, name: "Layer 1", visible: true, locked: false, opacity: 1 }
    ]);
    
    // Create the new page with the new layer
    const newPage = {
      id: newPageId,
      name: `Page ${pages.length + 1}`,
      shapes: [],
      images: [],
      bgColor: "#000000",
      layers: [newLayerId]
    };
    
    setPages([...pages, newPage]);
    setActivePage(newPageId);
    setActiveLayer(newLayerId);
    
    toast.success(`Page ${pages.length + 1} added`);
  };
  
  const addLayer = () => {
    const currentPageData = getCurrentPage();
    const newLayerId = `layer_${currentPageData.id}_${currentPageData.layers?.length + 1 || 1}`;
    
    // Create new layer
    setLayers([
      ...layers,
      { 
        id: newLayerId, 
        name: `Layer ${currentPageData.layers?.length + 1 || 1}`, 
        visible: true, 
        locked: false, 
        opacity: 1 
      }
    ]);
    
    // Add layer to current page
    updatePageData(currentPageData.id, { 
      layers: [...(currentPageData.layers || []), newLayerId] 
    });
    
    setActiveLayer(newLayerId);
    toast.success(`New layer added`);
  };

  // UI Components
  const BrushSettings = () => (
    <div className="bg-gray-700 p-3 rounded-xl">
      <h3 className="text-lg font-semibold mb-2">Brush Settings</h3>
      
      <div className="grid grid-cols-2 gap-2 mb-3">
        {brushPresets.map(preset => (
          <button
            key={preset.name}
            onClick={() => applyBrushPreset(preset)}
            className="text-sm px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded"
          >
            {preset.name}
          </button>
        ))}
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Brush Type</label>
          <select
            value={brushType}
            onChange={(e) => setBrushType(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded p-1 text-sm"
          >
            <option value="round">Round</option>
            <option value="square">Square</option>
            <option value="texture">Texture</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm mb-1">Hardness: {brushHardness.toFixed(1)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={brushHardness}
            onChange={(e) => setBrushHardness(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm mb-1">Opacity: {brushOpacity.toFixed(1)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={brushOpacity}
            onChange={(e) => setBrushOpacity(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm mb-1">Spacing: {brushSpacing.toFixed(1)}</label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={brushSpacing}
            onChange={(e) => setBrushSpacing(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm mb-1">Scatter: {brushScatter.toFixed(1)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={brushScatter}
            onChange={(e) => setBrushScatter(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
  
  const EraserSettings = () => (
    <div className="bg-gray-700 p-3 rounded-xl">
      <h3 className="text-lg font-semibold mb-2">Eraser Settings</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Eraser Type</label>
          <select
            value={eraserType}
            onChange={(e) => setEraserType(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded p-1 text-sm"
          >
            <option value="normal">Normal</option>
            <option value="pixel">Pixel Perfect</option>
            <option value="background">Background</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm mb-1">Size: {eraserSize}px</label>
          <input
            type="range"
            min="1"
            max="100"
            value={eraserSize}
            onChange={(e) => setEraserSize(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm mb-1">Hardness: {eraserHardness.toFixed(1)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={eraserHardness}
            onChange={(e) => setEraserHardness(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm mb-1">Opacity: {eraserOpacity.toFixed(1)}</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={eraserOpacity}
            onChange={(e) => setEraserOpacity(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
  
  const ShapeSettings = () => (
    <div className="bg-gray-700 p-3 rounded-xl">
      <h3 className="text-lg font-semibold mb-2">Shape Settings</h3>
      
      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="shapeFill"
            checked={shapeFill}
            onChange={(e) => setShapeFill(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="shapeFill" className="text-sm">Fill Shape</label>
        </div>
        
        {shapeFill && (
          <div>
            <label className="block text-sm mb-1">Fill Color</label>
            <input
              type="color"
              value={shapeFillColor}
              onChange={(e) => setShapeFillColor(e.target.value)}
              className="w-full h-8 rounded"
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm mb-1">Border Style</label>
          <select
            value={shapeBorderStyle}
            onChange={(e) => setShapeBorderStyle(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded p-1 text-sm"
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>
        
        {tool === "rectangle" && (
          <div>
            <label className="block text-sm mb-1">Corner Radius: {cornerRadius}px</label>
            <input
              type="range"
              min="0"
              max="50"
              value={cornerRadius}
              onChange={(e) => setCornerRadius(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
  
  // Main UI
  return (
    <div className="w-screen h-screen flex flex-col font-sans bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 overflow-hidden">
      {/* Top Toolbar */}
      <div className="h-16 bg-gradient-to-r from-gray-800 to-gray-700 flex items-center justify-between px-4 shadow-2xl transition-all duration-300">
        <div className="flex items-center gap-3 text-gray-200">
          <button
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            className="p-2 hover:bg-gray-600 rounded-full transition-transform transform hover:scale-110"
            title="Toggle Side Panel"
          >
            {showLeftSidebar ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
          <span className="text-lg font-semibold">Canvas - Room: {roomId}</span>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-600 rounded-xl p-1.5 shadow-md">
          <button
            onClick={() => setTool("select")}
            className={`p-2 rounded-lg hover:bg-blue-600 transition ${tool === "select" ? "bg-blue-700 text-white" : "text-gray-300"}`}
            title="Select (V)"
          >
            <MousePointer size={18} />
          </button>
          
          <button
            onClick={() => setTool("hand")}
            className={`p-2 rounded-lg hover:bg-blue-600 transition ${tool === "hand" ? "bg-blue-700 text-white" : "text-gray-300"}`}
            title="Hand Tool (H)"
          >
            <Hand size={18} />
          </button>
          
          <div className="relative group">
            <button
              className={`p-2 rounded-lg hover:bg-blue-600 transition ${["rectangle", "circle", "line", "polygon"].includes(tool) ? "bg-blue-700 text-white" : "text-gray-300"}`}
              title="Shapes (R)"
            >
              <Shapes size={18} />
            </button>
            <div className="absolute top-12 left-0 bg-gray-700 border border-gray-600 rounded-xl shadow-lg flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
              <button
                onClick={() => setTool("rectangle")}
                className={`p-3 hover:bg-gray-600 transition ${tool === "rectangle" ? "bg-blue-700 text-white" : "text-gray-300"}`}
                title="Rectangle (R)"
              >
                <Square size={18} />
              </button>
              <button
                onClick={() => setTool("circle")}
                className={`p-3 hover:bg-gray-600 transition ${tool === "circle" ? "bg-blue-700 text-white" : "text-gray-300"}`}
                title="Circle (C)"
              >
                <Circle size={18} />
              </button>
              <button
                onClick={() => setTool("line")}
                className={`p-3 hover:bg-gray-600 transition ${tool === "line" ? "bg-blue-700 text-white" : "text-gray-300"}`}
                title="Line (L)"
              >
                <Minus size={18} />
              </button>
              <button
                onClick={() => setTool("polygon")}
                className={`p-3 hover:bg-gray-600 transition ${tool === "polygon" ? "bg-blue-700 text-white" : "text-gray-300"}`}
                title="Polygon"
              >
                <Shapes size={18} />
              </button>
            </div>
          </div>
          
          <div className="relative group">
            <button
              className={`p-2 rounded-lg hover:bg-blue-600 transition ${tool === "pencil" ? "bg-blue-700 text-white" : "text-gray-300"}`}
              title="Brush (B)"
            >
              <Brush size={18} />
            </button>
            <div className="absolute top-12 left-0 bg-gray-700 border border-gray-600 rounded-xl shadow-lg flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 w-40">
              {brushPresets.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setTool("pencil");
                    applyBrushPreset(preset);
                  }}
                  className="flex items-center gap-2 p-2 hover:bg-gray-600 transition"
                >
                  <span className="w-4 h-4 rounded-full bg-white"></span>
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={() => setTool("eraser")}
            className={`p-2 rounded-lg hover:bg-blue-600 transition ${tool === "eraser" ? "bg-blue-700 text-white" : "text-gray-300"}`}
            title="Eraser (E)"
          >
            <Eraser size={18} />
          </button>
          
          <button
            onClick={() => setTool("arrow")}
            className={`p-2 rounded-lg hover:bg-blue-600 transition ${tool === "arrow" ? "bg-blue-700 text-white" : "text-gray-300"}`}
            title="Arrow (A)"
          >
            <ArrowRight size={18} />
          </button>
          
          <button
            onClick={() => setTool("text")}
            className={`p-2 rounded-lg hover:bg-blue-600 transition ${tool === "text" ? "bg-blue-700 text-white" : "text-gray-300"}`}
            title="Text (T)"
          >
            <Type size={18} />
          </button>
          
          <button
            onClick={() => fileInputRef.current.click()}
            className={`p-2 rounded-lg hover:bg-blue-600 transition ${tool === "image" ? "bg-blue-700 text-white" : "text-gray-300"}`}
            title="Insert Image (I)"
          >
            <ImageIcon size={18} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          
          <button
            onClick={() => setGrid(!grid)}
            className={`p-2 rounded-lg hover:bg-blue-600 transition ${grid ? "bg-blue-700 text-white" : "text-gray-300"}`}
            title="Toggle Grid (G)"
          >
            <Grid3X3 size={18} />
          </button>
          
          <button
            onClick={() => setRulers(!rulers)}
            className={`p-2 rounded-lg hover:bg-blue-600 transition ${rulers ? "bg-blue-700 text-white" : "text-gray-300"}`}
            title="Toggle Rulers"
          >
            <Ruler size={18} />
          </button>
          
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-2 rounded-lg hover:bg-blue-600 transition ${snapToGrid ? "bg-blue-700 text-white" : "text-gray-300"}`}
            title="Toggle Snap to Grid"
          >
            {snapToGrid ? <Focus size={18} /> : <ZapOff size={18} />}
          </button>
          
          <div className="h-8 w-px bg-gray-500 mx-1"></div>
          
          <button
            onClick={handleUndo}
            className={`p-2 rounded-lg hover:bg-blue-600 transition ${history.length > 0 ? "text-gray-300" : "text-gray-500"}`}
            title="Undo (Ctrl+Z)"
            disabled={history.length === 0}
          >
            <Undo2 size={18} />
          </button>
          
          <button
            onClick={handleRedo}
            className={`p-2 rounded-lg hover:bg-blue-600 transition ${redoStack.length > 0 ? "text-gray-300" : "text-gray-500"}`}
            title="Redo (Ctrl+Y)"
            disabled={redoStack.length === 0}
          >
            <Redo2 size={18} />
          </button>
          
          <div className="h-8 w-px bg-gray-500 mx-1"></div>
          
          {selectedElement && (
            <>
              <button
                onClick={() => deleteSelectedElement()}
                className="p-2 rounded-lg hover:bg-red-600 transition text-gray-300"
                title="Delete Selected (Delete)"
              >
                <Trash2 size={18} />
              </button>
              
              <button
                onClick={() => {
                  // Clone selected element
                  if (selectedElement) {
                    const currentPageData = getCurrentPage();
                    const clonedElement = {
                      ...selectedElement,
                      id: `${selectedElement.type}_${Date.now()}`,
                      x: selectedElement.x + 20,
                      y: selectedElement.y + 20
                    };
                    
                    if (selectedElement.type === "text") {
                      updatePageData(currentPageData.id, { 
                        shapes: [...currentPageData.shapes, clonedElement] 
                      });
                    } else if (selectedElement.image) {
                      updatePageData(currentPageData.id, { 
                        images: [...currentPageData.images, clonedElement] 
                      });
                    } else {
                      updatePageData(currentPageData.id, { 
                        shapes: [...currentPageData.shapes, clonedElement] 
                      });
                    }
                    
                    setSelectedElement(clonedElement);
                    redrawCanvas();
                    toast.success("Element duplicated");
                  }
                }}
                className="p-2 rounded-lg hover:bg-blue-600 transition text-gray-300"
                title="Duplicate (Ctrl+D)"
              >
                <Copy size={18} />
              </button>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-gray-200">
          <button
            onClick={() => setZoom((prev) => Math.max(prev - 0.1, 0.1))}
            className="p-2 hover:bg-gray-600 rounded-full transition-transform transform hover:scale-110"
            title="Zoom Out"
          >
            <Minus size={16} />
          </button>
          
          <span className="text-lg font-medium">{Math.round(zoom * 100)}%</span>
          
          <button
            onClick={() => setZoom((prev) => Math.min(prev + 0.1, 5))}
            className="p-2 hover:bg-gray-600 rounded-full transition-transform transform hover:scale-110"
            title="Zoom In"
          >
            <Plus size={16} />
          </button>
          
          <button
            onClick={() => setShowRightSidebar(!showRightSidebar)}
            className="p-2 hover:bg-gray-600 rounded-full transition-transform transform hover:scale-110"
            title="Toggle Properties"
          >
            {showRightSidebar ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {showLeftSidebar && (
          <div className="w-60 bg-gradient-to-b from-gray-800 to-gray-900 p-4 shadow-2xl transition-all duration-300 flex flex-col">
            <div className="space-y-4 flex-1 overflow-auto">
              <div className="bg-gray-700 p-3 rounded-xl shadow-inner">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-semibold text-gray-200">Pages</h3>
                  <button
                    onClick={addPage}
                    className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    title="Add Page"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                <div className="max-h-40 overflow-y-auto pr-1">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className={`flex items-center justify-between p-2 rounded transition cursor-pointer ${
                        activePage === page.id ? "bg-blue-700 text-white" : "hover:bg-gray-600 text-gray-300"
                      }`}
                      onClick={() => setActivePage(page.id)}
                    >
                      <span>{page.name}</span>
                      {pages.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (pages.length > 1) {
                              // Delete page
                              setPages(pages.filter(p => p.id !== page.id));
                              if (activePage === page.id) {
                                setActivePage(pages[0].id === page.id ? pages[1].id : pages[0].id);
                              }
                              toast.success("Page deleted");
                            } else {
                              toast.error("Cannot delete the only page");
                            }
                          }}
                          className="p-1 hover:bg-red-500 rounded opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-700 p-3 rounded-xl shadow-inner">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-semibold text-gray-200">Layers</h3>
                  <button
                    onClick={addLayer}
                    className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    title="Add Layer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                <div className="max-h-40 overflow-y-auto pr-1">
                  {getCurrentPage().layers?.map(layerId => {
                    const layer = layers.find(l => l.id === layerId);
                    if (!layer) return null;
                    
                    return (
                      <div
                        key={layer.id}
                        className={`flex items-center justify-between p-2 rounded transition cursor-pointer ${
                          activeLayer === layer.id ? "bg-blue-700 text-white" : "hover:bg-gray-600 text-gray-300"
                        }`}
                        onClick={() => setActiveLayer(layer.id)}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLayers(layers.map(l => 
                                l.id === layer.id ? {...l, visible: !l.visible} : l
                              ));
                              redrawCanvas();
                            }}
                            className="text-gray-300 hover:text-white transition"
                            title={layer.visible ? "Hide Layer" : "Show Layer"}
                          >
                            {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                          <span>{layer.name}</span>
                        </div>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLayers(layers.map(l => 
                                l.id === layer.id ? {...l, locked: !l.locked} : l
                              ));
                            }}
                            className={`text-gray-300 hover:text-white transition ${layer.locked ? "text-red-400" : ""}`}
                            title={layer.locked ? "Unlock Layer" : "Lock Layer"}
                          >
                            {layer.locked ? <Sliders size={16} /> : <Sliders size={16} />}
                          </button>
                          
                          {getCurrentPage().layers?.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Remove this layer
                                const currentPage = getCurrentPage();
                                const updatedLayers = currentPage.layers.filter(id => id !== layer.id);
                                updatePageData(currentPage.id, { layers: updatedLayers });
                                
                                // Set active layer to first remaining layer
                                if (activeLayer === layer.id) {
                                  setActiveLayer(updatedLayers[0]);
                                }
                                
                                toast.success("Layer removed");
                              }}
                              className="text-gray-300 hover:text-red-500 transition"
                              title="Delete Layer"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="bg-gray-700 p-3 rounded-xl shadow-inner">
                <h3 className="text-xl font-semibold mb-2 text-gray-200">Colors</h3>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {recentColors.slice(0, 8).map((c, i) => (
                    <button
                      key={`${c}-${i}`}
                      className="w-10 h-10 rounded-full border-2 border-gray-600 hover:border-white transition-transform transform hover:scale-110"
                      style={{ backgroundColor: c }}
                      onClick={() => {
                        setColor(c);
                        addRecentColor(c);
                      }}
                    />
                  ))}
                </div>
                <div>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      addRecentColor(e.target.value);
                    }}
                    className="w-full h-10 rounded-lg border-2 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Tool-specific settings */}
              {tool === "pencil" && <BrushSettings />}
              {tool === "eraser" && <EraserSettings />}
              {["rectangle", "circle", "polygon", "line", "arrow"].includes(tool) && <ShapeSettings />}
            </div>
            
            <div className="mt-4 bg-gray-700 p-3 rounded-xl shadow-inner">
              <div className="flex justify-between items-center">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition w-full justify-center"
                  title="Export Canvas"
                >
                  <Save size={16} />
                  <span>Save</span>
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => importInputRef.current.click()}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition flex-1 justify-center"
                  title="Import Canvas"
                >
                  <Upload size={16} />
                  <span>Import</span>
                </button>
                <input
                  type="file"
                  ref={importInputRef}
                  onChange={handleImport}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition flex-1 justify-center"
                  title="Download Canvas"
                >
                  <Download size={16} />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {/* Main Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full cursor-crosshair transition-all duration-300"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={finishDrawing}
            onMouseLeave={finishDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={finishDrawing}
          />
          
          {/* Overlay Canvas for temporary elements */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
          
          {/* Text Editor */}
          {textProps.isEditing && (
            <div
              className="absolute z-10 bg-gray-800 text-white p-4 border-2 border-blue-600 rounded-2xl shadow-2xl animate-fadeIn"
              style={{ 
                left: textProps.position.x * zoom + offset.x, 
                top: textProps.position.y * zoom + offset.y 
              }}
            >
              <textarea
                value={textProps.content}
                onChange={(e) => setTextProps({ ...textProps, content: e.target.value })}
                className="w-64 h-32 p-3 text-white bg-gray-700 border border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type your text..."
                autoFocus
              />
              <div className="mt-3 flex gap-2 items-center">
                <select
                  value={textProps.fontFamily}
                  onChange={(e) => setTextProps({ ...textProps, fontFamily: e.target.value })}
                  className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none"
                >
                  {fonts.map((font) => (
                    <option key={font} value={font} className="text-gray-800">
                      {font}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={textProps.fontSize}
                  onChange={(e) => setTextProps({ ...textProps, fontSize: parseInt(e.target.value) })}
                  className="w-16 p-2 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none"
                />
              </div>
              <div className="mt-2 flex gap-2 items-center">
                <button
                  onClick={() => setTextProps({ ...textProps, bold: !textProps.bold })}
                  className={`p-2 hover:bg-gray-600 rounded-xl ${textProps.bold ? "bg-blue-600" : ""}`}
                  title="Bold"
                >
                  <Bold size={16} />
                </button>
                <button
                  onClick={() => setTextProps({ ...textProps, italic: !textProps.italic })}
                  className={`p-2 hover:bg-gray-600 rounded-xl ${textProps.italic ? "bg-blue-600" : ""}`}
                  title="Italic"
                >
                  <Italic size={16} />
                </button>
                <button
                  onClick={() => setTextProps({ ...textProps, underline: !textProps.underline })}
                  className={`p-2 hover:bg-gray-600 rounded-xl ${textProps.underline ? "bg-blue-600" : ""}`}
                  title="Underline"
                >
                  <Underline size={16} />
                </button>
                <div className="flex ml-auto">
                  <button
                    onClick={() => setTextProps({ ...textProps, align: "left" })}
                    className={`p-2 hover:bg-gray-600 rounded-l-xl ${textProps.align === "left" ? "bg-blue-600" : ""}`}
                    title="Align Left"
                  >
                    <AlignLeft size={16} />
                  </button>
                  <button
                    onClick={() => setTextProps({ ...textProps, align: "center" })}
                    className={`p-2 hover:bg-gray-600 ${textProps.align === "center" ? "bg-blue-600" : ""}`}
                    title="Align Center"
                  >
                    <AlignCenter size={16} />
                  </button>
                  <button
                    onClick={() => setTextProps({ ...textProps, align: "right" })}
                    className={`p-2 hover:bg-gray-600 rounded-r-xl ${textProps.align === "right" ? "bg-blue-600" : ""}`}
                    title="Align Right"
                  >
                    <AlignRight size={16} />
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  const textObject = {
                    type: "text",
                    id: selectedElement ? selectedElement.id : `text_${Date.now()}`,
                    content: textProps.content,
                    x: textProps.position.x,
                    y: textProps.position.y,
                    color,
                    fontFamily: textProps.fontFamily,
                    fontSize: textProps.fontSize,
                    bold: textProps.bold,
                    italic: textProps.italic,
                    underline: textProps.underline,
                    align: textProps.align,
                    layer: activeLayer,
                    page: activePage,
                    width: contextRef.current.measureText(textProps.content).width,
                    height: textProps.fontSize + 10,
                  };
                  
                  const currentPageData = getCurrentPage();
                  if (selectedElement && selectedElement.type === "text") {
                    updatePageData(currentPageData.id, {
                      shapes: currentPageData.shapes.map((s) => 
                        s.id === selectedElement.id ? textObject : s
                      ),
                    });
                  } else {
                    updatePageData(currentPageData.id, { 
                      shapes: [...currentPageData.shapes, textObject] 
                    });
                  }
                  
                  setTextProps({ ...textProps, isEditing: false });
                  setSelectedElement(textObject);
                  
                  if (socketRef.current) {
                    socketRef.current.emit("TEXT_ADD", { 
                      roomId, 
                      username, 
                      textObject, 
                      page: activePage 
                    });
                  }
                  
                  saveToHistory();
                }}
                className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-transform transform hover:scale-105"
              >
                Done
              </button>
            </div>
          )}
          
          {/* User indicator */}
          {activeUser && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-gray-800 text-white p-3 rounded-xl shadow-lg animate-pulse">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm">{activeUser} is drawing</span>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        {showRightSidebar && (
          <div className="w-64 bg-gradient-to-b from-gray-800 to-gray-900 p-5 shadow-2xl transition-all duration-300 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-gray-200">Properties</h3>
                {selectedElement ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm mb-1 text-gray-400">Type</label>
                      <div className="bg-gray-700 px-3 py-2 rounded-lg text-white">
                        {selectedElement.type?.charAt(0).toUpperCase() + selectedElement.type?.slice(1) || "Shape"}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm mb-1 text-gray-400">Position</label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500">X</label>
                          <input
                            type="number"
                            value={Math.round(selectedElement.x)}
                            onChange={(e) => {
                              const newX = parseInt(e.target.value);
                              const currentPageData = getCurrentPage();
                              updatePageData(currentPageData.id, {
                                shapes: currentPageData.shapes.map((s) =>
                                  s.id === selectedElement.id ? { ...s, x: newX } : s
                                ),
                                images: currentPageData.images.map((i) =>
                                  i.id === selectedElement.id ? { ...i, x: newX } : i
                                ),
                              });
                              redrawCanvas();
                            }}
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500">Y</label>
                          <input
                            type="number"
                            value={Math.round(selectedElement.y)}
                            onChange={(e) => {
                              const newY = parseInt(e.target.value);
                              const currentPageData = getCurrentPage();
                              updatePageData(currentPageData.id, {
                                shapes: currentPageData.shapes.map((s) =>
                                  s.id === selectedElement.id ? { ...s, y: newY } : s
                                ),
                                images: currentPageData.images.map((i) =>
                                  i.id === selectedElement.id ? { ...i, y: newY } : i
                                ),
                              });
                              redrawCanvas();
                            }}
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {selectedElement.width !== undefined && (
                      <div className="mb-4">
                        <label className="block text-sm mb-1 text-gray-400">Size</label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500">Width</label>
                            <input
                              type="number"
                              value={Math.round(selectedElement.width)}
                              onChange={(e) => {
                                const newWidth = parseInt(e.target.value);
                                const currentPageData = getCurrentPage();
                                updatePageData(currentPageData.id, {
                                  shapes: currentPageData.shapes.map((s) =>
                                    s.id === selectedElement.id ? { ...s, width: newWidth } : s
                                  ),
                                  images: currentPageData.images.map((i) =>
                                    i.id === selectedElement.id ? { ...i, width: newWidth } : i
                                  ),
                                });
                                redrawCanvas();
                              }}
                              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500">Height</label>
                            <input
                              type="number"
                              value={Math.round(selectedElement.height)}
                              onChange={(e) => {
                                const newHeight = parseInt(e.target.value);
                                const currentPageData = getCurrentPage();
                                updatePageData(currentPageData.id, {
                                  shapes: currentPageData.shapes.map((s) =>
                                    s.id === selectedElement.id ? { ...s, height: newHeight } : s
                                  ),
                                  images: currentPageData.images.map((i) =>
                                    i.id === selectedElement.id ? { ...i, height: newHeight } : i
                                  ),
                                });
                                redrawCanvas();
                              }}
                              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {selectedElement.type !== "image" && (
                      <div className="mb-4">
                        <label className="block text-sm mb-1 text-gray-400">Fill Color</label>
                        <input
                          type="color"
                          value={selectedElement.color || color}
                          onChange={(e) => {
                            const newColor = e.target.value;
                            setColor(newColor);
                            addRecentColor(newColor);
                            
                            if (selectedElement) {
                              const currentPageData = getCurrentPage();
                              updatePageData(currentPageData.id, {
                                shapes: currentPageData.shapes.map((s) =>
                                  s.id === selectedElement.id ? { ...s, color: newColor } : s
                                ),
                              });
                              redrawCanvas();
                            }
                          }}
                          className="w-full h-10 rounded-xl border-2 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    
                    {selectedElement.type !== "text" && selectedElement.type !== "image" && (
                      <div className="mb-4">
                        <label className="block text-sm mb-1 text-gray-400">Stroke Width</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="1"
                            max="20"
                            value={selectedElement.lineWidth || lineWidth}
                            onChange={(e) => {
                              const newLineWidth = parseInt(e.target.value);
                              setLineWidth(newLineWidth);
                              
                              if (selectedElement) {
                                const currentPageData = getCurrentPage();
                                updatePageData(currentPageData.id, {
                                  shapes: currentPageData.shapes.map((s) =>
                                    s.id === selectedElement.id ? { ...s, lineWidth: newLineWidth } : s
                                  ),
                                });
                                redrawCanvas();
                              }
                            }}
                            className="w-full accent-blue-600"
                          />
                          <span className="text-sm text-gray-300">
                            {selectedElement.lineWidth || lineWidth}px
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {selectedElement.type === "text" && (
                      <div className="mb-4">
                        <label className="block text-sm mb-1 text-gray-400">Text Properties</label>
                        <button
                          onClick={() => {
                            setTextProps({
                              ...selectedElement,
                              isEditing: true,
                              position: { x: selectedElement.x, y: selectedElement.y }
                            });
                          }}
                          className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                          Edit Text
                        </button>
                      </div>
                    )}
                    
                    {(selectedElement.type === "rectangle" || selectedElement.type === "circle") && (
                      <div className="mb-4">
                        <div className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            id="elementFill"
                            checked={selectedElement.fill}
                            onChange={(e) => {
                              const currentPageData = getCurrentPage();
                              updatePageData(currentPageData.id, {
                                shapes: currentPageData.shapes.map((s) =>
                                  s.id === selectedElement.id ? { ...s, fill: e.target.checked } : s
                                ),
                              });
                              redrawCanvas();
                            }}
                            className="mr-2"
                          />
                          <label htmlFor="elementFill" className="text-sm text-gray-400">Fill Shape</label>
                        </div>
                        
                        {selectedElement.fill && (
                          <input
                            type="color"
                            value={selectedElement.fillColor || shapeFillColor}
                            onChange={(e) => {
                              const currentPageData = getCurrentPage();
                              updatePageData(currentPageData.id, {
                                shapes: currentPageData.shapes.map((s) =>
                                  s.id === selectedElement.id ? { ...s, fillColor: e.target.value } : s
                                ),
                              });
                              redrawCanvas();
                            }}
                            className="w-full h-8 rounded-lg border border-gray-600"
                          />
                        )}
                      </div>
                    )}
                    
                    {selectedElement.type === "rectangle" && (
                      <div className="mb-4">
                        <label className="block text-sm mb-1 text-gray-400">
                          Corner Radius: {selectedElement.cornerRadius || 0}px
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={selectedElement.cornerRadius || 0}
                          onChange={(e) => {
                            const currentPageData = getCurrentPage();
                            updatePageData(currentPageData.id, {
                              shapes: currentPageData.shapes.map((s) =>
                                s.id === selectedElement.id ? { ...s, cornerRadius: parseInt(e.target.value) } : s
                              ),
                            });
                            redrawCanvas();
                          }}
                          className="w-full accent-blue-600"
                        />
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <label className="block text-sm mb-1 text-gray-400">Layer</label>
                      <select
                        value={selectedElement.layer || "layer1"}
                        onChange={(e) => {
                          const currentPageData = getCurrentPage();
                          updatePageData(currentPageData.id, {
                            shapes: currentPageData.shapes.map((s) =>
                              s.id === selectedElement.id ? { ...s, layer: e.target.value } : s
                            ),
                            images: currentPageData.images.map((i) =>
                              i.id === selectedElement.id ? { ...i, layer: e.target.value } : i
                            ),
                          });
                          redrawCanvas();
                        }}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                      >
                        {layers
                          .filter(layer => getCurrentPage().layers?.includes(layer.id))
                          .map(layer => (
                            <option key={layer.id} value={layer.id}>
                              {layer.name}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={deleteSelectedElement}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1"
                        title="Delete Element"
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          if (selectedElement) {
                            const currentPageData = getCurrentPage();
                            const clonedElement = {
                              ...selectedElement,
                              id: `${selectedElement.type}_${Date.now()}`,
                              x: selectedElement.x + 20,
                              y: selectedElement.y + 20
                            };
                            
                            if (selectedElement.image) {
                              updatePageData(currentPageData.id, {
                                images: [...currentPageData.images, clonedElement]
                              });
                            } else {
                              updatePageData(currentPageData.id, {
                                shapes: [...currentPageData.shapes, clonedElement]
                              });
                            }
                            
                            setSelectedElement(clonedElement);
                            redrawCanvas();
                            toast.success("Element duplicated");
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-1"
                        title="Duplicate Element"
                      >
                        <Copy size={16} />
                        <span>Copy</span>
                      </button>
                    </div>
                  </>
                ) : multiSelectElements.length > 0 ? (
                  <>
                    <div className="bg-gray-700 px-3 py-2 rounded-lg text-white mb-3">
                      {multiSelectElements.length} elements selected
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={deleteSelectedElement}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1"
                      >
                        <Trash2 size={16} />
                        <span>Delete All</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setMultiSelectElements([]);
                          toast.success("Selection cleared");
                        }}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-1"
                      >
                        <Settings size={16} />
                        <span>Clear</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-700 p-3 rounded-xl shadow-inner">
                    <h3 className="text-lg font-medium mb-2">Global</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm mb-1">Background</label>
                        <input
                          type="color"
                          value={getCurrentPage().bgColor}
                          onChange={(e) => {
                            updatePageData(activePage, { bgColor: e.target.value });
                            redrawCanvas();
                          }}
                          className="w-full h-8 rounded border border-gray-600"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-1">Grid Size: {gridSize}px</label>
                        <input
                          type="range"
                          min="5"
                          max="50"
                          step="5"
                          value={gridSize}
                          onChange={(e) => setGridSize(parseInt(e.target.value))}
                          className="w-full accent-blue-600"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-1">Line Width: {lineWidth}px</label>
                        <input
                          type="range"
                          min="1"
                          max="50"
                          value={lineWidth}
                          onChange={(e) => setLineWidth(parseInt(e.target.value))}
                          className="w-full accent-blue-600"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-1">Opacity: {Math.round(opacity * 100)}%</label>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.1"
                          value={opacity}
                          onChange={(e) => setOpacity(parseFloat(e.target.value))}
                          className="w-full accent-blue-600"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-1">Blend Mode</label>
                        <select
                          value={blendMode}
                          onChange={(e) => setBlendMode(e.target.value)}
                          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none text-sm"
                        >
                          {blendModes.map(mode => (
                            <option key={mode.value} value={mode.value}>
                              {mode.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-gray-700 text-gray-200 rounded-xl px-4 py-2 shadow-lg transition-all duration-300">
        <button
          onClick={() => setZoom(0.5)}
          className="p-2 hover:bg-gray-600 rounded transition"
          title="50%"
        >
          50%
        </button>
        <button
          onClick={() => setZoom(1)}
          className="p-2 hover:bg-gray-600 rounded transition"
          title="100%"
        >
          100%
        </button>
        <button
          onClick={() => setZoom(1.5)}
          className="p-2 hover:bg-gray-600 rounded transition"
          title="150%"
        >
          150%
        </button>
        <div className="h-8 w-px bg-gray-500 mx-1"></div>
        <button
          onClick={() => setZoom((prev) => Math.max(prev - 0.1, 0.1))}
          className="p-2 hover:bg-gray-600 rounded transition"
          title="Zoom Out"
        >
          <ZoomIn size={18} />
        </button>
        <span className="text-lg font-medium min-w-16 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((prev) => Math.min(prev + 0.1, 5))}
          className="p-2 hover:bg-gray-600 rounded transition"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <div className="h-8 w-px bg-gray-500 mx-1"></div>
        <button
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition"
          title="Reset View"
        >
          Reset View
        </button>
      </div>
    </div>
  );
};

export default DrawingTool;