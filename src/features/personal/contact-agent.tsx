import type { RefObject } from "react";
import { RefIcon } from "@/features/reference/symbols";
import type { Contact } from "./store";
import { ContactResizeHandle } from "./contact-resize";

export function contactAnswer(question: string, person?: Contact) {
  if (!person) return "当前没有可用联系人上下文。";
  if (person.id !== "john") {
    if (question.includes("承诺"))
      return person.commitments?.length
        ? `${person.name} 的开放承诺：${person.commitments.map((item) => item[0]).join("；")}。`
        : `${person.name} 暂无已记录的开放承诺，可先补充沟通记录。`;
    if (question.includes("第一次"))
      return `${person.name} 尚未记录首次认识的时间。`;
    return `${person.name}：${person.summary || "暂无关系摘要。"}${question.includes("下一次") ? "建议围绕已记录的主题确认下一步；尚未创建或发送任何安排。" : ""}`;
  }
  if (question.includes("第一次"))
    return "首次联系发生在 2026 年 6 月 12 日的 Energy Storage Summit。";
  if (question.includes("三个")) return "当前重点是认证、交付周期与渠道支持。";
  if (question.includes("会议") || question.includes("下一次"))
    return "建议先确认德国经销商名单，再同步 Demo 环境准备情况，并讨论认证时间表。";
  if (question.includes("开放承诺"))
    return "当前有 2 个开放承诺：发送德国经销商名单、确认认证时间表。";
  return "John 承诺发送德国经销商名单，并确认认证时间表；你需要准备 Demo 环境。";
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
        <small>使用联系人关系继续工作</small>
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
              <p>使用联系人关系继续工作</p>
            </div>
          </div>
          <div className="xiaozhi-head-actions">
            <button
              type="button"
              className="agent-new-task"
              data-contact-action="new-agent-task"
              aria-label="新建任务"
              title="新建任务"
              onClick={onNewTask}
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
            <div className="xiaozhi-intro">
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
                  "整理开放承诺",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    data-contact-action="ask"
                    data-value={prompt}
                    onClick={() => onAsk(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            <div className="contacts-xiaozhi-answer" aria-live="polite">
              {answer || person?.summary || "暂无关系摘要"}
            </div>
            <small className="contacts-xiaozhi-note">
              示例回答 · 未连接 AI 服务
            </small>
          </div>
          <div className="xiaozhi-composer">
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
                  onSend();
                }
              }}
            />
            <div className="xiaozhi-composer-foot">
              <div className="xiaozhi-context">
                <span>引用资料</span>
                <span className="selected">
                  <RefIcon name="user" />
                  {person?.name || "联系人"}
                </span>
              </div>
              <button
                type="button"
                className="xiaozhi-send"
                data-contact-action="send-xiaozhi"
                aria-label="发送给 Ask Agent"
                disabled={!draft.trim()}
                onClick={onSend}
              >
                <RefIcon name="send" />
              </button>
            </div>
            <span className="agent-context-hint">已引用联系人关系</span>
            <div className="agent-composer-caption">
              <span>Enter 发送 / Shift+Enter 换行</span>
              <span>本地模拟</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
