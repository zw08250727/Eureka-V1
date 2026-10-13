"use client";
import { useEffect, useId, useRef, useState, type SelectHTMLAttributes } from "react";
import "./select.css";

type Choice = { value: string; label: string; disabled: boolean };
/** Keep native form/label semantics; render the option surface in the top layer. */
export function Select({ children, onChange, onKeyDown, onPointerDown, onClick, onBlur, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  const select = useRef<HTMLSelectElement>(null), popup = useRef<HTMLDivElement>(null);
  const search = useRef({ text: "", time: 0 });
  const [choices, setChoices] = useState<Choice[]>([]), [open, setOpen] = useState(false), [active, setActive] = useState(0), [selected, setSelected] = useState("");
  const [navigation, setNavigation] = useState<"pointer" | "keyboard">("keyboard");
  function close() { popup.current?.hidePopover(); setOpen(false); }
  function show(input: "pointer" | "keyboard" = "keyboard") {
    const node = select.current;
    if (!node || node.disabled) return;
    setChoices(Array.from(node.options, o => ({ value: o.value, label: o.label, disabled: o.disabled || (o.parentElement instanceof HTMLOptGroupElement && o.parentElement.disabled) })));
    setNavigation(input);
    setSelected(node.value); setActive(Math.max(0, node.selectedIndex)); setOpen(true); node.focus();
  }
  function choose(index: number) {
    const node = select.current, option = choices[index];
    if (!node || node.disabled || !option || option.disabled) return;
    node.value = option.value;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
    close(); node.focus();
  }
  useEffect(() => {
    if (!open || !select.current || !popup.current) return;
    const node = select.current, panel = popup.current;
    const position = () => {
      const rect = node.getBoundingClientRect(), view = window.visualViewport;
      const height = view?.height || innerHeight, width = view?.width || innerWidth;
      const top = view?.offsetTop || 0, left = view?.offsetLeft || 0;
      const below = height + top - rect.bottom - 8, above = rect.top - top - 8;
      const up = below < Math.min(panel.scrollHeight, 280) && above > below;
      panel.style.width = `${Math.min(Math.max(rect.width, 180), width - 16)}px`;
      panel.style.maxHeight = `${Math.max(40, Math.min(300, up ? above : below))}px`;
      panel.style.left = `${Math.max(left + 8, Math.min(rect.left, left + width - panel.offsetWidth - 8))}px`;
      panel.style.top = `${up ? rect.top - panel.offsetHeight - 6 : rect.bottom + 6}px`;
      panel.dataset.side = up ? "top" : "bottom";
    };
    panel.showPopover(); position();
    const dismiss = (event: Event) => { if (!panel.contains(event.target as Node) && event.target !== node) close(); };
    const scroll = (event: Event) => {
      if (panel.contains(event.target as Node)) return;
      const rect = node.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) close(); else position();
    };
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("focusin", dismiss);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", scroll, true);
    window.visualViewport?.addEventListener("resize", position);
    return () => {
      panel.hidePopover();
      document.removeEventListener("pointerdown", dismiss, true); document.removeEventListener("focusin", dismiss);
      window.removeEventListener("resize", position); window.removeEventListener("scroll", scroll, true);
      window.visualViewport?.removeEventListener("resize", position);
    };
  }, [open]);
  useEffect(() => {
    const panel = popup.current, option = panel?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!open || !panel || !option) return;
    if (option.offsetTop < panel.scrollTop) panel.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > panel.scrollTop + panel.clientHeight)
      panel.scrollTop = option.offsetTop + option.offsetHeight - panel.clientHeight;
  }, [active, open]);
  return <span className="ui-select" data-open={open} data-navigation={navigation}>
    <select {...props} ref={select} aria-expanded={open} aria-controls={open ? id : undefined} aria-activedescendant={open ? `${id}-${active}` : undefined}
      onChange={event => { onChange?.(event); close(); }}
      onBlur={event => { onBlur?.(event); setNavigation("keyboard"); }}
      onPointerDown={event => { setNavigation("pointer"); onPointerDown?.(event); if (!event.defaultPrevented) { event.preventDefault(); if (open) close(); else show("pointer"); } }}
      onMouseDown={event => event.preventDefault()}
      onClick={event => { onClick?.(event); event.preventDefault(); if (event.detail === 0 && !open) show(); }}
      onKeyDown={event => {
        setNavigation("keyboard");
        onKeyDown?.(event); if (event.defaultPrevented) return;
        if (event.key === "Tab") { close(); return; }
        if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); return; }
        if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) {
          event.preventDefault(); if (!open) { show(); return; }
          if (["Enter", " "].includes(event.key)) { choose(active); return; }
          const enabled = choices.map((o,i) => o.disabled ? -1 : i).filter(i=>i>=0);
          const index = enabled.indexOf(active);
          const next = event.key === "Home" ? enabled[0] : event.key === "End" ? enabled.at(-1) : enabled[(index + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length];
          if (next !== undefined) setActive(next);
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault(); if (!open) show();
          const now = Date.now(); search.current.text = (now - search.current.time > 700 ? "" : search.current.text) + event.key.toLocaleLowerCase(); search.current.time = now;
          const list = open ? choices : Array.from(select.current!.options, o=>({label:o.label,disabled:o.disabled}));
          const next = list.findIndex(o=>!o.disabled && o.label.toLocaleLowerCase().startsWith(search.current.text)); if(next>=0)setActive(next);
        }
      }}>{children}</select>
    <svg className="ui-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
    <div ref={popup} id={id} popover="manual" role="listbox" aria-label="可选项" className="ui-select-popup" data-navigation={navigation} onPointerDown={e=>e.preventDefault()}>
      {choices.map((option,index)=><div id={`${id}-${index}`} key={`${index}:${option.value}`} role="option" aria-selected={selected===option.value} aria-disabled={option.disabled} data-index={index} data-active={active===index} className="ui-select-option" onPointerMove={()=>{setNavigation("pointer");if(!option.disabled)setActive(index)}} onClick={e=>{e.preventDefault();e.stopPropagation();choose(index)}}><span className="ui-select-option-label">{option.label}</span><svg className="ui-select-check" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></div>)}
    </div>
  </span>;
}
