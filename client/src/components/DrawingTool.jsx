import React, { useRef, useState, useEffect } from 'react';

const DrawingTool = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    setContext(ctx);
    canvas.width = 400;
    canvas.height = 400;

    return () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, []);

  const startDrawing = (e) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    context.beginPath();
  };

  const draw = (e) => {
    if (!isDrawing) return;
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.strokeStyle = '#000';

    context.lineTo(e.clientX - canvasRef.current.offsetLeft, e.clientY - canvasRef.current.offsetTop);
    context.stroke();
    context.beginPath();
    context.moveTo(e.clientX - canvasRef.current.offsetLeft, e.clientY - canvasRef.current.offsetTop);
  };

  return (
    <div className="drawing-tool p-4">
      <h4 className="mb-4">Drawing Tool</h4>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        className="border border-black"
      ></canvas>
    </div>
  );
};

export default DrawingTool;
