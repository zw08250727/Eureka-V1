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
          <ContactTag>{theme}</ContactTag>
        </Fragment>
      ))
    : empty;
}
function Commitments({
  items,
  deadline = true,
}: {
  items: string[][];
  deadline?: boolean;
}) {
  return items.map(([title, due, status], index) => (
    <ContactLine
      key={index}
      title={
        <>
          {title} <ContactTag>{status}</ContactTag>
        </>
      }
    >
      {deadline ? "截止 " : ""}
      {due}
    </ContactLine>
  ));
}
export function ContactDetail({
  person,
  tab,
  notes,
  onFollowup,
}: {
  person: Contact;
  tab: string;
  notes: ContactsState["notes"][string];
  onFollowup: () => void;
}) {
  const john = person.id === "john";
  if (tab === "概览")
    return (
      <div className="contacts-detail-grid">
        <div className="contacts-wide">
          <ContactCard title="AI 关系摘要">
            <p>
              {john
                ? "John 负责 ABC Energy 的德国销售业务。过去三个月，你们主要围绕德国储能 PCS 渠道合作、价格体系、认证和联合客户拜访展开讨论。最近一次会议中，John 承诺在本周内提供德国潜在经销商名单；当前最值得跟进的是渠道名单和 Demo 环境。"
                : person.summary}
            </p>
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
          {person.commitments?.length ? (
            <Commitments items={person.commitments} />
          ) : (
            <p>暂无开放承诺</p>
          )}
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
    return person.commitments?.length ? (
      <div className="contacts-detail-grid">
        <ContactCard title={`来自 ${person.name} 的承诺`}>
          <Commitments items={person.commitments} />
        </ContactCard>
        <ContactCard title="我的承诺">
          <Commitments items={person.myCommitments || []} deadline={false} />
        </ContactCard>
        <div className="contacts-wide">
          <ContactCard title="跟进建议">
            <p>
              {john
                ? "建议优先确认经销商名单交付时间，并将 Demo 环境准备情况同步给 John。"
                : person.summary}
            </p>
            <button
              type="button"
              className="contacts-button primary"
              data-contact-action="followup"
              data-value={person.id}
              onClick={onFollowup}
            >
              创建跟进任务
            </button>
          </ContactCard>
        </div>
      </div>
    ) : (
      <ContactCard title="承诺">
        <div className="contacts-empty">暂无承诺</div>
      </ContactCard>
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
        {john ? (
          <>
            <br />
            <ContactCard title="主题动态">
              <ContactLine title="德国市场">
                最近讨论：德国储能渠道策略与潜在经销商名单 · 最近 30 天
              </ContactLine>
              <ContactLine title="价格">
                最近讨论：德国渠道的定价反馈与售后支持 · 最近 30 天
              </ContactLine>
              <ContactLine title="Pilot">
                最近讨论：首批试点客户的认证节奏与 Demo 支持 · 最近 30 天
              </ContactLine>
            </ContactCard>
          </>
        ) : null}
      </>
    );
  return (
    <>
      <ContactCard title="已确认记忆">
        {person.memories?.length ? (
          person.memories.map((item, i) => <p key={i}>{`• ${item}`}</p>)
        ) : (
          <p>暂无已确认记忆</p>
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
              </ContactLine>
            ))}
          </ContactCard>
        </>
      ) : null}
    </>
  );
}
