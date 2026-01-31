import React, { useCallback, useState } from 'react';
import { Upload, File, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface FileUploadProps {
    label: string;
    description?: string;
    accept?: string;
    maxSize?: number; // in bytes
    onFileSelect: (file: File) => void;
    onRemove?: () => void;
    initialFile?: File | null;
    required?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
    label,
    description,
    accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
    maxSize = 10 * 1024 * 1024, // 10MB default
    onFileSelect,
    onRemove,
    initialFile = null,
    required = false,
}) => {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(initialFile);
    const [error, setError] = useState<string | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const validateFile = (file: File) => {
        if (maxSize && file.size > maxSize) {
            setError(`File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit.`);
            return false;
        }
        setError(null);
        return true;
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (validateFile(droppedFile)) {
                setFile(droppedFile);
                onFileSelect(droppedFile);
            }
        }
    }, [maxSize, onFileSelect]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (validateFile(selectedFile)) {
                setFile(selectedFile);
                onFileSelect(selectedFile);
            }
        }
    };

    const removeFile = () => {
        setFile(null);
        setError(null);
        if (onRemove) onRemove();
    };

    return (
        <div className="w-full space-y-2">
            <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {label} {required && <span className="text-destructive">*</span>}
                </label>
                {file && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Uploaded
                    </span>
                )}
            </div>

            {!file ? (
                <div
                    className={cn(
                        "relative flex flex-col items-center justify-center w-full min-h-[120px] rounded-lg border-2 border-dashed transition-all",
                        dragActive
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25 hover:border-primary/50 bg-muted/5",
                        error ? "border-destructive/50 bg-destructive/5" : ""
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={handleChange}
                        accept={accept}
                    />
                    <div className="flex flex-col items-center justify-center text-center p-4 gap-2">
                        <div className="p-2 rounded-full bg-background shadow-sm border">
                            <Upload className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                                Click to upload or drag and drop
                            </p>
                            {description && (
                                <p className="text-xs text-muted-foreground">{description}</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <Card className="relative overflow-hidden border-primary/20 bg-primary/5">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 rounded-md bg-background border shadow-sm">
                                <File className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={removeFile}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </CardContent>
                </Card>
            )}

            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
    );
};
