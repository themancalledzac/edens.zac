"use client";

/**
 * Admin — Edit Content Collection Page (Client Component)
 *
 * Purpose
 * - Client-side editing UI for ContentCollections, including metadata updates and media uploads.
 *
 * Notes
 * - Reads and writes are performed through the local proxy route to the backend API.
 * - Keeps interactions responsive; server performs cache revalidation post-writes.
 */

import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { EditLiteProvider } from "@/context/edit-lite-context";
import type { ContentBlock } from "@/lib/api/contentCollections";
import type { CollectionRead, UpdateCollectionDTO, Visibility } from "@/types/collection-edit";
import { fetchCollectionViaProxy, updateCollectionViaProxy, uploadFilesViaProxy } from "@/utils/collections-client";

/**
 * EditForm — form to edit collection metadata and upload media.
 * - Handles client-side validation and invokes proxy helpers for mutations.
 */
function EditForm({ initial }: { initial: CollectionRead }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams?.get("page") ?? 0);
  const size = Number(searchParams?.get("size") ?? initial.blocksPerPage ?? 30);

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [visibility, setVisibility] = useState<Visibility>(initial.visibility ?? "PUBLIC");
  const [priority, setPriority] = useState<number>(initial.priority ?? 0);
  const [blocksPerPage, setBlocksPerPage] = useState<number>(initial.blocksPerPage ?? 30);

  const [password, setPassword] = useState("");
  const [passwordAction, setPasswordAction] = useState<"noop" | "set" | "clear">("noop");

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const updates: UpdateCollectionDTO = {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        visibility,
        priority,
        blocksPerPage,
      };
      if (passwordAction === "set") updates.password = password;
      if (passwordAction === "clear") updates.password = null;
      const updated = await updateCollectionViaProxy(initial.id, updates);
      if (updated?.slug && updated.slug !== initial.slug) {
        router.replace(`/collection/${updated.slug}/edit?page=${page}&size=${size}`);
        return;
      }
      // Reload current page data (no hard refresh to keep UX smooth)
      router.refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  }, [description, visibility, priority, blocksPerPage, passwordAction, password, initial.id, initial.slug, page, size, router, title]);

  const onUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      await uploadFilesViaProxy(initial.id, files);
      // After upload, refresh the layout to stream in new blocks
      router.refresh();
      // Clear file input
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  }, [initial.id, router]);

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <h1>Edit Collection — {initial.title}</h1>

      {saveError && (
        <div role="alert" style={{ background: "#fee", color: "#900", padding: 12, borderRadius: 6 }}>{saveError}</div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Description</span>
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
            <input type="number" min={1} max={200} value={blocksPerPage} onChange={(e) => setBlocksPerPage(Number(e.target.value))} />
          </label>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Priority</span>
          <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
        </label>

        <fieldset style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
          <legend>Password (Client Gallery)</legend>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="radio"
                name="pwdAction"
                value="noop"
                checked={passwordAction === "noop"}
                onChange={() => setPasswordAction("noop")}
              />
              <span>No change</span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="radio"
                name="pwdAction"
                value="set"
                checked={passwordAction === "set"}
                onChange={() => setPasswordAction("set")}
              />
              <span>Set/Update password</span>
            </label>
            {passwordAction === "set" && (
              <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
            )}
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="radio"
                name="pwdAction"
                value="clear"
                checked={passwordAction === "clear"}
                onChange={() => setPasswordAction("clear")}
              />
              <span>Clear password</span>
            </label>
          </div>
        </fieldset>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={onSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</button>
          <button type="button" onClick={() => router.push(`/collection/${initial.slug}`)}>View</button>
        </div>
      </div>

      <hr />

      <div style={{ display: "grid", gap: 8 }}>
        <h2>Upload Media</h2>
        {uploadError && (
          <div role="alert" style={{ background: "#fee", color: "#900", padding: 12, borderRadius: 6 }}>{uploadError}</div>
        )}
        <input ref={fileRef} type="file" multiple onChange={onUpload} />
        {isUploading && <span>Uploading...</span>}
      </div>

      <hr />

      <BlocksList blocks={initial.blocks} />
    </section>
  );
}

/**
 * BlocksList — simple read-only list of blocks until DnD editor is implemented.
 */
function BlocksList({ blocks }: { blocks: ContentBlock[] }) {
  // Simple placeholder until full drag-drop editor is added.
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <h2>Content Blocks</h2>
      <ol style={{ paddingLeft: 20 }}>
        {blocks.map((b) => (
          <li key={b.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code style={{ padding: "2px 6px", background: "#f6f6f6", borderRadius: 4 }}>{b.type}</code>
            <span>#{b.orderIndex}</span>
            {b.type === "TEXT" && typeof (b as any).content === "string" && (
              <span style={{ color: "#666" }}>{String((b as any).content).slice(0, 60)}...</span>
            )}
          </li>
        ))}
      </ol>
      <p style={{ color: "#666" }}>Drag-and-drop reordering and block editing will be added in a subsequent step.</p>
    </div>
  );
}

/** Page component that loads collection data and renders the EditForm. */
export default function EditCollectionPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [data, setData] = useState<CollectionRead | null>(null);
  const [hasError, setHasError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchCollectionViaProxy(slug).then(
      (json) => {
        if (!mounted) return;
        setData(json);
      },
      (error) => {
        if (!mounted) return;
        setHasError(error instanceof Error ? error.message : String(error));
      }
    );
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (hasError) {
    return (
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem" }}>
        <h1>Edit Collection</h1>
        <div role="alert" style={{ background: "#fee", color: "#900", padding: 12, borderRadius: 6 }}>{hasError}</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem" }}>
        <h1>Edit Collection</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <EditLiteProvider>
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem" }}>
        <EditForm initial={data} />
      </main>
    </EditLiteProvider>
  );
}
