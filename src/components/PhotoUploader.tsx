"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { ImagePlus } from "lucide-react";

const maximumPhotoSize = 5 * 1024 * 1024;
const allowedPhotoTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function PhotoUploader({
  file,
  onChange,
  onError,
  disabled = false,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    let active = true;
    queueMicrotask(() => {
      if (active) setPreview({ file, url });
    });
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  function chooseFile(candidate?: File) {
    if (!candidate) return;
    if (!allowedPhotoTypes.has(candidate.type)) {
      onChange(null);
      if (inputRef.current) inputRef.current.value = "";
      onError("Choose a JPG, PNG, WebP, or GIF photo.");
      return;
    }
    if (candidate.size > maximumPhotoSize) {
      onChange(null);
      if (inputRef.current) inputRef.current.value = "";
      onError("Photos must be 5 MB or smaller.");
      return;
    }
    onChange(candidate);
    onError("");
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        disabled={disabled}
        className="sr-only"
        aria-label="Choose a maintenance request photo"
        onChange={(event) => chooseFile(event.currentTarget.files?.[0])}
      />
      {file && preview?.file === file ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.url}
            alt={`Preview of ${file.name}`}
            className="h-52 w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-slate-950/65 px-4 py-3 text-white">
            <p className="min-w-0 truncate text-sm font-medium">{file.name}</p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25 disabled:opacity-50"
              >
                Change
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
            dragging
              ? "border-blue-400 bg-blue-50"
              : "border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50"
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="mt-3 text-sm font-semibold text-slate-800">
            {dragging
              ? "Drop your photo here"
              : "Click to upload or drag and drop a photo"}
          </span>
          <span className="mt-1 text-xs text-slate-500">
            PNG, JPG, WebP or GIF · max. 5MB · SVG files are not supported
          </span>
        </button>
      )}
    </div>
  );
}
