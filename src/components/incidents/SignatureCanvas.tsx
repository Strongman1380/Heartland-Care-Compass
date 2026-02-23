/**
 * Signature Canvas Component
 * Allows staff to sign incident reports with mouse or touch
 */

import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PenTool, Trash2, Check, AlertCircle } from 'lucide-react';

interface SignatureCanvasProps {
  onSave: (signature: {
    staffName: string;
    staffId: string;
    signatureData: string;
    timestamp: string;
  }) => void;
  staffName?: string;
  staffId?: string;
  readOnly?: boolean;
}

export default function SignatureCanvas({
  onSave,
  staffName: initialStaffName = '',
  staffId: initialStaffId = '',
  readOnly = false
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [staffName, setStaffName] = useState(initialStaffName);
  const [staffId, setStaffId] = useState(initialStaffId);
  const [error, setError] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Set drawing style
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    
    setIsDrawing(true);
    setHasSignature(true);
    setError('');

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setError('');
  };

  const saveSignature = () => {
    if (!staffName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!staffId.trim()) {
      setError('Please enter your staff ID');
      return;
    }

    if (!hasSignature) {
      setError('Please provide a signature');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert canvas to base64 image
    const signatureData = canvas.toDataURL('image/png');

    onSave({
      staffName: staffName.trim(),
      staffId: staffId.trim(),
      signatureData,
      timestamp: new Date().toISOString()
    });

    // Clear form
    setStaffName('');
    setStaffId('');
    clearSignature();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="w-5 h-5 text-red-600" />
          Add Signature
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="staffName">
              Staff Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="staffName"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Your full name"
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staffId">
              Staff ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="staffId"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              placeholder="Your staff ID"
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Signature <span className="text-red-500">*</span>
          </Label>
          <div className="border-2 border-slate-300 rounded-lg bg-white">
            <canvas
              ref={canvasRef}
              className="w-full h-40 cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{ touchAction: 'none' }}
            />
          </div>
          <p className="text-xs text-slate-500">
            Sign using your mouse or touch screen
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={clearSignature}
            disabled={!hasSignature || readOnly}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
          <Button
            type="button"
            onClick={saveSignature}
            disabled={!hasSignature || readOnly}
          >
            <Check className="w-4 h-4 mr-2" />
            Add Signature
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}