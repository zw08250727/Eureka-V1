import { useAgentCreditSimulation, AgentSimulationMessages, AgentSendButton } from "@/features/agent/credit-preview";
import { AgentCredits } from "@/features/agent/credits";
import { AgentHistoryButton } from "@/features/agent/history-button";
import { useContext, useMemo, useState, type RefObject } from "react";
import { RefIcon } from "@/features/reference/symbols";
import { AgentMaterialPicker, AgentMaterialSummary, readMaterials, type AgentMaterial } from "@/features/agent/material-picker";
import { AgentScope } from "@/features/agent/scope";
import type { Contact } from "./store";
import { ContactResizeHandle } from "./contact-resize";

export function contactAnswer(question: string, person?: Contact) {
  if (!person) return "当前没有可用联系人上下文。";
  const todos = (person.interactions || []).flatMap((m) => m.todos || []);
  if (/承诺|待办/.test(question))
    return todos.length ? `${person.name} 相关的双方待办共 ${todos.length} 项：${todos.map((p) => `${p.side === "mine" ? "我" : person.name}：${p.title}（${p.due || "时间未约定"}）`).join("；")}。` : `${person.name} 暂无会议提取的待办。`;
  if (question.includes("第一次"))
    return `${person.name} 尚未提供已核实的首次认识时间。`;
  return `${person.name}：${person.summary || "暂无关系摘要。"}\n建议围绕已记录的事实确认下一步；尚未创建或发送任何安排。`;
}
export function ContactAgentEntry({
  expanded,
  onToggle,
  buttonRef,
}: {
  expanded: boolean;
  onToggle: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="contacts-xiaozhi-entry"
      data-contact-action="toggle-xiaozhi"
      aria-controls="contacts-xiaozhi-rail"
      aria-expanded={expanded}
      aria-label={expanded ? "收起 Ask Agent" : "Ask Agent"}
      onClick={onToggle}
    >
      <span className="contacts-xiaozhi-mark">
        <RefIcon name="spark" />
      </span>
      <span>
        <strong>{expanded ? "收起 Ask Agent" : "Ask Agent"}</strong>
        <small>结合客户资料与会议继续工作</small>
      </span>
      <RefIcon
        name={expanded ? "collapse" : "expand"}
        className="icon contacts-xiaozhi-arrow"
      />
    </button>
  );
}
export function ContactAgent({
  person,
  expanded,
  answer,
  draft,
  onDraft,
  onToggle,
  onSend,
  onAsk,
  onNewTask,
  inputRef,
}: {
  person?: Contact;
  expanded: boolean;
  answer: string;
  draft: string;
  onDraft: (value: string) => void;
  onToggle: () => void;
  onSend: () => void;
  onAsk: (question: string) => void;
  onNewTask: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const simulation = useAgentCreditSimulation(expanded);
  function send(question = draft, suggested = false) {
    const simulated = simulation.send(question.trim());
    if (simulated) { if (simulated === "sent") onDraft(""); return; }
    if (suggested) onAsk(question); else onSend();
  }
  const [materials, setMaterials] = useState<AgentMaterial[]>([]);
  const scope = useContext(AgentScope);
  const contactCount = useMemo(() => {
    if (!scope) return 0;
    try { return readMaterials(scope).filter(item => item.category === "contacts").length; } catch { return 0; }
  }, [scope]);
  const compactContacts = contactCount > 0 && materials.length === contactCount;
  return (
    <aside
      className={`contacts-xiaozhi-rail${expanded ? " expanded" : ""}`}
      id="contacts-xiaozhi-rail"
      aria-labelledby="contacts-xiaozhi-title"
      aria-hidden={!expanded}
    >
      <ContactResizeHandle />
      <div className="xiaozhi-panel">
        <div className="xiaozhi-head">
          <div className="xiaozhi-identity">
            <span className="xiaozhi-mark">
              <RefIcon name="spark" />
            </span>
            <div>
              <h2 id="contacts-xiaozhi-title">Ask Agent</h2>
              <p>结合客户资料与会议继续工作</p>
            </div>
          </div>
          <div className="xiaozhi-head-actions">
            <AgentHistoryButton />
            <button
              type="button"
              className="agent-new-task"
              data-contact-action="new-agent-task"
              aria-label="新建会话"
              title="新建会话"
              onClick={() => { simulation.reset(); setMaterials([]); onNewTask(); }}
            >
              <RefIcon name="new-task" />
            </button>
            <button
              type="button"
              data-contact-action="toggle-xiaozhi"
              aria-label="收起 Ask Agent"
              onClick={onToggle}
            >
              <RefIcon name="x" />
            </button>
          </div>
        </div>
        <div className="xiaozhi-body">
          <div className="contacts-xiaozhi-messages">
            <div className="xiaozhi-intro" hidden={simulation.hasMessages}>
              <span className="xiaozhi-state">
                <i />
                联系人上下文
              </span>
              <h3>继续这段关系的工作</h3>
              <p>引用联系人关系、互动与承诺，再开始分析与创作。</p>
              <div className="xiaozhi-suggestions">
                {[
                  "总结这位联系人的最新进展",
                  "准备下一次沟通",
                  "整理双方待办",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    data-contact-action="ask"
                    data-value={prompt}
                    onClick={() => send(prompt, true)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            <div className="contacts-xiaozhi-answer" hidden={simulation.hasMessages} aria-live="polite">
              {answer || person?.summary || "暂无关系摘要"}
            </div>

            <AgentSimulationMessages kind="contacts" />
            {expanded && <AgentCredits />}
          </div>
          <div className="xiaozhi-composer">
            <AgentMaterialSummary compact={compactContacts} compactLabel={`通讯录 · ${materials.length}个联系人`} selected={materials} onRemove={(id) => setMaterials(items => items.filter(item => item.id !== id))} />
            <textarea
              ref={inputRef}
              name="question"
              data-contact-xiaozhi-input
              placeholder="输入问题，按 Enter 发送…"
              aria-label="向 Ask Agent 输入任务"
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <div className="xiaozhi-composer-foot">
              <AgentMaterialPicker autoSelectCategory="contacts" selected={materials} onChange={setMaterials} triggerClassName={`agent-tool-button${materials.length ? " has-sources" : ""}`} />
              <div className="xiaozhi-context">
                <span>引用资料</span>
                <span className="selected">
                  <RefIcon name="user" />
                  {person?.name || "联系人"}
                </span>
              </div>
              <AgentSendButton className="xiaozhi-send" data-contact-action="send-xiaozhi" label="发送给 Ask Agent" disabled={!draft.trim()} onSend={() => send()}><RefIcon name="send" /></AgentSendButton>
            </div>
            <span className="agent-context-hint">{materials.length ? `已引用联系人关系和 ${materials.length} 项素材` : "已引用联系人关系"}</span>
            <div className="agent-composer-caption">
              <span>Enter 发送 / Shift+Enter 换行</span>

            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
