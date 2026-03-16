import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { Download, MousePointer2, Square, Circle, Type, Trash2, Undo, Redo, Palette } from 'lucide-react';
import jsPDF from 'jspdf';
import 'svg2pdf.js';

interface EditorProps {
  svgContent: string | null;
}

export function Editor({ svgContent }: EditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeObject, setActiveObject] = useState<fabric.Object | null>(null);
  const [color, setColor] = useState('#000000');

  useEffect(() => {
    if (!canvasRef.current) return;

    const initCanvas = new fabric.Canvas(canvasRef.current, {
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    setCanvas(initCanvas);

    initCanvas.on('selection:created', (e) => {
      if (e.selected && e.selected.length > 0) {
        setActiveObject(e.selected[0]);
        const fill = e.selected[0].get('fill');
        if (typeof fill === 'string') setColor(fill);
      }
    });

    initCanvas.on('selection:updated', (e) => {
      if (e.selected && e.selected.length > 0) {
        setActiveObject(e.selected[0]);
        const fill = e.selected[0].get('fill');
        if (typeof fill === 'string') setColor(fill);
      }
    });

    initCanvas.on('selection:cleared', () => {
      setActiveObject(null);
    });

    return () => {
      initCanvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (canvas && svgContent) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      
      fabric.loadSVGFromString(svgContent).then(({ objects, options }) => {
        if (!objects || objects.length === 0) {
          console.error("No objects found in SVG");
          return;
        }

        const group = fabric.util.groupSVGElements(objects, options);
        
        const parseDim = (dim: any, fallback: number) => {
          if (typeof dim === 'number') return dim;
          if (typeof dim === 'string') {
            const parsed = parseFloat(dim);
            return isNaN(parsed) ? fallback : parsed;
          }
          return fallback;
        };

        // Use true dimensions for print quality
        const trueWidth = parseDim(options.width, group.width || 800);
        const trueHeight = parseDim(options.height, group.height || 600);

        canvas.setDimensions({ width: trueWidth, height: trueHeight });

        const updateVisualSize = () => {
          const container = document.getElementById('canvas-container');
          if (container && canvas) {
            const containerWidth = container.clientWidth - 40;
            const containerHeight = container.clientHeight - 40;
            const scale = Math.min(containerWidth / trueWidth, containerHeight / trueHeight);
            
            // Only scale down, don't scale up beyond true size
            const finalScale = Math.min(scale, 1);
            const visualWidth = trueWidth * finalScale;
            const visualHeight = trueHeight * finalScale;
            
            canvas.setDimensions({ width: `${visualWidth}px`, height: `${visualHeight}px` }, { cssOnly: true });
          }
        };

        updateVisualSize();
        window.addEventListener('resize', updateVisualSize);

        // Center the group
        group.set({ 
          left: trueWidth / 2, 
          top: trueHeight / 2,
          originX: 'center',
          originY: 'center'
        });
        
        canvas.add(group);
        canvas.renderAll();

        // Cleanup listener on unmount or re-render
        return () => window.removeEventListener('resize', updateVisualSize);
      }).catch(err => {
        console.error("Failed to load SVG", err);
        alert("Failed to load the generated design. The AI might have produced invalid SVG.");
      });
    }
  }, [canvas, svgContent]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setColor(newColor);
    if (activeObject && canvas) {
      if (activeObject.type === 'path' || activeObject.type === 'rect' || activeObject.type === 'circle' || activeObject.type === 'i-text') {
        activeObject.set('fill', newColor);
        canvas.renderAll();
      } else if (activeObject.type === 'group') {
        const objects = (activeObject as fabric.Group).getObjects();
        objects.forEach(obj => {
          if (obj.type === 'path' || obj.type === 'rect' || obj.type === 'circle' || obj.type === 'i-text') {
            obj.set('fill', newColor);
          }
        });
        canvas.renderAll();
      }
    }
  };

  const deleteSelected = () => {
    if (canvas && activeObject) {
      canvas.remove(activeObject);
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  const exportPDF = () => {
    if (!canvas) return;
    const width = canvas.width || 800;
    const height = canvas.height || 600;
    const orientation = width > height ? 'landscape' : 'portrait';

    const svgString = canvas.toSVG();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
    const svgElement = svgDoc.documentElement;

    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'px',
      format: [width, height]
    });
    
    // Use svg2pdf to add the SVG to the PDF
    pdf.svg(svgElement, {
      x: 0,
      y: 0,
      width: width,
      height: height
    }).then(() => {
      pdf.save('print-ready-design.pdf');
    }).catch(err => {
      console.error("Failed to export PDF", err);
      alert("Failed to export PDF.");
    });
  };

  const exportSVG = () => {
    if (!canvas) return;
    const svg = canvas.toSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded hover:bg-gray-100 text-gray-600" title="Select">
            <MousePointer2 className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-2" />
          <button className="p-2 rounded hover:bg-gray-100 text-gray-600" title="Add Rectangle" onClick={() => {
            if(canvas) {
              canvas.add(new fabric.Rect({ width: 100, height: 100, fill: '#3b82f6', left: 100, top: 100 }));
            }
          }}>
            <Square className="w-5 h-5" />
          </button>
          <button className="p-2 rounded hover:bg-gray-100 text-gray-600" title="Add Circle" onClick={() => {
            if(canvas) {
              canvas.add(new fabric.Circle({ radius: 50, fill: '#ef4444', left: 100, top: 100 }));
            }
          }}>
            <Circle className="w-5 h-5" />
          </button>
          <button className="p-2 rounded hover:bg-gray-100 text-gray-600" title="Add Text" onClick={() => {
            if(canvas) {
              canvas.add(new fabric.IText('Double click to edit', { left: 100, top: 100, fill: '#111827', fontSize: 24, fontFamily: 'Inter' }));
            }
          }}>
            <Type className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-2" />
          <div className="flex items-center space-x-2 px-2">
            <Palette className="w-5 h-5 text-gray-500" />
            <input 
              type="color" 
              value={color} 
              onChange={handleColorChange}
              disabled={!activeObject}
              className="w-8 h-8 rounded cursor-pointer disabled:opacity-50"
            />
          </div>
          <button 
            className="p-2 rounded hover:bg-red-50 text-red-600 disabled:opacity-50 disabled:hover:bg-transparent" 
            title="Delete Selected"
            onClick={deleteSelected}
            disabled={!activeObject}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={exportSVG}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export SVG
          </button>
          <button 
            onClick={exportPDF}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </button>
        </div>
      </div>
      
      {/* Canvas Area */}
      <div id="canvas-container" className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
        <div className="shadow-lg bg-white">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}
