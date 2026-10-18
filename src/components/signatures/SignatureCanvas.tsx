"use client";

import React, { useRef, useState, useEffect } from "react";
import { RotateCcw, PenTool, Type, Check } from "lucide-react";

interface SignatureCanvasProps {
  onSignatureChange: (dataUrl: string | null) => void;
  signerName?: string;
  className?: string;
}

export function SignatureCanvas({
  onSignatureChange,
  signerName = "",
  className = "",
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState(signerName);
  const [selectedFont, setSelectedFont] = useState<"cursive" | "serif" | "sans">("cursive");

  // Initialize canvas with DPI scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "#0f172a";

    // Set background transparent
    ctx.clearRect(0, 0, rect.width, rect.height);
  }, []);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasContent(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if not captured
    }
    emitSignature();
  };

  const emitSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSignatureChange(dataUrl);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasContent(false);
    onSignatureChange(null);
  };

  // Render typed signature into canvas
  const renderTypedSignature = (text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!text.trim()) {
      setHasContent(false);
      onSignatureChange(null);
      return;
    }

    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let fontStyle = "italic 32px 'Brush Script MT', 'Dancing Script', cursive";
    if (selectedFont === "serif") fontStyle = "italic 28px 'Georgia', serif";
    if (selectedFont === "sans") fontStyle = "italic 26px 'Segoe UI', sans-serif";

    ctx.font = fontStyle;
    ctx.fillText(text, rect.width / 2, rect.height / 2);

    setHasContent(true);
    emitSignature();
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setTypedName(text);
    renderTypedSignature(text);
  };

  const handleSwitchMode = (newMode: "draw" | "type") => {
    setMode(newMode);
    handleClear();
    if (newMode === "type" && typedName) {
      setTimeout(() => renderTypedSignature(typedName), 50);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Mode Switcher */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
        <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded-md">
          <button
            type="button"
            onClick={() => handleSwitchMode("draw")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
              mode === "draw"
                ? "bg-white text-[#0F172A] shadow-2xs font-semibold"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <PenTool className="h-3 w-3" />
            <span>Draw</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode("type")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
              mode === "type"
                ? "bg-white text-[#0F172A] shadow-2xs font-semibold"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <Type className="h-3 w-3" />
            <span>Type</span>
          </button>
        </div>

        {hasContent && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#E11D48] font-medium transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {mode === "type" && (
        <div className="space-y-2">
          <input
            type="text"
            value={typedName}
            onChange={handleTypeChange}
            placeholder="Type your official full name"
            className="w-full px-3 py-1.5 text-xs rounded border border-[#CBD5E1] focus:ring-1 focus:ring-[#4F46E5] focus:outline-hidden"
          />
          <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
            <span>Style:</span>
            {(["cursive", "serif", "sans"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setSelectedFont(f);
                  renderTypedSignature(typedName);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                  selectedFont === f
                    ? "border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5]"
                    : "border-[#E2E8F0] text-[#64748B]"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Signature Canvas Area */}
      <div className="relative rounded-lg border-2 border-dashed border-[#CBD5E1] bg-white overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`w-full h-36 touch-none ${
            mode === "draw" ? "cursor-crosshair" : "cursor-default"
          }`}
        />

        {/* Guideline line */}
        <div className="absolute bottom-6 left-6 right-6 border-b border-[#E2E8F0] pointer-events-none flex items-center justify-between text-[10px] text-[#94A3B8]">
          <span>Sign above the line</span>
          <span>✕ Official E-Signature</span>
        </div>

        {!hasContent && mode === "draw" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-xs text-[#94A3B8] gap-1">
            <PenTool className="h-4 w-4 opacity-40" />
            <span>Draw your signature using mouse, trackpad, or touchscreen</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#64748B]">
        <span>Format: High-resolution vectorized PNG</span>
        {hasContent && (
          <span className="flex items-center gap-1 text-[#059669] font-medium">
            <Check className="h-3 w-3" /> Signature Captured
          </span>
        )}
      </div>
    </div>
  );
}
