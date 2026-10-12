"use client";

import { useEffect, useRef, useState } from "react";
import { MdButton as B, MdDialog, MdIcon as I } from "./reference-ui";
import "./domestic-image-manager.css";

export interface DomesticImageManagerProps {
  images: { name: string; url: string }[];
  readonly: boolean;
  onClose: () => void;
  /** Throw or reject on failure. Resolve only after deletion has persisted. */
  onDelete: (indices: number[]) => void | Promise<void>;
  onPreview: (index: number) => void;
  /** Nonempty initial selection opens the deletion confirmation directly. */
  initialSelection?: number[];
}

// Preserve selection when another image is inserted/removed; indexes are resolved
// from the current image list immediately before calling the parent.
function imageKeys(images: DomesticImageManagerProps["images"]) {
  const occurrences = new Map<string, number>();
  return images.map(({ name, url }) => {
    const identity = JSON.stringify([name, url]);
    const occurrence = occurrences.get(identity) || 0;
    occurrences.set(identity, occurrence + 1);
    return `${identity}:${occurrence}`;
  });
}

export function DomesticImageManager({
  images,
  readonly,
  onClose,
  onDelete,
  onPreview,
  initialSelection = [],
}: DomesticImageManagerProps) {
  const keys = imageKeys(images);
  const [initial] = useState(() =>
    [...new Set(initialSelection)]
      .filter(
        (index) => Number.isInteger(index) && index >= 0 && index < keys.length,
      )
      .map((index) => keys[index]),
  );
  const [shortcut] = useState(initial.length > 0 && !readonly);
  const [selected, setSelected] = useState<string[]>(initial);
  const [batch, setBatch] = useState(shortcut);
  const [confirming, setConfirming] = useState(shortcut);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const mounted = useRef(true);
  const confirm = confirming && !readonly;
  const selecting = batch && !readonly;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function close() {
    if (!locked.current) onClose();
  }

  function cancelConfirmation() {
    if (locked.current) return;
    if (shortcut) onClose();
    else {
      setConfirming(false);
      setError("");
    }
  }

  function toggle(key: string) {
    if (readonly || locked.current) return;
    setSelected((previous) =>
      previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key],
    );
    setError("");
  }

  async function deleteSelected() {
    if (readonly || locked.current || !selected.length) return;
    const indices = selected
      .map((key) => keys.indexOf(key))
      .sort((a, b) => a - b);
    if (indices.some((index) => index < 0)) {
      setError("图片列表已更新，请取消确认后重新选择图片");
      return;
    }
    locked.current = true;
    setDeleting(true);
    setError("");
    try {
      await onDelete(indices);
      if (!mounted.current) return;
      setSelected([]);
      setBatch(false);
      setConfirming(false);
      if (shortcut) onClose();
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error && cause.message
            ? cause.message
            : "删除失败，请重试",
        );
    } finally {
      locked.current = false;
      if (mounted.current) setDeleting(false);
    }
  }

  return (
    <MdDialog
      title={confirm ? "删除图片" : "查看图片"}
      className={`cn-image-manager${confirm ? " is-confirming" : ""}${deleting ? " is-deleting" : ""}`}
      onClose={confirm ? cancelConfirmation : close}
      footer={
        confirm ? (
          <>
            <B
              className="md-btn cn-image-confirm-cancel"
              autoFocus
              disabled={deleting}
              onClick={cancelConfirmation}
            >
              取消
            </B>
            <B
              className="md-btn cn-image-confirm-submit"
              disabled={deleting || readonly || !selected.length}
              onClick={() => void deleteSelected()}
            >
              {deleting ? "删除中" : "确定"}
            </B>
          </>
        ) : selecting ? (
          <>
            <span className="cn-image-selection-count" role="status">
              已选择 {selected.filter((key) => keys.includes(key)).length}{" "}
              张图片
            </span>
            <B
              disabled={deleting}
              onClick={() => {
                setBatch(false);
                setSelected([]);
                setError("");
              }}
            >
              取消批量
            </B>
            <B
              className="md-btn cn-image-batch-delete"
              disabled={deleting || !selected.length}
              onClick={() => {
                setError("");
                setConfirming(true);
              }}
            >
              确认删除
            </B>
          </>
        ) : (
          <></>
        )
      }
    >
      {confirm ? (
        <div className="cn-image-confirm-body" aria-busy={deleting}>
          <p>确定删除选中图片吗？</p>
          <span className="cn-image-confirm-count">
            已选择 {selected.length} 张图片
          </span>
          {deleting && <p role="status">正在删除，请稍候...</p>}
        </div>
      ) : (
        <>
          {!readonly && !selecting && (
            <div className="cn-image-manager-tools">
              <B
                disabled={!images.length || deleting}
                onClick={() => {
                  setBatch(true);
                  setSelected([]);
                  setError("");
                }}
              >
                <I name="trash" />
                批量删除
              </B>
            </div>
          )}
          {images.length ? (
            <div className="cn-image-grid-scroll">
              <div className="cn-image-grid" aria-label="全部图片">
                {images.map((image, index) => {
                  const chosen = selected.includes(keys[index]);
                  const label = image.name || `会议图片${index + 1}`;
                  return (
                    <div
                      key={keys[index]}
                      className={`cn-image-cell${selecting && chosen ? " is-selected" : ""}`}
                    >
                      <button
                        type="button"
                        className="cn-image-thumbnail"
                        disabled={deleting}
                        aria-label={
                          selecting ? `选择图片 ${label}` : `预览图片 ${label}`
                        }
                        aria-pressed={selecting ? chosen : undefined}
                        onClick={() =>
                          selecting ? toggle(keys[index]) : onPreview(index)
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.url} alt={label} loading="lazy" />
                        {selecting ? (
                          <span
                            className="cn-image-checkbox"
                            aria-hidden="true"
                          >
                            {chosen ? "✓" : ""}
                          </span>
                        ) : (
                          <span
                            className="cn-image-preview-hint"
                            aria-hidden="true"
                          >
                            查看
                          </span>
                        )}
                      </button>
                      {!readonly && !selecting && (
                        <B
                          className="cn-image-remove"
                          disabled={deleting}
                          aria-label={`删除图片 ${label}`}
                          onClick={() => {
                            setSelected([keys[index]]);
                            setError("");
                            setConfirming(true);
                          }}
                        >
                          <I name="close" />
                        </B>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="cn-image-none" role="status">
              暂无图片
            </p>
          )}
        </>
      )}
      {error && (
        <p className="cn-image-error" role="alert">
          {error}
        </p>
      )}
    </MdDialog>
  );
}
