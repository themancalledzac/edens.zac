"use client";

/**
 * Admin — Create Content Collection Page (Client Component)
 *
 * Purpose
 * - Client-only page to create a new ContentCollection (metadata only). Media uploads are
 *   performed on the edit page afterward.
 *
 * Notes
 * - Uses proxy route /api/proxy to talk to backend write endpoints.
 * - Validates basic inputs client-side; server performs authoritative validation.
 */

import { useRouter } from "next/navigation";
import React, { useCallback, useMemo, useState } from "react";

// Shared types from read layer for enums
import type { CollectionType } from "@/lib/api/contentCollections";

// Local DTOs for client submission
type Visibility = "PUBLIC" | "PRIVATE";

type CreateCollectionDTO = {
  title: string;
  slug?: string;
  type: CollectionType;
  description?: string;
  visibility?: Visibility;
  password?: string; // only for CLIENT_GALLERY
  blocksPerPage?: number;
  priority?: number;
};

const DEFAULTS: Pick<CreateCollectionDTO, "visibility" | "blocksPerPage"> = {
  visibility: "PUBLIC",
  blocksPerPage: 30,
};

/** Determine if type is a client gallery to conditionally require password. */
function isClientGallery(type: CollectionType) {
  return type === "CLIENT_GALLERY";
}

/**
 * Create the collection via backend write endpoint through app proxy.
 * Returns id/slug/type on success; throws with readable message on failure.
 */
async function createViaProxy(dto: CreateCollectionDTO) {
  const res = await fetch("/api/proxy/api/write/collections/createCollection", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(dto),
    cache: "no-store",
  });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const msg = ct.includes("application/json") ? JSON.stringify(await res.json()) : await res.text();
    throw new Error(msg || `Create failed: ${res.status}`);
  }
  const json = (ct.includes("application/json") ? await res.json() : undefined) as
    | { id: string; slug: string; type: CollectionType }
    | undefined;
  if (!json) throw new Error("Unexpected response from API");
  return json;
}

/** Client page component for creating a new ContentCollection. */
export default function CreateCollectionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<CollectionType>("ART_GALLERY");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>(DEFAULTS.visibility!);
  const [password, setPassword] = useState("");
  const [blocksPerPage, setBlocksPerPage] = useState<number>(DEFAULTS.blocksPerPage!);
  const [priority, setPriority] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);

  const isPasswordVisible = isClientGallery(type);

  const isValid = useMemo(() => {
    if (!title.trim()) return false;
    if (isPasswordVisible && password.trim().length === 0) return false; // require password for client gallery
    return !(blocksPerPage < 1 || blocksPerPage > 200);

  }, [title, isPasswordVisible, password, blocksPerPage]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValid) return;
      setIsSubmitting(true);
      setHasError(null);
      try {
        const dto: CreateCollectionDTO = {
          title: title.trim(),
          slug: slug.trim() || undefined,
          type,
          description: description.trim() || undefined,
          visibility,
          blocksPerPage,
          priority,
          ...(isPasswordVisible ? { password } : {}),
        };
        const created = await createViaProxy(dto);
        // Navigate to the edit page of the new collection
        router.replace(`/collection/${created.slug}/edit`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        setHasError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isValid, title, slug, type, description, visibility, blocksPerPage, priority, isPasswordVisible, password, router]
  );

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem" }}>
      <h1 style={{ marginBottom: "1rem" }}>Create Content Collection</h1>
      <p style={{ color: "#666", marginBottom: "1rem" }}>
        Create a new collection. Creation is metadata-only; you can upload media on the edit page afterward.
      </p>

      {hasError && (
        <div role="alert" style={{ background: "#fee", color: "#900", padding: "0.75rem", borderRadius: 6, marginBottom: 12 }}>
          {hasError}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as CollectionType)} required>
            <option value="ART_GALLERY">Art Gallery</option>
            <option value="PORTFOLIO">Portfolio</option>
            <option value="BLOG">Blog</option>
            <option value="CLIENT_GALLERY">Client Gallery</option>
          </select>
          <small style={{ color: "#666" }}>
            {type === "BLOG" && "Mixed text/images, chronological."}
            {type === "ART_GALLERY" && "Curated images, artistic presentation."}
            {type === "PORTFOLIO" && "Professional showcase."}
            {type === "CLIENT_GALLERY" && "Private delivery with password."}
          </small>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Arches National Park" required />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Slug (optional)</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="arches-national-park" />
          <small style={{ color: "#666" }}>If empty, slug will be generated automatically.</small>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Description (optional)</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </label>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Visibility</span>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Blocks per page</span>
            <input
              type="number"
              min={1}
              max={200}
              value={blocksPerPage}
              onChange={(e) => setBlocksPerPage(Number(e.target.value))}
              required
            />
          </label>
        </div>

        {isPasswordVisible && (
          <label style={{ display: "grid", gap: 6 }}>
            <span>Password (required for client galleries)</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={isPasswordVisible} />
          </label>
        )}

        <label style={{ display: "grid", gap: 6 }}>
          <span>Priority (optional)</span>
          <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
        </label>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Creating..." : "Create"}
          </button>
          <button type="button" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
