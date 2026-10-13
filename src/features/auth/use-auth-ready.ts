"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

// Exported HTML is visible before React hydrates. Keep credentials disabled
// until event handlers exist so early input cannot be discarded on hydration.
export function useAuthReady() {
  return useSyncExternalStore(subscribe, clientReady, serverReady);
}
