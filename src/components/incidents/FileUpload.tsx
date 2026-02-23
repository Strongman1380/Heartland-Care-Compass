/**
 * File Upload Component
 * Handles file attachments with preview and size validation
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  X, 
  FileText, 
  Image as ImageIcon, 
  AlertCircle,
  CheckCircle2,
  File
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  attachments: any[];
  onUpload: (files: File[]) => Promise<void>;
  onRemove: (attachmentId: string) => void;
  maxFiles?: number;
  maxTotalSize?: number; // in bytes
  readOnly?: boolean;
}

export default function FileUpload({
  attachments,
  onUpload,
  onRemove,
  maxFiles = 10,
  maxTotalSize = 10 * 1024 * 1024, // 10MB
  readOnly = false
}: FileUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf'
  ];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getTotalSize = (): number => {
    return attachments.reduce((sum, att) => sum + (att.fileSize || 0), 0);
  };

  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const errors: string[] = [];
    const valid: File[] = [];

    // Check number of files
    if (attachments.length + files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return { valid: [], errors };
    }

    // Check each file
    for (const file of files) {
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed.`);
        continue;
      }

      // Check individual file size (max 5MB per file)
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`${file.name}: File too large. Maximum 5MB per file.`);
        continue;
      }

      valid.push(file);
    }

    // Check total size
    const currentSize = getTotalSize();
    const newSize = valid.reduce((sum, file) => sum + file.size, 0);
    if (currentSize + newSize > maxTotalSize) {
      errors.push(`Total size would exceed ${formatFileSize(maxTotalSize)} limit`);
      return { valid: [], errors };
    }

    return { valid, errors };
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const { valid, errors } = validateFiles(fileArray);

    if (errors.length > 0) {
      errors.forEach(error => {
        toast({
          title: 'Upload error',
          description: error,
          variant: 'destructive'
        });
      });
    }

    if (valid.length > 0) {
      setUploading(true);
      setUploadProgress(0);

      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        await onUpload(valid);

        clearInterval(progressInterval);
        setUploadProgress(100);

        toast({
          title: 'Upload successful',
          description: `${valid.length} file(s) uploaded successfully.`
        });

        setTimeout(() => {
          setUploadProgress(0);
        }, 1000);
      } catch (error: any) {
        toast({
          title: 'Upload failed',
          description: error.message || 'Failed to upload files.',
          variant: 'destructive'
        });
      } finally {
        setUploading(false);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (readOnly) return;

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-8 h-8 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    return <File className="w-8 h-8 text-slate-500" />;
  };

  const currentSize = getTotalSize();
  const sizePercentage = (currentSize / maxTotalSize) * 100;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!readOnly && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'}
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <h3 className="text-lg font-medium mb-2">Upload Files</h3>
          <p className="text-sm text-slate-600 mb-4">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Accepted: JPEG, PNG, GIF, PDF • Max 5MB per file • {maxFiles} files max
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.pdf"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || attachments.length >= maxFiles}
          >
            <Upload className="w-4 h-4 mr-2" />
            Choose Files
          </Button>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Size Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total Size</span>
              <span className="font-medium">
                {formatFileSize(currentSize)} / {formatFileSize(maxTotalSize)}
              </span>
            </div>
            <Progress 
              value={sizePercentage} 
              className={sizePercentage > 90 ? 'bg-red-200' : ''}
            />
            {sizePercentage > 90 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Approaching size limit. Consider removing some files.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-slate-700">
            Attached Files ({attachments.length}/{maxFiles})
          </h4>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <Card key={attachment.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getFileIcon(attachment.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {attachment.filename}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(attachment.fileSize)} • {attachment.fileType}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {attachment.url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(attachment.url, '_blank')}
                        >
                          View
                        </Button>
                      )}
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemove(attachment.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Image Preview */}
                  {attachment.fileType.startsWith('image/') && attachment.url && (
                    <div className="mt-3">
                      <img
                        src={attachment.url}
                        alt={attachment.filename}
                        className="max-w-full h-auto max-h-48 rounded border border-slate-200"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {attachments.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No files attached yet. Upload photos, videos, or documents related to this incident.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}