"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Upload, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SharedFile {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSizeMb: number;
  uploadedBy: string;
  uploadedAt: string;
}

interface FileSharingProps {
  files: SharedFile[];
  onUpload: (file: File) => void;
  onDownload: (fileUrl: string, fileName: string) => void;
  onDelete: (fileId: number) => void;
  isHost: boolean;
  className?: string;
}

export function FileSharing({
  files,
  onUpload,
  onDownload,
  onDelete,
  isHost,
  className,
}: FileSharingProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onUpload(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const formatFileSize = (sizeMb: number) => {
    return sizeMb < 1 ? `${(sizeMb * 1024).toFixed(0)} KB` : `${sizeMb.toFixed(2)} MB`;
  };

  return (
    <Card className={cn("p-4 bg-gray-900 border-white/10", className)}>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        Shared Files ({files.length})
      </h3>

      {/* Upload Area */}
      <div>
        <button
          type="button"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "w-full border-2 border-dashed rounded-lg p-6 mb-4 text-center transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isDragging
              ? "border-primary bg-primary/10"
              : "border-white/20 hover:border-primary/50"
          )}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" aria-hidden="true" />
          <span className="block text-sm text-gray-400">
            Drop files here or click to upload
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Files List */}
      <div className="space-y-2">
        {files.length === 0 ? (
          <p className="text-center text-gray-400 py-4">No files shared yet</p>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {file.fileName}
                </p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(file.fileSizeMb)} • {file.uploadedBy} •{' '}
                  {new Date(file.uploadedAt).toLocaleTimeString()}
                </p>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                <Button
                  onClick={() => onDownload(file.fileUrl, file.fileName)}
                  variant="ghost"
                  size="sm"
                  aria-label={`Download ${file.fileName}`}
                  className="h-10 w-10 p-0"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </Button>
                
                {isHost && (
                  <Button
                    onClick={() => onDelete(file.id)}
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${file.fileName}`}
                    className="h-10 w-10 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    title="Delete"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}