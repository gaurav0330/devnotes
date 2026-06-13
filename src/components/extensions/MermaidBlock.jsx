import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize, Lock, Unlock, Code2, Trash2 } from "lucide-react";

// Initialization will be handled inside the component dynamically
mermaid.initialize({ 
  startOnLoad: false,
  themeVariables: {
    fontFamily: 'inherit'
  }
});

const MermaidComponent = (props) => {
  const { node, updateAttributes, editor } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const code = node.attrs.code;
  const diagramId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDark(document.documentElement.classList.contains('dark'));
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      if (!code || !code.trim()) {
        setSvg('');
        setError('');
        return;
      }
      
      mermaid.initialize({ 
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        themeVariables: {
          fontFamily: 'inherit'
        }
      });

      try {
        const { svg: generatedSvg } = await mermaid.render(diagramId.current, code);
        if (isMounted) {
          setSvg(generatedSvg);
          setError('');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Syntax Error');
        }
      }
    };
    
    // Slight debounce for rendering to avoid crashes while typing
    const timer = setTimeout(renderDiagram, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [code, isDark]);

  return (
    <NodeViewWrapper className="my-8 rounded-2xl border border-border/40 bg-gradient-to-br from-card to-card/50 p-3 relative shadow-lg backdrop-blur-xl transition-all focus-within:ring-2 focus-within:ring-primary/30 group" data-drag-handle>
      <div className="absolute -top-3 -right-2 flex gap-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-background border border-border hover:bg-muted rounded-full transition-all shadow-sm"
          type="button"
          contentEditable={false}
        >
          <Code2 size={14} />
          {isEditing ? 'Preview' : 'Edit'}
        </button>
        <button
          onClick={() => props.deleteNode()}
          className="flex items-center justify-center p-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 rounded-full transition-all shadow-sm"
          type="button"
          contentEditable={false}
          title="Delete diagram"
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      {isEditing ? (
        <div className="mt-8">
          <textarea
            value={code}
            onChange={(e) => updateAttributes({ code: e.target.value })}
            className="w-full h-40 p-3 bg-background font-mono text-sm border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            placeholder="graph TD;\n  A-->B;"
          />
          <div className="mt-2 text-xs text-muted-foreground flex justify-between">
            <span>Powered by Mermaid.js</span>
            <a href="https://mermaid.js.org/intro/" target="_blank" rel="noreferrer" className="text-primary hover:underline">Documentation</a>
          </div>
        </div>
      ) : (
        <div className={`mt-2 bg-slate-50 dark:bg-zinc-900 rounded-xl shadow-inner overflow-hidden relative border ${isLocked ? 'border-border/40' : 'border-primary/40 ring-1 ring-primary/20'}`}>
           {error ? (
             <div className="text-destructive text-sm whitespace-pre-wrap font-mono bg-destructive/10 p-6 w-full h-full min-h-[120px] flex items-center justify-center">{error}</div>
           ) : svg ? (
             <TransformWrapper
               initialScale={1}
               minScale={0.5}
               maxScale={8}
               centerOnInit={true}
               disabled={isLocked}
               panning={{ disabled: isLocked }}
               wheel={{ disabled: isLocked }}
               pinch={{ disabled: isLocked }}
             >
               {({ zoomIn, zoomOut, resetTransform }) => (
                 <React.Fragment>
                   <div className="absolute top-3 left-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                       type="button" 
                       onClick={() => setIsLocked(!isLocked)} 
                       className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg shadow-sm text-xs font-semibold transition-all ${isLocked ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20' : 'bg-background border-border text-foreground hover:bg-muted'}`} 
                       title={isLocked ? "Unlock to enable zoom & pan" : "Lock diagram to scroll page normally"}
                     >
                       {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                       {isLocked ? 'Locked' : 'Unlocked'}
                     </button>
                     
                     <div className={`flex gap-1 transition-all duration-300 ${isLocked ? 'opacity-0 translate-x-[-10px] pointer-events-none' : 'opacity-100 translate-x-0'}`}>
                       <button type="button" onClick={() => zoomIn()} className="p-1.5 bg-background border border-border rounded-lg hover:bg-muted text-muted-foreground shadow-sm transition-colors" title="Zoom In">
                         <ZoomIn size={16} />
                       </button>
                       <button type="button" onClick={() => zoomOut()} className="p-1.5 bg-background border border-border rounded-lg hover:bg-muted text-muted-foreground shadow-sm transition-colors" title="Zoom Out">
                         <ZoomOut size={16} />
                       </button>
                       <button type="button" onClick={() => resetTransform()} className="p-1.5 bg-background border border-border rounded-lg hover:bg-muted text-muted-foreground shadow-sm transition-colors" title="Reset Zoom">
                         <Maximize size={16} />
                       </button>
                     </div>
                   </div>
                   
                   <TransformComponent wrapperClass={`!w-full !h-full min-h-[300px] transition-colors ${isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`} contentClass="w-full h-full flex justify-center items-center">
                     <div 
                       dangerouslySetInnerHTML={{ __html: svg }} 
                       className={`mermaid-svg-container [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-w-none p-8 transition-opacity duration-300 ${isLocked ? 'opacity-90 hover:opacity-100' : 'opacity-100'}`} 
                     />
                   </TransformComponent>
                 </React.Fragment>
               )}
             </TransformWrapper>
           ) : (
             <div className="p-8 flex justify-center items-center min-h-[160px] text-muted-foreground italic text-sm">Empty Diagram. Click 'Edit Code' to start.</div>
           )}
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const MermaidBlock = Node.create({
  name: 'mermaidBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      code: {
        default: 'graph TD;\n  A-->B;',
        parseHTML: element => element.getAttribute('data-code') || '',
        renderHTML: attributes => {
          return {
            'data-code': attributes.code,
          }
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidComponent);
  },
});
