"use client";
import { createContext } from "react";
import type { SpacesController } from "@/features/spaces/use-spaces";
export const AgentScope = createContext<{
  controller: SpacesController;
  space: string;
  actor: string;
} | null>(null);
