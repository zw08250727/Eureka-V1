"use client";
import { useRef, useState, type ReactNode } from "react";
import { AgentPanel } from "@/features/workbench/components/agent-panel";
import type { AgentGateway } from "@/features/workbench/model/types";
import { Button } from "@/components/ui/button";
import { PageHead } from "./ui";
export function FeaturePage({
  title,
  description,
  actions,
  lines,
  children,
  gateway,
  files,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  lines: string[];
  children: ReactNode;
  gateway?: AgentGateway;
  files?: { id: string; title: string }[];
}) {
  const host = useRef<HTMLDivElement>(null),
    [open, setOpen] = useState(false);
  return (
    <div className="feature-layout" ref={host}>
      <div className="feature-column">
        <PageHead title={title} description={description}>
          {actions}
          <Button onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "收起 Ask Agent" : "Ask Agent"}
          </Button>
        </PageHead>
        {children}
      </div>
      <AgentPanel
        key={title}
        open={open}
        onClose={() => setOpen(false)}
        host={host}
        gateway={gateway}
        files={files}
        draft={{
          context: { kind: "daily", title, lines },
          text: "",
          sequence: 0,
        }}
      />
    </div>
  );
}
