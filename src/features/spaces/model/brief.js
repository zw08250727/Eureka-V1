// Source-backed local adapter. Structured observations can be supplied by the
// scene MCP; plain summaries remain single-meeting facts, never model consensus.
export function buildTeamBrief(files, now = new Date()) {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - 6);
  const groups = new Map();
  for (const file of new Map(files.map((f) => [f.id, f])).values()) {
    const time = new Date(
      String(file.occurredAt || file.created).replace(" ", "T"),
    ).getTime();
    if (!Number.isFinite(time) || time > +now) continue;
    const text = `${file.summary || ""}\n${file.transcript || ""}`;
    const structured = Array.isArray(file.detail?.briefFacts)
      ? file.detail.briefFacts
      : [];
    const observations = structured.length
      ? structured
      : [
          {
            issueId: `meeting:${file.id}`,
            topic: file.title,
            quote: String(file.summary || "")
              .split(/\n\s*\n/)[0]
              .trim(),
            kind: "fact",
          },
        ];
    for (const fact of observations) {
      if (
        !fact.issueId ||
        !fact.topic ||
        typeof fact.quote !== "string" ||
        !fact.quote.trim() ||
        !text.includes(fact.quote)
      )
        continue;
      const key = String(fact.issueId),
        group = groups.get(key) || [];
      group.push({
        ...fact,
        time,
        recent: time >= +from,
        source: {
          fileId: file.id,
          title: file.title,
          owner: file.owner,
          created: file.created,
          quote: fact.quote,
        },
      });
      groups.set(key, group);
    }
  }
  const items = [];
  for (const [id, observations] of groups) {
    observations.sort((a, b) => a.time - b.time);
    const latest = observations.at(-1);
    const lastState = [...observations]
      .reverse()
      .find((o) =>
        ["open", "in_progress", "blocked", "resolved", "cancelled"].includes(
          o.status,
        ),
      );
    const open = ["open", "in_progress", "blocked"].includes(lastState?.status);
    if (!observations.some((o) => o.recent) && !open) continue;
    const sourceMap = new Map();
    for (const o of observations) {
      const prior = sourceMap.get(o.source.fileId);
      sourceMap.set(o.source.fileId, {
        ...o.source,
        quote:
          prior && prior.quote !== o.quote
            ? `${prior.quote}\n${o.quote}`
            : o.quote,
      });
    }
    const sources = [...sourceMap.values()];
    const speakers = new Set(
      observations
        .filter((o) => o.kind === "consensus" && o.agreed === true)
        .flatMap((o) => (Array.isArray(o.speakerIds) ? o.speakerIds : [])),
    );
    const consensus =
      sources.length >= 2 &&
      speakers.size >= 2 &&
      observations.every(
        (o) =>
          o.kind === "consensus" &&
          o.agreed === true &&
          o.agreementId &&
          o.agreementId === latest.agreementId,
      );
    const risk = observations.some((o) => ["risk", "gap"].includes(o.kind));
    const label =
      lastState?.status === "resolved"
        ? "已解决"
        : consensus
          ? "明确共识"
          : sources.length === 1
            ? "单次会议要点"
            : "跨会议讨论";
    const deadline = new Date(
      [...observations].reverse().find((o) => o.deadline !== undefined)
        ?.deadline || "",
    ).getTime();
    items.push({
      id,
      topic: latest.topic,
      title: `${latest.topic} · ${label}`,
      label,
      kind: risk ? "risk" : "fact",
      description: [...new Set(observations.map((o) => o.quote))].join(" "),
      next: "建议回到原始会议核实当前进展、负责人和下一步；尚未执行或通知任何人。",
      impact: "仅基于当前可访问的会议记录。",
      sources,
      updatedAt: new Date(latest.time).toISOString(),
      priority:
        Number.isFinite(deadline) && deadline <= +now + 7 * 86400000 && open
          ? 0
          : risk
            ? 1
            : 2,
      timestamp: latest.time,
    });
  }
  return items.sort(
    (a, b) =>
      a.priority - b.priority ||
      b.timestamp - a.timestamp ||
      a.id.localeCompare(b.id),
  );
}
