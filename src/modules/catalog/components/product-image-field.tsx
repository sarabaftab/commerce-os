"use client";

import { useId, useState, useTransition } from "react";

import { uploadProductImageAction } from "@/modules/catalog/actions/product-image-actions";
import {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_REQUIREMENTS_LABEL,
} from "@/shared/storage/product-image-constants";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { ProductImage } from "@/ui/storefront/product-image";

type ProductImageFieldProps = {
  initialUrl?: string;
  /** Disable parent Save while an upload is in flight. */
  onUploadingChange?: (uploading: boolean) => void;
};

type UploadStatus = "idle" | "uploading" | "ready" | "error";

export function ProductImageField({
  initialUrl = "",
  onUploadingChange,
}: ProductImageFieldProps) {
  const inputId = useId();
  const [mediaUrl, setMediaUrl] = useState(initialUrl);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>(initialUrl ? "ready" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pending, startTransition] = useTransition();

  const uploading = pending || status === "uploading";

  function setUploading(next: boolean) {
    onUploadingChange?.(next);
  }

  function uploadSelectedFile(file: File) {
    setSelectedName(file.name);
    setError(null);
    setStatus("uploading");
    setUploading(true);

    const body = new FormData();
    body.set("productImage", file);

    startTransition(async () => {
      const result = await uploadProductImageAction({}, body);
      if (result.error || !result.url) {
        setStatus("error");
        setError(result.error ?? "Could not upload the product image");
        setUploading(false);
        return;
      }
      setMediaUrl(result.url);
      setStatus("ready");
      setError(null);
      setUploading(false);
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] p-4">
      <div className="space-y-1">
        <Label htmlFor={inputId}>Product image</Label>
        <p className="text-xs text-muted-foreground">{PRODUCT_IMAGE_REQUIREMENTS_LABEL}</p>
      </div>

      {mediaUrl ? (
        <div className="relative h-40 w-40 overflow-hidden rounded-lg bg-white ring-1 ring-[color:var(--admin-line)]">
          <ProductImage
            src={mediaUrl}
            alt="Product preview"
            sizes="160px"
            className="object-contain"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Input
          id={inputId}
          type="file"
          accept={PRODUCT_IMAGE_ACCEPT}
          disabled={uploading}
          className="cursor-pointer"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            uploadSelectedFile(file);
            // Allow selecting the same file again after a failed upload.
            event.target.value = "";
          }}
        />
        <input type="hidden" name="mediaUrl" value={mediaUrl} />

        {selectedName ? (
          <p className="truncate text-sm text-muted-foreground">Selected: {selectedName}</p>
        ) : null}

        {status === "uploading" ? (
          <p className="text-sm text-muted-foreground" role="status">
            Uploading…
          </p>
        ) : null}
        {status === "ready" && mediaUrl ? (
          <p className="text-sm text-emerald-700" role="status">
            Upload complete. Save the product to apply this image.
          </p>
        ) : null}
        {status === "idle" && !mediaUrl ? (
          <p className="text-sm text-muted-foreground">Ready to upload</p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-[color:var(--admin-line)] pt-3">
        <button
          type="button"
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setShowAdvanced((value) => !value)}
        >
          {showAdvanced ? "Hide media URL" : "Use media URL instead"}
        </button>
        {showAdvanced ? (
          <div className="grid gap-2">
            <Label htmlFor={`${inputId}-url`}>Media URL (advanced)</Label>
            <Input
              id={`${inputId}-url`}
              type="url"
              value={mediaUrl}
              placeholder="https://..."
              disabled={uploading}
              onChange={(event) => {
                setMediaUrl(event.target.value);
                setStatus(event.target.value ? "ready" : "idle");
                setError(null);
                setSelectedName(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Pasting a URL updates the same image field used by the storefront.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
