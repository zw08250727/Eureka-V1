"use client";
import { createContext, useContext, useLayoutEffect } from "react";
export const PageTitleContext = createContext<{
  baseTitle: string;
  setTitle: (value: string) => void;
}>({ baseTitle: "", setTitle: () => {} });
export function usePageTitle(title: string) {
  const { baseTitle, setTitle } = useContext(PageTitleContext);
  useLayoutEffect(() => {
    setTitle(title);
    return () => setTitle(baseTitle);
  }, [title, baseTitle, setTitle]);
}
