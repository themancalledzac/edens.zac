"use client";


import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { EditLiteProvider } from "@/context/edit-lite-context";
import type { ContentBlock } from "@/lib/api/contentCollections";
import type { CollectionRead, UpdateCollectionDTO, Visibility } from "@/types/collection-edit";
import { fetchCollectionViaProxy, updateCollectionViaProxy, uploadFilesViaProxy } from "@/utils/collections-client";

import formStyles from '../../../../styles/forms.module.scss';
import adminStyles from '../../../../styles/admin.module.scss';
import layoutStyles from '../../../../styles/layout.module.scss';

/**
 * Edit Form Component
 *
 * Comprehensive form component for editing collection metadata including
 * title, description, visibility settings, password management, and file
 * uploads. Features optimistic updates and error handling.
 *
 * @param initial - Initial collection data for form population
 * @returns Form component with collection editing capabilities
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
    <section className={formStyles.form}>
      <h1>Edit Collection — {initial.title}</h1>

      {saveError && (
        <div role="alert" className={layoutStyles.errorAlert}>{saveError}</div>
      )}

      <div className={formStyles.formGrid}>
        <label className={formStyles.label}>
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className={styles.label}>
          <span>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </label>

        <div className={styles.twoColumnGrid}>
          <label className={styles.label}>
            <span>Visibility</span>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </label>
          <label className={styles.label}>
            <span>Blocks per page</span>
            <input type="number" min={1} max={200} value={blocksPerPage} onChange={(e) => setBlocksPerPage(Number(e.target.value))} />
          </label>
        </div>

        <label className={styles.label}>
          <span>Priority</span>
          <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
        </label>

        <fieldset className={styles.fieldset}>
          <legend>Password (Client Gallery)</legend>
          <div className={styles.fieldsetGrid}>
            <label className={styles.checkboxLabel}>
              <input
                type="radio"
                name="pwdAction"
                value="noop"
                checked={passwordAction === "noop"}
                onChange={() => setPasswordAction("noop")}
              />
              <span>No change</span>
            </label>
            <label className={styles.checkboxLabel}>
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
            <label className={styles.checkboxLabel}>
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

        <div className={styles.actionsRow}>
          <button onClick={onSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</button>
          <button type="button" onClick={() => router.push(`/collection/${initial.slug}`)}>View</button>
        </div>
      </div>

      <hr />

      <div className={styles.uploadSection}>
        <h2>Upload Media</h2>
        {uploadError && (
          <div role="alert" className={styles.errorAlert}>{uploadError}</div>
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
 * Blocks List Component
 *
 * Read-only display component for content blocks showing type, order,
 * and preview content. Placeholder implementation pending full drag-and-drop
 * editor functionality.
 *
 * @param blocks - Array of content blocks to display
 * @returns List component showing block metadata and previews
 */
function BlocksList({ blocks }: { blocks: ContentBlock[] }) {
  // Simple placeholder until full drag-drop editor is added.
  return (
    <div className={styles.blocksSection}>
      <h2>Content Blocks</h2>
      <ol className={styles.blocksList}>
        {blocks.map((b) => (
          <li key={b.id} className={styles.blockItem}>
            <code className={styles.blockTypeCode}>{b.type}</code>
            <span>#{b.orderIndex}</span>
            {b.type === "TEXT" && 'content' in b && typeof b.content === "string" && (
              <span className={styles.blockContent}>{b.content.slice(0, 60)}...</span>
            )}
          </li>
        ))}
      </ol>
      <p className={styles.helpText}>Drag-and-drop reordering and block editing will be added in a subsequent step.</p>
    </div>
  );
}

/**
 * Edit Collection Page
 *
 * Administrative page component for editing content collections. Handles
 * client-side data fetching, loading states, error handling, and provides
 * editing context through provider wrapper.
 *
 * @dependencies
 * - Next.js router hooks for navigation and params
 * - React hooks for state management and effects
 * - EditLiteProvider for editing context
 * - Collection proxy utilities for API communication
 * - EditForm and BlocksList components
 *
 * @param params - Route parameters containing collection slug
 * @returns Client component with collection editing interface
 */
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
      <main className={styles.main}>
        <h1>Edit Collection</h1>
        <div role="alert" className={styles.errorAlert}>{hasError}</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className={styles.main}>
        <h1>Edit Collection</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <EditLiteProvider>
      <main className={styles.main}>
        <EditForm initial={data} />
      </main>
    </EditLiteProvider>
  );
}
