"use client";
import { useEffect, useState } from "react";

export function EnterpriseEntryToast() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return <div className="auth-entry-toast" role="status" aria-live="polite">
    <span aria-hidden="true" className="auth-entry-toast-icon">i</span>
    <span>以线上为准</span>
    <button type="button" aria-label="关闭提示" onClick={() => setVisible(false)}>×</button>
  </div>;
}
