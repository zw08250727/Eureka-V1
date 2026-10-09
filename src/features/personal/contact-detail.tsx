import {
  contactPromises,
  promiseStatus,
  openPromise,
  type ContactPromise,
} from "./contact-rules";
import { Fragment, type ReactNode } from "react";
import type { Contact, ContactsState } from "./store";

export function ContactTag({ children }: { children: string }) {
  return (
    <span
      className={`contacts-tag ${["需关注", "待回复"].includes(children) ? "warm" : ["已完成", "进行中"].includes(children) ? "green" : ""}`}
    >
      {children}
    </span>
  );
}
export function ContactCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="contacts-card ">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export function ContactLine({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="contacts-line">
      <strong>{title}</strong>
      <small>{children}</small>
    </div>
  );
}
function Themes({ person, empty }: { person: Contact; empty: ReactNode }) {
  return person.themes?.length
    ? person.themes.map((theme, i) => (
        <Fragment key={theme}>
          {i > 0 ? " " : null}
          <ContactTag>
            {theme.replace(/\s*·\s*\d+(?:\s*次互动)?$/, "")}
          </ContactTag>
        </Fragment>
      ))
    : empty;
}
function Commitments({
  items,
  onChange,
}: {
  items: ContactPromise[];
  onChange: (id: string, status: string) => void;
}) {
  if (!items.length) return <p>暂无承诺</p>;
  return items.map((item) => (
    <ContactLine
      key={item.id}
      title={
        <>
          {item.title} <ContactTag>{promiseStatus(item)}</ContactTag>
        </>
      }
    >
      {item.due || "未设置截止时间"}
      <label className="contact-commitment-state">
        状态{" "}
        <select
          aria-label={`承诺状态：${item.title}`}
          value={item.status}
          onChange={(e) => onChange(item.id, e.target.value)}
        >
          {["待确认", "待完成", "进行中", "已完成", "已取消"].map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
    </ContactLine>
  ));
}
export function ContactDetail({
  person,
  tab,
  notes,
  onFollowup,
  onPromise,
  onConfirmMemory,
  onEditNote,
  onDeleteNote,
}: {
  person: Contact;
  tab: string;
  notes: ContactsState["notes"][string];
  onFollowup: () => void;
  onPromise: (id: string, status: string) => void;
  onConfirmMemory: (text: string) => void;
  onEditNote: (index: number) => void;
  onDeleteNote: (index: number) => void;
}) {
  const promises = contactPromises(person);
  if (tab === "概览")
    return (
      <div className="contacts-detail-grid">
        <div className="contacts-wide">
          <ContactCard title="AI 关系摘要">
            <p>{person.summary || "暂无关系摘要"}</p>
          </ContactCard>
        </div>
        <ContactCard title="档案">
          <dl className="contacts-facts">
            <dt>公司</dt>
            <dd>{person.company}</dd>
            <dt>角色</dt>
            <dd>{person.role}</dd>
            <dt>地区</dt>
            <dd>{person.region || "待补充"}</dd>
            <dt>邮箱</dt>
            <dd>{person.email || "待补充"}</dd>
            <dt>关系</dt>
            <dd>
              <ContactTag>{person.tag}</ContactTag>
            </dd>
          </dl>
        </ContactCard>
        <ContactCard title="开放承诺">
          <Commitments
            items={promises.filter(openPromise)}
            onChange={onPromise}
          />
        </ContactCard>
        <div className="contacts-wide">
          <ContactCard title="关键主题">
            <Themes person={person} empty={<p>暂无主题</p>} />
          </ContactCard>
        </div>
      </div>
    );
  if (tab === "时间线")
    return (
      <ContactCard title="关系时间线">
        {person.timeline?.length ? (
          <div className="contacts-timeline">
            {person.timeline.map(([title, meta, description], i) => (
              <ContactLine key={i} title={title}>
                {meta}
                <br />
                {description}
              </ContactLine>
            ))}
          </div>
        ) : (
          <div className="contacts-empty">暂无时间线记录</div>
        )}
      </ContactCard>
    );
  if (tab === "承诺")
    return (
      <div className="contacts-detail-grid">
        <ContactCard title={`来自 ${person.name} 的承诺`}>
          <Commitments
            items={promises.filter((p) => p.side === "theirs")}
            onChange={onPromise}
          />
        </ContactCard>
        <ContactCard title="我的承诺">
          <Commitments
            items={promises.filter((p) => p.side === "mine")}
            onChange={onPromise}
          />
        </ContactCard>
        <div className="contacts-wide">
          <ContactCard title="跟进建议">
            <p>
              {promises.some(openPromise)
                ? "可围绕上述未完成承诺确认进展；创建跟进前请核对责任人与期限。"
                : "暂无未完成承诺。"}
            </p>
            <button
              type="button"
              className="contacts-button primary"
              data-contact-action="followup"
              onClick={onFollowup}
            >
              创建跟进
            </button>
          </ContactCard>
        </div>
      </div>
    );
  if (tab === "主题")
    return (
      <>
        <ContactCard title="主题">
          <Themes
            person={person}
            empty={<div className="contacts-empty">暂无主题</div>}
          />
        </ContactCard>
        <p className="contacts-muted">
          活跃主题仅统计最近 30
          天已核实互动涉及的主题；旧主题标签不作为计数依据。
        </p>
      </>
    );
  return (
    <>
      <ContactCard title="关系记忆">
        {person.memories?.length ? (
          person.memories.map((item) => (
            <div key={item}>
              <p>{item}</p>
              <small>
                {person.memoryConfirmations?.[item]
                  ? "用户已确认"
                  : "来源待核实"}
              </small>
              {!person.memoryConfirmations?.[item] && (
                <button
                  type="button"
                  className="contacts-button"
                  onClick={() => onConfirmMemory(item)}
                >
                  确认记忆
                </button>
              )}
            </div>
          ))
        ) : (
          <p>暂无关系记忆</p>
        )}
      </ContactCard>
      <br />
      <ContactCard title="AI 推断">
        {person.inferences?.length ? (
          <>
            {person.inferences.map((item, i) => (
              <p key={i}>{`• ${item}`}</p>
            ))}
            <p className="contacts-muted">以上推断需要后续互动确认。</p>
          </>
        ) : (
          <p>暂无推断</p>
        )}
      </ContactCard>
      {notes.length ? (
        <>
          <br />
          <ContactCard title="我的备注">
            {notes.map((note, i) => (
              <ContactLine key={i} title={note.text}>
                {note.time}
                <button
                  type="button"
                  className="contacts-button"
                  onClick={() => onEditNote(i)}
                >
                  编辑备注
                </button>
                <button
                  type="button"
                  className="contacts-button"
                  onClick={() => onDeleteNote(i)}
                >
                  删除备注
                </button>
              </ContactLine>
            ))}
          </ContactCard>
        </>
      ) : null}
    </>
  );
}
