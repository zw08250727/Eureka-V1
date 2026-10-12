"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { Select } from "@/components/ui/select";
import { MdButton as Button } from "./reference-ui";
import { sanitizeRichText } from "./store";
import "./domestic-inline-editor.css";

// Public /editor bundle index-DbMJdQBd.js and its AddToAIChat-CsRNTvlH.js
// toolbar dependency (2026-10-12). Only local formatting is implemented here.
const fontSizes = [10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
const fontFamilies = ["sans-serif", "Arial", "Arial Black", "Georgia", "Impact", "Tahoma", "Times New Roman", "Verdana", "Courier New", "Lucida Console", "Monaco", "monospace"];
const commands = [
  ["bold", "粗体", "B"], ["italic", "斜体", "I"],
  ["underline", "下划线", "U"], ["strikeThrough", "删除线", "S"],
  ["insertUnorderedList", "无序列表", "• 列表"],
  ["insertOrderedList", "有序列表", "1. 列表"],
] as const;

type Bookmark = { start: number[]; startOffset: number; end: number[]; endOffset: number };
type Snapshot = { html: string; selection: Bookmark | null };
type Formatting = { block: string; size: string; family: string; align: string; active: string[] };
const initialFormatting: Formatting = { block: "p", size: "", family: "sans-serif", align: "left", active: [] };

function currentRange(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  return root.contains(range.startContainer) && root.contains(range.endContainer) ? range.cloneRange() : null;
}

function bookmark(root: HTMLElement): Bookmark | null {
  const range = currentRange(root);
  if (!range) return null;
  const path = (node: Node) => {
    const result: number[] = [];
    while (node !== root && node.parentNode) {
      result.unshift(Array.prototype.indexOf.call(node.parentNode.childNodes, node));
      node = node.parentNode;
    }
    return result;
  };
  return { start: path(range.startContainer), startOffset: range.startOffset, end: path(range.endContainer), endOffset: range.endOffset };
}

function restoreBookmark(root: HTMLElement, saved: Bookmark | null) {
  if (!saved) return;
  const resolve = (path: number[]) => path.reduce<Node | undefined>((node, i) => node?.childNodes[i], root);
  const start = resolve(saved.start), end = resolve(saved.end);
  if (!start || !end) return;
  const limit = (node: Node) => node.nodeType === Node.TEXT_NODE ? node.textContent?.length || 0 : node.childNodes.length;
  const range = document.createRange();
  range.setStart(start, Math.min(saved.startOffset, limit(start)));
  range.setEnd(end, Math.min(saved.endOffset, limit(end)));
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function readFormatting(root: HTMLElement): Formatting | null {
  const range = currentRange(root);
  if (!range) return null;
  const node = range.startContainer;
  const element = node instanceof HTMLElement ? node : node.parentElement;
  const style = element ? getComputedStyle(element) : null;
  const block = element?.closest("h1,h2,h3,h4,h5,h6,p,div,blockquote,pre");
  const family = style?.fontFamily.split(",")[0].replace(/["']/g, "").trim() || "sans-serif";
  return {
    block: block && block !== root ? block.tagName.toLowerCase() : "p",
    size: style?.fontSize || "",
    family: fontFamilies.includes(family) ? family : "sans-serif",
    align: style?.textAlign === "start" ? "left" : style?.textAlign || "left",
    active: commands.filter(([name]) => document.queryCommandState(name)).map(([name]) => name),
  };
}

export function DomesticInlineEditor({ html, onDraft, onExit, onSave }: {
  html: string;
  onDraft: (html: string) => void;
  onExit: () => void;
  onSave: (text: string, html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null), initial = useRef(html);
  const savedRange = useRef<Range | null>(null);
  const history = useRef<{ entries: Snapshot[]; index: number }>({ entries: [], index: 0 });
  const composing = useRef(false), executing = useRef(false);
  const requestedSize = useRef("16px");
  const [format, setFormat] = useState(initialFormatting);
  const [historyState, setHistoryState] = useState({ undo: false, redo: false });
  const [error, setError] = useState("");
  const errorId = useId();

  function rememberSelection() {
    const root = ref.current;
    if (!root) return;
    const range = currentRange(root);
    if (range) savedRange.current = range;
  }

  function focusSelection() {
    const root = ref.current!;
    root.focus({ preventScroll: true });
    const range = savedRange.current;
    const selection = window.getSelection();
    if (range && root.contains(range.startContainer) && root.contains(range.endContainer)) {
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else if (!currentRange(root)) {
      const caret = document.createRange();
      caret.selectNodeContents(root);
      caret.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(caret);
    }
  }

  function refreshHistoryState() {
    const { entries, index } = history.current;
    setHistoryState({ undo: index > 0, redo: index < entries.length - 1 });
  }

  function beforeChange() {
    const root = ref.current!, { entries, index } = history.current;
    if (entries[index]) entries[index].selection = bookmark(root);
  }

  function publish() {
    const root = ref.current!;
    // execCommand supports seven legacy sizes. Its temporary size=7 marker is
    // converted to the selected pixel size without replacing text/selection nodes.
    root.querySelectorAll<HTMLElement>('font[size="7"]').forEach(node => {
      node.style.fontSize = requestedSize.current;
      node.removeAttribute("size");
    });
    const { entries, index } = history.current;
    if (root.innerHTML !== entries[index]?.html) {
      const next = entries.slice(0, index + 1);
      next.push({ html: root.innerHTML, selection: bookmark(root) });
      if (next.length > 100) next.shift();
      history.current = { entries: next, index: next.length - 1 };
    }
    rememberSelection();
    refreshHistoryState();
    const formatting = readFormatting(root);
    if (formatting) setFormat(formatting);
    try {
      onDraft(sanitizeRichText(root.innerHTML));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "草稿更新失败，请重试");
    }
  }

  function travel(direction: -1 | 1) {
    if (composing.current) return;
    const root = ref.current!, state = history.current, index = state.index + direction;
    if (index < 0 || index >= state.entries.length) return;
    state.index = index;
    const snapshot = state.entries[index];
    root.innerHTML = snapshot.html;
    root.focus({ preventScroll: true });
    restoreBookmark(root, snapshot.selection);
    savedRange.current = currentRange(root);
    publish();
  }

  function command(name: string, value?: string) {
    if (composing.current) return;
    focusSelection();
    beforeChange();
    executing.current = true;
    const cssMode = document.queryCommandState("styleWithCSS");
    let applied = false;
    try {
      document.execCommand("styleWithCSS", false, "false");
      applied = document.execCommand(name, false, value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "格式修改失败，请重新选择文本");
      return;
    } finally {
      document.execCommand("styleWithCSS", false, String(cssMode));
      executing.current = false;
    }
    publish();
    if (!applied) setError("当前选区无法应用此格式，请重新选择文本");
  }

  async function save() {
    if (composing.current) return;
    try {
      const root = ref.current!, text = root.innerText.trim();
      if (!text) throw Error("正文不能为空");
      await onSave(text, sanitizeRichText(root.innerHTML));
      // The parent owns persistence and exit. Never clear the buffer here.
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请重试");
    }
  }

  const handleBeforeInput = useEffectEvent((event: InputEvent) => {
    if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
      event.preventDefault();
      travel(event.inputType === "historyUndo" ? -1 : 1);
    } else if (!composing.current && !executing.current) beforeChange();
  });

  useEffect(() => {
    const root = ref.current!;
    root.innerHTML = sanitizeRichText(initial.current);
    root.focus({ preventScroll: true });
    history.current = { entries: [{ html: root.innerHTML, selection: bookmark(root) }], index: 0 };
    const selectionChanged = () => {
      const range = currentRange(root);
      if (!range) return;
      savedRange.current = range;
      const formatting = readFormatting(root);
      if (formatting) setFormat(formatting);
    };
    const beforeInput = (event: InputEvent) => handleBeforeInput(event);
    root.addEventListener("beforeinput", beforeInput);
    document.addEventListener("selectionchange", selectionChanged);
    return () => {
      root.removeEventListener("beforeinput", beforeInput);
      document.removeEventListener("selectionchange", selectionChanged);
    };
  }, []);

  return <>
    <div className="md-panel-tools md-inline-edit-tools cn-inline-edit-tools">
      <small>正在编辑</small>
      <div>
        <Button action="exit-edit" onClick={onExit}>退出编辑</Button>
        <Button action="save-inline" className="md-btn md-primary" onClick={save}>保存</Button>
      </div>
    </div>
    <div className="md-inline-editor cn-inline-editor">
      <div className="md-editor-toolbar cn-editor-toolbar" role="toolbar" aria-label="正文格式">
        <div className="cn-editor-tool-group" role="group" aria-label="编辑历史">
          <Button className="cn-editor-tool" aria-label="撤销" title="撤销（Ctrl/⌘ Z）" disabled={!historyState.undo} onMouseDown={e => e.preventDefault()} onClick={() => travel(-1)}>↶</Button>
          <Button className="cn-editor-tool" aria-label="重做" title="重做（Ctrl/⌘ Shift Z）" disabled={!historyState.redo} onMouseDown={e => e.preventDefault()} onClick={() => travel(1)}>↷</Button>
        </div>
        <div className="cn-editor-tool-group cn-editor-selects" role="group" aria-label="字体与段落">
          <Select aria-label="正文与标题" value={format.block} onPointerDown={rememberSelection} onChange={e => command("formatBlock", e.target.value)}>
            <option value="p">正文</option><option value="div">普通段落</option>
            {[1, 2, 3, 4, 5, 6].map(level => <option key={level} value={`h${level}`}>标题 {level}</option>)}
            <option value="blockquote">引用</option><option value="pre">代码块</option>
          </Select>
          <Select aria-label="字号" value={fontSizes.some(size => `${size}px` === format.size) ? format.size : ""} onPointerDown={rememberSelection} onChange={e => { requestedSize.current = e.target.value || "16px"; command("fontSize", "7"); }}>
            <option value="">默认字号</option>
            {fontSizes.map(size => <option key={size} value={`${size}px`}>{size}px</option>)}
          </Select>
          <Select aria-label="字体" value={format.family} onPointerDown={rememberSelection} onChange={e => command("fontName", e.target.value)}>
            {fontFamilies.map(font => <option key={font} value={font}>{font === "sans-serif" ? "默认字体" : font}</option>)}
          </Select>
        </div>
        <div className="cn-editor-tool-group" role="group" aria-label="文字与列表">
          {commands.map(([name, label, glyph]) => <Button key={name} className={`cn-editor-tool cn-editor-${name}`} data-command={name} aria-label={label} title={label} aria-pressed={format.active.includes(name)} onMouseDown={e => e.preventDefault()} onClick={() => command(name)}>{glyph}</Button>)}
        </div>
        <div className="cn-editor-tool-group" role="group" aria-label="段落对齐与清除">
          <Select aria-label="对齐方式" value={format.align} onPointerDown={rememberSelection} onChange={e => command(e.target.value === "justify" ? "justifyFull" : `justify${e.target.value[0].toUpperCase()}${e.target.value.slice(1)}`)}>
            <option value="left">左对齐</option><option value="center">居中对齐</option><option value="right">右对齐</option><option value="justify">两端对齐</option>
          </Select>
          <Button className="cn-editor-tool" aria-label="清除格式" onMouseDown={e => e.preventDefault()} onClick={() => command("removeFormat")}>清除格式</Button>
        </div>
      </div>
      <div ref={ref} id="md-edit-body" className="md-prose md-inline-editable cn-inline-editable" contentEditable suppressContentEditableWarning role="textbox" aria-label="编辑正文" aria-multiline="true" aria-describedby={error ? errorId : undefined}
        onInput={() => { if (!composing.current && !executing.current) publish(); }}
        onCompositionStart={() => { beforeChange(); composing.current = true; }}
        onCompositionEnd={() => { composing.current = false; publish(); }}
        onKeyDown={e => {
          if (e.nativeEvent.isComposing) return;
          if (e.metaKey || e.ctrlKey) {
            const key = e.key.toLowerCase();
            if (key === "z" || key === "y") { e.preventDefault(); travel(key === "y" || e.shiftKey ? 1 : -1); }
            else if (key === "s") { e.preventDefault(); save(); }
          }
        }}
        onPaste={e => {
          e.preventDefault();
          rememberSelection();
          const rich = e.clipboardData.getData("text/html");
          command(rich ? "insertHTML" : "insertText", rich ? sanitizeRichText(rich) : e.clipboardData.getData("text/plain"));
        }}
        onDrop={e => e.preventDefault()}
      />
      <p id={errorId} className="md-inline-edit-status cn-inline-edit-status" role="alert">{error}</p>
    </div>
  </>;
}
