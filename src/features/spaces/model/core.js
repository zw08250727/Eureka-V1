// Pure business rules preserved from the verified prototype; no DOM or global registration.

const KEY = "eureka:workspaces:v2";
const SELF = "zhang";
const clone = (x) => JSON.parse(JSON.stringify(x));
const id = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const stamp = () => new Date().toISOString();
const price = (cycle) => (cycle === "year" ? 159 * 12 : 199);
const fail = (message) => {
  throw new Error(message);
};
const person = (uid, name, email, role = "member", status = "active") => ({
  id: uid,
  name,
  email,
  role,
  status,
  joined: "2026-10-01",
});
const file = (uid, title, owner, shared = [], duration = 32) => ({
  id: uid,
  title,
  owner,
  shared,
  duration,
  created: "2026-10-06 10:30",
  source: "网页录音",
  summary: `本次会议围绕「${title}」展开，明确本阶段目标、交付范围与协作分工。\n\n下一步：补齐客户反馈，确认方案负责人，并在下次例会跟进交付进度。`,
  transcript:
    "00:00 张伟：今天先确认目标与交付范围。\n02:15 林晓：建议优先处理客户反馈，再安排下一轮演示。\n05:40 Kevin：我来补充执行计划，周五一起确认。",
  deleted: false,
});
const baseTeam = (uid, name, members, seats = 5) => ({
  id: uid,
  type: "team",
  name,
  country: "中国",
  members,
  seats,
  cycle: "year",
  status: "active",
  renew: true,
  nextDate: "2027-10-06",
  pendingSeats: null,
  files: [],
  contacts: [],
  threads: [],
  credits: { total: 50000, used: 0, logs: [] },
  billing: {
    company: name,
    email: "finance@eureka.example",
    taxId: "",
    method: "Visa ···· 4242",
  },
  invoices: [],
  audit: [],
  security: { externalSharing: false },
});
function seed() {
  const a = baseTeam(
    "team-eureka",
    "EurekaMind 产品团队",
    [
      person(SELF, "张伟", "zhang.wei@eureka.example", "admin"),
      person("lin", "林晓", "lin.xiao@eureka.example", "admin"),
      person("kevin", "Kevin", "kevin@eureka.example"),
      person("alice", "Alice", "alice@eureka.example", "member", "pending"),
    ],
    6,
  );
  a.files = [
    file("team-review", "团队产品周会 · 十月路线图", SELF),
    file("team-customer", "客户共创访谈 · 交付流程", "lin", [SELF]),
    file("team-private", "林晓的个人绩效沟通", "lin"),
    file("team-market", "海外市场验证方案", "kevin", [SELF], 46),
  ];
  a.contacts = [
    {
      id: "c-team-1",
      name: "陈明",
      company: "星海科技",
      role: "客户成功负责人",
      summary: "周五确认试点验收标准，需准备最新交付方案。",
    },
    {
      id: "c-team-2",
      name: "李悦",
      company: "远山资本",
      role: "投资经理",
      summary: "已共享产品进展，等待下一轮演示时间。",
    },
  ];
  a.credits.used = 12400;
  a.credits.logs = [
    {
      id: "usage-1",
      user: SELF,
      task: "十月产品周会行动项",
      amount: 31.5,
      inputTokens: 18500,
      outputTokens: 6500,
      source: "simulated",
      model: "Eureka Agent（模拟）",
      rateVersion: "token-demo-v1",
      runId: "demo-run-1",
      time: "2026-10-06 09:35",
    },
    {
      id: "usage-2",
      user: "lin",
      task: "历史使用汇总",
      amount: 12368.5,
      time: "2026-10-05 17:20",
    },
  ];
  a.invoices = [
    {
      id: "INV-20261006-001",
      date: "2026-10-06",
      amount: price("year") * 6,
      label: "Team 年付 · 6 席位",
      status: "已支付",
    },
  ];
  a.audit = [
    { time: "2026-10-06 09:00", actor: "张伟", action: "邀请 Alice 加入团队" },
  ];
  const b = baseTeam(
    "team-design",
    "设计共创空间",
    [
      person("lin", "林晓", "lin.xiao@eureka.example", "admin"),
      person(SELF, "张伟", "zhang.wei@eureka.example"),
    ],
    3,
  );
  b.files = [
    file("design-file", "设计评审 · 新版工作台", "lin", [SELF]),
    file("design-own", "我的设计调研笔记", SELF),
  ];
  return {
    version: 2,
    account: { id: SELF, name: "张伟", email: "zhang.wei@eureka.example" },
    activeId: "personal",
    spaces: [
      {
        id: "personal",
        type: "personal",
        name: "个人工作空间",
        plan: "Pro",
        files: [],
        threads: [],
        members: [person(SELF, "张伟", "zhang.wei@eureka.example", "admin")],
        credits: { total: 3000, used: 0, logs: [] },
      },
      a,
      b,
    ],
    devices: [
      {
        id: "dev-personal",
        name: "我的 Eureka Note",
        serial: "EK-N-20260018",
        model: "Note",
        spaceId: "personal",
        user: SELF,
        lastSync: "2026-10-06 09:32",
      },
      {
        id: "dev-team",
        name: "产品团队录音卡",
        serial: "EK-N-20260026",
        model: "Note Pro",
        spaceId: a.id,
        user: "lin",
        lastSync: "2026-10-06 10:15",
      },
    ],
    invitations: [
      {
        id: "invite-growth",
        teamName: "增长研究小组",
        admin: "王晨",
        email: "zhang.wei@eureka.example",
        status: "pending",
      },
    ],
    orders: [],
  };
}
const get = (s, uid = s.activeId) =>
  s.spaces.find((w) => w.id === uid) || fail("工作空间不存在");
const member = (w, uid = SELF) =>
  w.status !== "dissolved" &&
  w.members.find((m) => m.id === uid && m.status === "active");
const admin = (w, uid = SELF) => member(w, uid)?.role === "admin";
// A member consumes an existing seat; joining never starts a separate billing period.
function seatEntitlement(w, uid = SELF) {
  const m = w.members.find((m) => m.id === uid);
  const status =
    w.status === "dissolved" || !m || m.status === "removed"
      ? "revoked"
      : m.status === "pending"
        ? "pending"
        : w.status === "active"
          ? "active"
          : "expired";
  return { status, endsOn: w.nextDate || null, renew: !!w.renew };
}
const usedSeats = (w) => w.members.filter((m) => m.status !== "removed").length;
const writable = (w) => {
  if (w.type === "team" && w.status !== "active")
    fail("工作空间处于只读状态，请恢复订阅后再操作");
};
const govern = (w, uid = SELF) => {
  if (!admin(w, uid)) fail("仅管理员可执行此操作");
};
const access = (w, uid = SELF) => {
  if (!member(w, uid)) fail("你没有此工作空间的访问权限");
};
const log = (w, action, uid = SELF) => {
  if (w.type === "team")
    w.audit.unshift({
      time: stamp(),
      actor: member(w, uid)?.name || uid,
      action,
    });
};
const teamRecording = (w, f) =>
  w.type === "team" &&
  f.visibility === "team" &&
  f.recordedWorkspaceId === w.id;
const visible = (w, uid = SELF) => {
  access(w, uid);
  return w.files.filter(
    (f) =>
      !f.deleted &&
      (teamRecording(w, f) || f.owner === uid || f.shared.includes(uid)),
  );
};
const getFile = (w, fid, uid = SELF) =>
  visible(w, uid).find((f) => f.id === fid) ||
  fail("文件不存在或未获得访问权限");
function create(s, { name, country, cycle, seats, orderId }) {
  name = String(name || "").trim();
  seats = Number(seats);
  if (!name || name.length > 40) fail("请输入 1–40 字的工作空间名称");
  if (!country) fail("请选择国家或地区");
  if (
    !["year", "month"].includes(cycle) ||
    !Number.isInteger(seats) ||
    seats < 2 ||
    seats > 50
  )
    fail("请选择 2–50 个席位及有效计费周期");
  const done = s.orders.find((o) => o.id === orderId);
  if (done) return get(s, done.spaceId);
  const w = baseTeam(
    id("team"),
    name,
    [person(SELF, s.account.name, s.account.email, "admin")],
    seats,
  );
  w.country = country;
  w.cycle = cycle;
  w.nextDate = cycle === "year" ? "2027-10-06" : "2026-11-06";
  const invoice = {
    id: id("INV"),
    date: stamp(),
    amount: price(cycle) * seats,
    label: `Team ${cycle === "year" ? "年付" : "月付"} · ${seats} 席位`,
    status: "已支付",
  };
  w.invoices.push(invoice);
  s.spaces.push(w);
  s.orders.push({ id: orderId, spaceId: w.id });
  s.activeId = w.id;
  log(w, "创建工作空间并开通 Team");
  return w;
}
function invite(w, emails, role = "member", actor = SELF) {
  govern(w, actor);
  writable(w);
  if (!["admin", "member"].includes(role)) fail("请选择有效角色");
  const list = [
    ...new Set(
      String(emails)
        .split(/[,，;；\s]+/)
        .filter(Boolean)
        .map((v) => v.toLowerCase()),
    ),
  ];
  if (!list.length || list.some((v) => !/^\S+@\S+\.\S+$/.test(v)))
    fail("请填写有效的邮箱，可用逗号分隔");
  if (
    list.some((email) =>
      w.members.some(
        (m) => m.email.toLowerCase() === email && m.status !== "removed",
      ),
    )
  )
    fail("部分邮箱已加入或已被邀请，请移除重复邮箱");
  if (usedSeats(w) + list.length > Math.min(w.seats, w.pendingSeats ?? w.seats))
    fail("可用席位不足，请先增加席位或取消已安排的减席");
  const added = list.map((email) => {
    const previous = w.members.find(
      (m) => m.email.toLowerCase() === email && m.status === "removed",
    );
    if (previous) {
      previous.status = "pending";
      previous.role = role;
      previous.reinvitedAt = stamp();
      return previous;
    }
    const m = person(id("member"), email.split("@")[0], email, role, "pending");
    w.members.push(m);
    return m;
  });
  log(w, `邀请 ${list.length} 位成员`, actor);
  return added;
}
function memberAction(s, w, mid, action, value, actor = SELF) {
  govern(w, actor);
  if (action !== "role") writable(w);
  const m =
    w.members.find((m) => m.id === mid && m.status !== "removed") ||
    fail("成员不存在");
  if (action === "role" && m.status !== "active") fail("请先等待成员接受邀请");
  if (action === "role" && !["admin", "member"].includes(value))
    fail("角色无效");
  if (
    m.role === "admin" &&
    m.status === "active" &&
    (action === "remove" || (action === "role" && value !== "admin")) &&
    w.members.filter((m) => m.role === "admin" && m.status === "active")
      .length <= 1
  )
    fail("必须至少保留一位管理员");
  if (action === "remove") {
    if (mid === actor) fail("请使用退出工作空间入口");
    departure(s, w, mid, "removed");
  } else if (action === "role") m.role = value;
  else if (action === "accept") {
    if (m.status !== "pending") fail("此邀请已处理");
    m.status = "active";
  } else if (action === "resend") {
    if (m.status !== "pending") fail("仅待接受的邀请可以重发");
    m.sentAt = stamp();
  } else fail("操作无效");
  log(
    w,
    `${{ remove: "移除", role: "调整角色", accept: "模拟接受邀请", resend: "重发邀请" }[action]}：${m.name}`,
    actor,
  );
}
function departure(s, w, uid, reason) {
  const m = w.members.find((m) => m.id === uid && m.status !== "removed");
  if (!m) return;
  m.status = "removed";
  m.leftAt = stamp();
  m.exitReason = reason;
  s.devices
    .filter((d) => d.spaceId === w.id && d.user === uid)
    .forEach((d) => {
      d.spaceId = null;
    });
  (w.automaticTasks || [])
    .filter((t) => t.user === uid)
    .forEach((t) => {
      t.enabled = false;
      t.pauseReason = reason;
    });
}
function leave(s, w, uid = SELF) {
  if (w.type !== "team") fail("个人空间不能退出");
  access(w, uid);
  if (
    admin(w, uid) &&
    w.members.filter((m) => m.status === "active" && m.role === "admin")
      .length === 1
  )
    fail("你是唯一管理员，请先指定另一位管理员，或解散团队");
  log(w, "退出团队：释放已分配席位，已购席位与团队 Credits 保留", uid);
  departure(s, w, uid, "left");
  if (uid === s.account.id && s.activeId === w.id) s.activeId = "personal";
}
function dissolve(s, w, name, uid = SELF) {
  if (w.type !== "team") fail("个人空间不能解散");
  govern(w, uid);
  if (String(name || "").trim() !== w.name)
    fail("团队名称不一致，请输入完整团队名称");
  const endedAt = stamp();
  // Preserve balances and invoices for settlement; dissolution is not a refund or forfeiture.
  const closure = {
    id: id("CLOSE"),
    workspaceId: w.id,
    name: w.name,
    actor: uid,
    endedAt,
    purchasedSeats: w.seats,
    assignedSeats: usedSeats(w),
    cycle: w.cycle,
    paidThrough: w.nextDate,
    subscriptionStatus: w.status,
    frozenCredits: creditBalance(w),
    refundStatus: "not_requested",
    invoices: clone(w.invoices),
    policy: "demo-freeze-v1",
  };
  log(w, "解散团队：停止续费与权益，剩余 Credits 冻结，未自动退款", uid);
  w.members
    .filter((m) => m.status === "active")
    .forEach((m) => departure(s, w, m.id, "dissolved"));
  w.members
    .filter((m) => m.status === "pending")
    .forEach((m) => {
      m.status = "removed";
      m.exitReason = "dissolved";
      m.leftAt = endedAt;
    });
  s.devices
    .filter((d) => d.spaceId === w.id)
    .forEach((d) => {
      d.spaceId = null;
    });
  (w.automaticTasks || []).forEach((t) => {
    t.enabled = false;
    t.pauseReason = "dissolved";
  });
  [...(w.seatOrders || []), ...(w.creditOrders || [])]
    .filter((o) => ["pending", "failed"].includes(o.status))
    .forEach((o) => {
      o.status = "cancelled";
      o.updated = endedAt;
      o.cancelReason = "dissolved";
    });
  (s.invitations || [])
    .filter(
      (i) =>
        (i.workspaceId === w.id || i.spaceId === w.id) &&
        i.status === "pending",
    )
    .forEach((i) => {
      i.status = "revoked";
    });
  w.status = "dissolved";
  w.renew = false;
  w.pendingSeats = null;
  w.pendingCycle = null;
  w.closedAt = endedAt;
  w.closure = closure;
  if (s.activeId === w.id) s.activeId = "personal";
  return closure;
}
function validateSeatCount(w, count, actor = SELF) {
  govern(w, actor);
  writable(w);
  count = Number(count);
  if (
    w.type !== "team" ||
    !Number.isInteger(count) ||
    count < Math.max(2, usedSeats(w)) ||
    count > 50
  )
    fail(`席位须为 ${Math.max(2, usedSeats(w))}–50，待接受邀请也占用席位`);
  return count;
}
const seatSnapshot = (w) =>
  JSON.stringify([
    w.id,
    w.seats,
    w.cycle,
    w.nextDate,
    w.pendingSeats ?? null,
    w.pendingCycle ?? null,
    w.renew,
    w.status,
  ]);
function seats(w, count, actor = SELF) {
  count = validateSeatCount(w, count, actor);
  if (count > w.seats) fail("增加席位需要先完成支付");
  w.pendingSeats = count < w.seats ? count : null;
  (w.seatOrders || [])
    .filter((o) => ["pending", "failed"].includes(o.status))
    .forEach((o) => {
      o.status = "cancelled";
      o.updated = stamp();
    });
  log(w, `调整下期席位至 ${count}`, actor);
}
function seatQuote(w, count, actor = SELF) {
  count = validateSeatCount(w, count, actor);
  if (count <= w.seats) fail("请选择大于当前已购数量的席位");
  const added = count - w.seats;
  return {
    workspaceId: w.id,
    currency: "CNY",
    fromSeats: w.seats,
    targetSeats: count,
    added,
    cycle: w.cycle,
    unitPrice: price(w.cycle),
    amount: added * price(w.cycle),
    nextDate: w.nextDate,
    nextCycle: w.pendingCycle || w.cycle,
    nextAmount: count * price(w.pendingCycle || w.cycle),
    snapshot: seatSnapshot(w),
  };
}
function createSeatOrder(w, count, actor = SELF) {
  const quote = seatQuote(w, count, actor);
  w.seatOrders ||= [];
  const existing = w.seatOrders.find(
    (o) =>
      ["pending", "failed"].includes(o.status) &&
      o.snapshot === quote.snapshot &&
      o.targetSeats === quote.targetSeats,
  );
  if (existing) return existing;
  // Replacing the quantity cancels an unpaid quote, never an already paid order.
  w.seatOrders
    .filter((o) => ["pending", "failed"].includes(o.status))
    .forEach((o) => {
      o.status = "cancelled";
      o.updated = stamp();
    });
  const order = {
    id: id("SEAT"),
    ...quote,
    requestedBy: actor,
    created: stamp(),
    status: "pending",
  };
  w.seatOrders.unshift(order);
  log(w, `创建加席订单 · ${quote.added} 席位`, actor);
  return order;
}
function getSeatOrder(w, orderId, actor = SELF) {
  govern(w, actor);
  return (
    (w.seatOrders || []).find(
      (o) => o.id === orderId && o.workspaceId === w.id,
    ) || fail("加席订单不存在或不属于此空间")
  );
}
function cancelSeatOrder(w, orderId, actor = SELF) {
  const order = getSeatOrder(w, orderId, actor);
  if (order.status === "paid")
    fail("已支付的订单不能取消，请通过管理席位安排下期调整");
  if (order.status !== "cancelled") {
    order.status = "cancelled";
    order.updated = stamp();
    log(w, "取消加席订单", actor);
  }
  return order;
}
function paySeatOrder(w, orderId, outcome, actor = SELF) {
  const order = getSeatOrder(w, orderId, actor);
  if (!["success", "failure"].includes(outcome))
    fail("请选择有效的模拟支付结果");
  if (order.status === "paid") return order;
  writable(w);
  if (!["pending", "failed"].includes(order.status))
    fail("订单已取消，请重新选择席位");
  if (order.snapshot !== seatSnapshot(w))
    fail("席位或订阅已变化，请返回重新确认费用");
  const quote = seatQuote(w, order.targetSeats, actor);
  if (order.amount !== quote.amount || order.unitPrice !== quote.unitPrice)
    fail("订单金额已变化，请重新确认费用");
  if (outcome === "failure") {
    order.status = "failed";
    order.updated = stamp();
    log(w, "加席模拟支付失败", actor);
    return order;
  }
  const invoice = {
    id: id("INV"),
    orderId: order.id,
    date: stamp(),
    amount: order.amount,
    label: `增加 ${order.added} 席位（演示整周期计费）`,
    status: "已支付",
  };
  w.seats = order.targetSeats;
  w.pendingSeats = null;
  w.invoices.unshift(invoice);
  order.status = "paid";
  order.paidAt = invoice.date;
  order.paidBy = actor;
  order.invoiceId = invoice.id;
  log(
    w,
    `加席支付成功 · ${order.fromSeats} → ${order.targetSeats} 席位`,
    actor,
  );
  return order;
}
// Demo catalogue and token rates are versioned separately from seat subscriptions.
const CREDIT_PACKS = Object.freeze(
  [
    { id: "credits-10k", credits: 10000, amount: 100 },
    { id: "credits-50k", credits: 50000, amount: 450 },
  ].map(Object.freeze),
);
const creditUnits = (value) => Math.round(Number(value) * 1000);
const creditBalance = (w) =>
  w.status === "dissolved"
    ? 0
    : (creditUnits(w.credits.total) - creditUnits(w.credits.used)) / 1000;
function creditQuote(w, packId, actor = SELF) {
  govern(w, actor);
  writable(w);
  if (w.type !== "team") fail("请选择团队空间");
  const pack =
    CREDIT_PACKS.find((p) => p.id === packId) || fail("Credits 套餐无效");
  return {
    workspaceId: w.id,
    packId: pack.id,
    credits: pack.credits,
    amount: pack.amount,
    currency: "CNY",
    priceVersion: "credits-pack-demo-v1",
  };
}
function createCreditOrder(w, packId, actor = SELF) {
  const quote = creditQuote(w, packId, actor);
  w.creditOrders ||= [];
  const existing = w.creditOrders.find(
    (o) =>
      ["pending", "failed"].includes(o.status) &&
      o.packId === packId &&
      o.priceVersion === quote.priceVersion,
  );
  if (existing) return existing;
  w.creditOrders
    .filter((o) => ["pending", "failed"].includes(o.status))
    .forEach((o) => {
      o.status = "cancelled";
      o.updated = stamp();
    });
  const order = {
    id: id("CREDITS"),
    ...quote,
    requestedBy: actor,
    created: stamp(),
    status: "pending",
  };
  w.creditOrders.unshift(order);
  log(w, "创建 Credits 购买订单", actor);
  return order;
}
function getCreditOrder(w, orderId, actor = SELF) {
  govern(w, actor);
  return (
    (w.creditOrders || []).find(
      (o) => o.id === orderId && o.workspaceId === w.id,
    ) || fail("Credits 订单不存在或不属于此空间")
  );
}
function cancelCreditOrder(w, orderId, actor = SELF) {
  const order = getCreditOrder(w, orderId, actor);
  if (order.status === "paid") fail("订单已支付，不能取消");
  if (order.status !== "cancelled") {
    order.status = "cancelled";
    order.updated = stamp();
    log(w, "取消 Credits 订单", actor);
  }
  return order;
}
function payCreditOrder(w, orderId, outcome, actor = SELF) {
  const order = getCreditOrder(w, orderId, actor);
  if (!["success", "failure"].includes(outcome)) fail("模拟支付结果无效");
  if (order.status === "paid") return order;
  if (!["pending", "failed"].includes(order.status))
    fail("订单已取消，请重新购买");
  const quote = creditQuote(w, order.packId, actor);
  if (
    ["amount", "credits", "currency", "priceVersion"].some(
      (k) => order[k] !== quote[k],
    )
  )
    fail("订单报价已变化，请重新确认");
  if (outcome === "failure") {
    order.status = "failed";
    order.updated = stamp();
    log(w, "Credits 模拟支付失败", actor);
    return order;
  }
  const invoice = {
    id: id("INV"),
    orderId: order.id,
    date: stamp(),
    amount: order.amount,
    label: `Credits 购买 · ${order.credits.toLocaleString()}`,
    status: "已支付",
  };
  w.credits.total =
    (creditUnits(w.credits.total) + creditUnits(order.credits)) / 1000;
  w.invoices.unshift(invoice);
  Object.assign(order, {
    status: "paid",
    paidAt: invoice.date,
    paidBy: actor,
    invoiceId: invoice.id,
  });
  log(w, `Credits 到账 · +${order.credits.toLocaleString()}`, actor);
  return order;
}
// Token counters are local estimates only. Production must use provider-returned usage.
function simulatedTokenUsage(input, output) {
  const count = (text) =>
    Math.max(1, Math.ceil(new TextEncoder().encode(String(text)).length / 4));
  return {
    inputTokens: count(input),
    outputTokens: count(output),
    source: "simulated",
    model: "Eureka Agent（模拟）",
    rateVersion: "token-demo-v1",
  };
}
function settleCredits(w, runId, prompt, usage, uid = SELF) {
  access(w, uid);
  writable(w);
  const prior = w.credits.logs.find((l) => l.runId === runId);
  if (prior) {
    if (prior.user !== uid) fail("无权读取其他成员的用量");
    return prior;
  }
  if (
    !runId ||
    !Number.isSafeInteger(usage.inputTokens) ||
    !Number.isSafeInteger(usage.outputTokens) ||
    usage.inputTokens < 0 ||
    usage.outputTokens < 0
  )
    fail("Token 用量无效");
  // 1 Credit / 1000 input tokens, 2 Credits / 1000 output tokens; demo rates only.
  const units = usage.inputTokens + 2 * usage.outputTokens;
  if (!Number.isSafeInteger(units) || units <= 0) fail("Token 用量无效");
  if (creditUnits(w.credits.total) - creditUnits(w.credits.used) < units)
    fail("Credits 不足，请联系管理员购买后重试");
  const record = {
    id: id("usage"),
    runId,
    user: uid,
    task: prompt.slice(0, 80),
    amount: units / 1000,
    time: stamp(),
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    source: "simulated",
    model: "Eureka Agent（模拟）",
    rateVersion: "token-demo-v1",
  };
  w.credits.used = (creditUnits(w.credits.used) + units) / 1000;
  w.credits.logs.unshift(record);
  return record;
}
function advanceCycle(w, actor = SELF) {
  govern(w, actor);
  if (!w.renew) {
    w.status = "expired";
    log(w, "账期结束，空间进入只读", actor);
    return;
  }
  if (w.pendingSeats != null) {
    if (w.pendingSeats < usedSeats(w))
      fail("当前成员数量超过计划席位，请先调整成员");
    w.seats = w.pendingSeats;
    w.pendingSeats = null;
  }
  if (w.pendingCycle) {
    w.cycle = w.pendingCycle;
    w.pendingCycle = null;
  }
  w.status = "active";
  const next = new Date(w.nextDate + "T12:00:00Z");
  if (w.cycle === "year") next.setUTCFullYear(next.getUTCFullYear() + 1);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  const paidOn = w.nextDate;
  w.nextDate = next.toISOString().slice(0, 10);
  w.invoices.unshift({
    id: id("INV"),
    date: paidOn,
    amount: w.seats * price(w.cycle),
    label: `模拟续费 · ${w.seats} 席位`,
    status: "已支付",
  });
  log(w, "模拟进入下一账期", actor);
}
function addFile(
  w,
  { title, summary, transcript, source = "网页录音", duration = 0 },
  uid = SELF,
) {
  access(w, uid);
  writable(w);
  title = String(title || "").trim();
  if (!title) fail("请输入文件名称");
  duration = Number(duration);
  if (!Number.isFinite(duration) || duration < 0 || duration > 1440)
    duration = 0;
  const f = file(id("file"), title.slice(0, 150), uid, [], duration);
  f.created = stamp();
  f.source = source;
  if (summary != null) f.summary = String(summary).slice(0, 100000);
  if (transcript != null) f.transcript = String(transcript).slice(0, 100000);
  f.size = (duration * 0.82).toFixed(1) + " MB";
  f.creator = member(w, uid)?.name || uid;
  f.tags = ["会议记录"];
  f.status = "已总结";
  f.updated = f.created;
  f.detail = {};
  w.files.unshift(f);
  log(w, `创建私有文件：${f.title}`, uid);
  return f;
}
function edit(w, fid, patch, uid = SELF) {
  writable(w);
  const f = getFile(w, fid, uid);
  if (f.owner !== uid) fail("仅文件所有者可以编辑");
  if (patch.title != null) {
    if (!String(patch.title).trim()) fail("文件名称不能为空");
    f.title = String(patch.title).trim().slice(0, 150);
  }
  ["summary", "transcript"].forEach((k) => {
    if (patch[k] != null) f[k] = String(patch[k]).slice(0, 100000);
  });
  log(w, `编辑文件：${f.title}`, uid);
  return f;
}
function share(w, fid, users, uid = SELF) {
  writable(w);
  const f = getFile(w, fid, uid);
  if (teamRecording(w, f)) fail("团队设备录音已向团队成员开放，无需分享");
  if (f.owner !== uid) fail("仅文件所有者可以管理分享");
  if (users.some((u) => !member(w, u) || u === uid))
    fail("只能邀请当前空间内的有效成员");
  f.shared = [...new Set(users)];
  log(w, `更新文件访问权限：${f.title}`, uid);
}
function trash(w, fid, restore = false, uid = SELF) {
  access(w, uid);
  writable(w);
  const f =
    w.files.find((f) => f.id === fid && f.owner === uid) ||
    fail("只有文件所有者可以操作");
  if (
    restore &&
    f.deletedAt &&
    Date.now() - new Date(f.deletedAt).getTime() >= 30 * 86400000
  )
    fail("录音已超过 30 天恢复期限");
  f.deleted = !restore;
  f.deletedAt = restore ? null : stamp();
  log(w, `${restore ? "恢复" : "移入回收站"}：${f.title}`, uid);
}
function exportFile(w, fid, uid = SELF) {
  return {
    format: "eureka-note-v1",
    title: getFile(w, fid, uid).title,
    summary: getFile(w, fid, uid).summary,
    transcript: getFile(w, fid, uid).transcript,
    duration: getFile(w, fid, uid).duration,
  };
}
function importFile(w, data, uid = SELF) {
  if (
    data?.demo === true &&
    typeof data.title === "string" &&
    typeof data.content === "string"
  )
    data = {
      format: "eureka-note-v1",
      title: data.title,
      summary: data.type === "summary" ? data.content : "",
      transcript: data.type === "summary" ? "" : data.content,
    };
  if (
    !data ||
    data.format !== "eureka-note-v1" ||
    typeof data.title !== "string" ||
    typeof data.summary !== "string" ||
    typeof data.transcript !== "string"
  )
    fail("请选择 EurekaMind 导出的 JSON 文件");
  return addFile(w, { ...data, source: "手动导入" }, uid);
}
function registerDevice(s, wid, { serial, model, user }, uid = SELF) {
  const w = get(s, wid);
  access(w, uid);
  writable(w);
  if (user !== uid && !admin(w, uid)) fail("仅管理员可以为其他成员录入设备");
  const owner = member(w, user) || fail("请选择当前空间内已加入的有效成员");
  // SN is an identifier: preserve long numeric values and leading zeroes as text.
  if (typeof serial !== "string") fail("请以文本填写 SN 码");
  serial = serial.trim().toUpperCase();
  model = String(model || "").trim();
  if (!/^[A-Z0-9-]{1,64}$/.test(serial))
    fail("SN 码须为 1–64 位字母、数字或短横线");
  if (!model || model.length > 40) fail("请填写 1–40 字的设备型号");
  if (s.devices.some((d) => String(d.serial).trim().toUpperCase() === serial))
    fail("该 SN 码已录入，请勿重复添加；已有设备请使用绑定入口");
  const d = {
    id: id("device"),
    name: `${owner.name}的 ${model}`,
    serial,
    model,
    spaceId: wid,
    user,
    createdAt: stamp(),
    registeredBy: uid,
    registrationMethod: "manual",
    lastSync: null,
  };
  s.devices.push(d);
  log(w, `录入设备 ${serial} · ${model}，绑定成员：${owner.name}`, uid);
  return d;
}
function bind(s, did, wid, uid = SELF) {
  const d = s.devices.find((d) => d.id === did) || fail("设备不存在");
  if (d.user !== uid) fail("只能绑定自己的设备");
  const w = get(s, wid);
  access(w, uid);
  writable(w);
  d.spaceId = wid;
  log(w, `模拟 App 重新绑定设备：${d.name}`, uid);
}
function sync(s, did, uid = SELF) {
  const d = s.devices.find((d) => d.id === did) || fail("设备不存在");
  if (d.user !== uid) fail("只能同步自己的设备");
  if (!d.spaceId) fail("设备尚未绑定工作空间");
  const w = get(s, d.spaceId);
  const f = addFile(
    w,
    { title: `${d.name} · 新录音`, source: d.model, duration: 12 },
    uid,
  );
  f.deviceId = d.id;
  f.origin = "device";
  f.recordedWorkspaceId = w.id;
  f.visibility = w.type === "team" ? "team" : "private";
  d.lastSync = stamp();
  if (w.type === "team") log(w, `团队设备录音自动进入会议：${f.title}`, uid);
  return { space: w, file: f };
}
// Cross-meeting signals are derived only from currently readable summaries.
// These rules model the experience; they are not a remote AI inference service.
function insights(w, uid = SELF) {
  const files = visible(w, uid).filter((f) => f.status === "已总结");
  const evidence = (pattern) =>
    files.flatMap((f) => {
      const quote = String(f.summary || "")
        .split(/(?<=[。！？])|\n/)
        .map((x) => x.trim())
        .find((x) => pattern.test(x));
      return quote
        ? [
            {
              fileId: f.id,
              title: f.title,
              owner: f.owner,
              created: f.created,
              quote,
            },
          ]
        : [];
    });
  const rules = [
    {
      id: "delivery-risk",
      topic: "星海试点",
      kind: "risk",
      label: "交付预警",
      title: "客户承诺与研发排期相差 5 天",
      description:
        "渠道已承诺 10 月 12 日交付，研发计划 10 月 17 日完成联调；试点验收可能受到影响。",
      impact: "涉及客户预期与试点验收，需要销售、研发共同核实。",
      next: "核实 10 月 12 日承诺的交付范围，确认是否依赖 10 月 17 日的联调结果，再统一对外口径。",
      patterns: [/星海.*10 月 12 日.*交付/, /星海.*10 月 17 日.*联调/],
    },
    {
      id: "ownership-gap",
      topic: "星海试点",
      kind: "gap",
      label: "协作断点",
      title: "验收标准已明确，异常处理仍未对齐",
      description:
        "客户把同步失败重试列为验收条件，交付评审仍未明确异常处理流程。",
      impact: "客户要求已进入团队视野，但交付闭环尚缺一环。",
      next: "对照客户验收条件与交付检查表，确认同步异常的处理流程、负责人和验收证据。",
      patterns: [/星海.*同步失败重试.*验收/, /尚待确认设备同步异常.*处理流程/],
    },
    {
      id: "customer-pattern",
      topic: "跨会议追溯",
      kind: "opportunity",
      label: "需求共识",
      title: "跨会议追溯，正在成为共同需求",
      description:
        "客户共创与用户访谈都指向同一价值：从结论找到原始讨论，并延续上下文。",
      impact: "跨成员收集的反馈汇成产品方向，可作为路线图优先级的依据。",
      next: "把两场会议的原始需求对照整理，区分客户明确要求与产品推断，形成待评审的优先级建议。",
      patterns: [
        /客户共创.*会议纪要可追溯/,
        /用户访谈.*跨会议检索与上下文延续/,
      ],
    },
  ];
  const items = rules.flatMap((r) => {
    const groups = r.patterns.map(evidence);
    if (groups.some((g) => !g.length)) return [];
    const sources = [
      ...new Map(groups.flat().map((e) => [e.fileId, e])).values(),
    ];
    if (sources.length < 2 || new Set(sources.map((e) => e.owner)).size < 2)
      return [];
    return [{ ...r, patterns: undefined, sources }];
  });
  // Related observations form one narrative topic, not one UI slot per category.
  const topics = new Map();
  for (const item of items) {
    const group = topics.get(item.topic) || [];
    group.push(item);
    topics.set(item.topic, group);
  }
  const findings = [...topics.values()].map((group) =>
    group.length === 1
      ? group[0]
      : {
          ...group[0],
          title: "星海试点的交付承诺与验收准备尚未对齐",
          description: group.map((i) => i.description).join(""),
          impact: group.map((i) => i.impact).join(""),
          next: group.map((i) => i.next).join(""),
          sources: [
            ...new Map(
              group.flatMap((i) => i.sources).map((e) => [e.fileId, e]),
            ).values(),
          ],
        },
  );
  return {
    items: findings,
    meetings: files.length,
    members: new Set(files.map((f) => f.owner)).size,
  };
}
function history(w, uid = SELF) {
  const ids = new Set(visible(w, uid).map((f) => f.id));
  return (w.threads || [])
    .filter(
      (t) =>
        !t.contactId &&
        t.user === uid &&
        (t.files || []).every((fid) => ids.has(fid)),
    )
    .slice()
    .sort(
      (a, b) =>
        new Date(String(b.time).replace(" ", "T")).getTime() -
        new Date(String(a.time).replace(" ", "T")).getTime(),
    );
}
function getThread(w, tid, uid = SELF) {
  return (
    history(w, uid).find((t) => t.id === tid) ||
    fail("会话已失效或无权访问，请选择其他会话")
  );
}
function conversation(w, tid, uid = SELF) {
  const list = [],
    seen = new Set();
  let current = getThread(w, tid, uid);
  while (current && !seen.has(current.id) && list.length < 20) {
    list.unshift(current);
    seen.add(current.id);
    current = current.parentThreadId
      ? history(w, uid).find((t) => t.id === current.parentThreadId)
      : null;
  }
  return list;
}
function deleteConversation(w, tid, uid = SELF) {
  access(w, uid);
  const owned = (w.threads || []).filter((t) => t.user === uid);
  let root = owned.find((t) => t.id === tid) || fail("只能删除本人的会话");
  const seen = new Set();
  while (root.parentThreadId && !seen.has(root.id)) {
    seen.add(root.id);
    const parent = owned.find((t) => t.id === root.parentThreadId);
    if (!parent) break;
    root = parent;
  }
  const ids = new Set([root.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of owned)
      if (ids.has(t.parentThreadId) && !ids.has(t.id)) {
        ids.add(t.id);
        changed = true;
      }
  }
  w.threads = w.threads.filter((t) => !ids.has(t.id));
  w.deletedThreadIds = [...new Set([...(w.deletedThreadIds || []), ...ids])];
  return [...ids];
}
function scheduledTasks(w, uid = SELF) {
  access(w, uid);
  return (w.automaticTasks || []).filter((t) => t.user === uid);
}
function getTask(w, tid, uid = SELF) {
  return (
    scheduledTasks(w, uid).find((t) => t.id === tid) ||
    fail("任务不存在或无权访问")
  );
}
function saveTask(w, input, uid = SELF) {
  access(w, uid);
  writable(w);
  const title = String(input.title || "").trim(),
    prompt = String(input.prompt || "").trim();
  if (!title || title.length > 80 || !prompt || prompt.length > 2000)
    fail("请填写任务名称（最多80字）与任务要求（最多2000字）");
  if (
    !["daily", "weekly"].includes(input.frequency) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time || "")
  )
    fail("请选择有效的重复频率和时间");
  const task = input.id
    ? getTask(w, input.id, uid)
    : { id: id("auto"), user: uid, enabled: true, runs: [] };
  Object.assign(task, {
    title,
    prompt,
    frequency: input.frequency,
    time: input.time,
    updated: stamp(),
  });
  if (!input.id) (w.automaticTasks ||= []).unshift(task);
  return task;
}
function runTask(w, tid, uid = SELF) {
  const task = getTask(w, tid, uid);
  writable(w);
  if (!task.enabled) fail("请先启用任务");
  const result = ask(w, task.prompt, null, uid);
  if (result.threadId) {
    const thread = getThread(w, result.threadId, uid);
    thread.taskId = task.id;
    thread.title = task.title;
    task.lastRun = stamp();
    (task.runs ||= []).unshift({ time: task.lastRun, threadId: thread.id });
  }
  return result;
}
function ask(w, prompt, fid, uid = SELF, historyId = null, options = {}) {
  access(w, uid);
  writable(w);
  prompt = String(prompt).trim();
  if (!prompt) fail("请输入问题");
  const previous = historyId ? getThread(w, historyId, uid) : null;
  const explicit = Array.isArray(options.fileIds) && options.fileIds.length > 0;
  const insight =
    !explicit &&
    !previous &&
    !fid &&
    insights(w, uid).items.find((i) => prompt.includes(i.title));
  if (
    !explicit &&
    !previous &&
    !fid &&
    !insight &&
    /星海试点的交付承诺与验收准备尚未对齐|客户承诺与研发排期相差 5 天|验收标准已明确，异常处理仍未对齐|跨会议追溯，正在成为共同需求/.test(
      prompt,
    )
  )
    return {
      answer:
        "该团队线索的来源或内容已变化，当前依据不足，请返回首页查看最新线索。本次未扣 Credits。",
      cost: 0,
    };
  let files = explicit
    ? options.fileIds.map((id) => getFile(w, id, uid))
    : previous
      ? (previous.files || []).map((fid) => getFile(w, fid, uid))
      : insight
        ? insight.sources.map((e) => getFile(w, e.fileId, uid))
        : fid
          ? [getFile(w, fid, uid)]
          : visible(w, uid);
  if (!explicit && !previous && !fid && !insight && /客户|反馈/.test(prompt))
    files = files.filter((f) => /客户|访谈|试点|验收/.test(f.title));
  if (!explicit && !previous && !insight)
    files = files
      .slice()
      .sort((a, b) => String(b.created).localeCompare(String(a.created)))
      .slice(0, 3);
  if (!files.length)
    return {
      answer: "当前没有可引用的相关会议。请先录音、上传音频，或调整问题。",
      cost: 0,
    };
  const excerpts = files
    .map(
      (f, i) =>
        `${i + 1}. 「${f.title}」\n${(
          String(f.summary || "")
            .split("\n")
            .filter(Boolean)[0] || "暂无可用摘要，请先完成录音处理。"
        ).slice(0, 300)}`,
    )
    .join("\n\n");
  const label = /对比|决策/.test(prompt)
    ? "会议决策对照"
    : /客户|反馈/.test(prompt)
      ? "客户反馈摘要"
      : /简报|总结/.test(prompt)
        ? "团队会议简报"
        : "会议上下文与下一步";
  const next = /对比|决策/.test(prompt)
    ? "以上按来源并列展示会议结论；未在纪要中明确的差异与负责人，需要回到原录音确认。"
    : /客户|反馈/.test(prompt)
      ? "建议在下次沟通前，逐项确认客户提出的问题、对应方案和验收口径。"
      : "建议围绕上述结论，确认负责人、交付范围与仍待澄清的问题。";
  let answer = previous
    ? `接续「${previous.title || previous.prompt}」\n\n关于「${prompt}」，基于${explicit ? "本次所选" : "原会话的"} ${files.length} 场会议：\n\n${excerpts}\n\n${next}\n\n本地模拟 · 未通知成员或创建任务。`
    : insight
      ? `${insight.label}\n${insight.title}\n\n${insight.description}\n\n会议依据\n${insight.sources.map((e) => `「${e.title}」 · ${w.members.find((m) => m.id === e.owner)?.name || e.owner}\n${e.quote}`).join("\n\n")}\n\n建议核实\n${insight.next}\n\n以上为跨会议线索，不代表已确认风险或已通知成员。仅引用当前授权资料；本地模拟。`
      : `${label}\n\n${excerpts}\n\n${next}\n\n引用 ${files.length} 份已授权资料；此结果为本地模拟。`;
  if (options.mode === "deep")
    answer +=
      "\n\n深度思考（模拟）\n建议分三步核对：逐一回看原始依据；对照不同会议的时间和口径；列出仍需确认的信息。未被来源支持的推断不能视为事实。";
  if (options.appData)
    answer +=
      "\n\n已引用会议应用数据：" +
      files.map((f) => f.title + " · " + (f.status || "已总结")).join("；");
  if (options.web)
    answer +=
      "\n\n联网搜索已开启（模拟）：当前未连接外部搜索服务，本次回答未使用网络来源。";
  const runId = id("run"),
    usage = simulatedTokenUsage(
      prompt +
        "\n" +
        files.map((f) => f.summary || f.transcript || "").join("\n") +
        (previous
          ? "\n" +
            conversation(w, previous.id, uid)
              .map((t) => t.prompt + "\n" + t.answer)
              .join("\n")
          : ""),
      answer,
    );
  const charge = settleCredits(w, runId, prompt, usage, uid);
  const thread = {
    id: id("chat"),
    runId,
    usage: { ...usage, cost: charge.amount },
    user: uid,
    prompt,
    answer,
    time: stamp(),
    files: files.map((f) => f.id),
    visibility: "private",
    mode: options.mode || "quick",
    web: !!options.web,
    appData: !!options.appData,
    ...(previous ? { parentThreadId: previous.id } : {}),
  };
  w.threads.unshift(thread);
  return { answer, cost: charge.amount, threadId: thread.id, usage };
}
function acceptInvite(s, iid) {
  const i =
    s.invitations.find((i) => i.id === iid && i.status === "pending") ||
    fail("邀请已失效或已处理");
  const w = baseTeam(
    id("team"),
    i.teamName,
    [
      person("wang", "王晨", "wang.chen@eureka.example", "admin"),
      person(SELF, s.account.name, s.account.email),
    ],
    3,
  );
  w.files = [file(id("file"), "欢迎加入 · 研究项目说明", "wang", [SELF])];
  s.spaces.push(w);
  i.status = "accepted";
  s.activeId = w.id;
  return w;
}
// Versioned, additive migration: never replace user recordings or edited contacts.
function enrich(s) {
  for (const w of s.spaces.filter(
    (w) => w.type === "team" && w.status !== "dissolved",
  )) {
    if (!w.recordingWorkbenchVersion) {
      if (w.id === "team-eureka") {
        const demos = [
          ["delivery", "交付验收标准评审", "lin", 38, "合并录音", "交付评审"],
          ["pilot", "星海试点复盘", SELF, 42, "W2", "客户复盘"],
          ["research", "语音记录用户访谈", "kevin", 27, "M1", "用户研究"],
          ["planning", "研发迭代排期确认", SELF, 35, "网页录音", "研发排期"],
          ["sales", "渠道合作沟通", "lin", 51, "W1", "商务沟通"],
          ["design", "录音详情交互评审", SELF, 29, "W-PEN", "设计评审"],
          ["launch", "产品发布准备会", "kevin", 44, "合并录音", "产品发布"],
          ["retro", "团队协作复盘", SELF, 32, "网页录音", "团队复盘"],
        ];
        demos.forEach(([key, title, owner, duration, source, tag], i) => {
          const fid = "team-demo-" + key;
          if (!w.files.some((f) => f.id === fid))
            w.files.push({
              ...file(
                fid,
                title,
                owner,
                owner === SELF ? [] : [SELF],
                duration,
              ),
              source,
              tags: [tag],
              created: `2026-10-${String(6 - Math.floor(i / 2)).padStart(2, "0")} ${i % 2 ? "16:00" : "09:30"}`,
            });
        });
        const people = [
          [
            "c-team-3",
            "周宁",
            "云帆制造",
            "数字化负责人",
            "确认设备接入与试点扩容计划。",
          ],
          [
            "c-team-4",
            "王珊",
            "启明渠道",
            "合作伙伴经理",
            "下周一起复核渠道演示材料。",
          ],
        ];
        for (const [id, name, company, role, summary] of people)
          if (!w.contacts.some((c) => c.id === id))
            w.contacts.push({ id, name, company, role, summary });
      }
      w.recordingWorkbenchVersion = 1;
    }
    w.contactNotes ||= {};
    w.contactTasks ||= [];
    w.contacts.forEach((c, i) => {
      const defaults = {
        initials: c.name.slice(0, 2),
        region: "中国",
        email: "",
        tag: i % 2 ? "待回复" : "需关注",
        count: 6 + i,
        recent: "2 天前",
        themes: ["产品试点", "交付方案"],
        commitments: [[c.summary, "2026/10/09", "待跟进"]],
        myCommitments: [["准备下一轮演示资料", "2026/10/08", "进行中"]],
        timeline: [["方案沟通", "2026/10/06 · 团队会议", c.summary]],
        memories: [c.summary],
        inferences: [],
      };
      for (const [k, v] of Object.entries(defaults)) if (c[k] == null) c[k] = v;
    });
    const summaries = {
      "team-review":
        "十月路线图以录音归档、会议检索和团队协作为主线。评审确认先完善共享权限与会议详情，再验证团队使用链路；由产品和研发共同确认交付范围。",
      "team-customer":
        "客户共创中明确了三个验收重点：会议纪要可追溯、负责人可识别、分享范围可控。客户成功团队将在下一轮试点前提供验收清单。",
      "team-market":
        "海外渠道访谈集中反馈多语言转写、设备同步与会议导出的需求。市场侧将先验证两个试点场景，再决定是否扩大投放。",
      "team-demo-pilot":
        "星海试点已完成首轮会议记录验证。客户最关注交付范围与验收口径，建议在扩大试点前补齐共享权限说明和验收清单。",
      "team-demo-delivery":
        "验收评审统一了会议检索、录音导出和成员共享的检查口径。尚待确认设备同步异常的处理流程，交付团队将补充失败重试案例。",
      "team-demo-research":
        "用户访谈发现，跨会议检索与上下文延续比文件夹分类更重要。受访者希望保留录音原文入口，并在会议页面直接继续提问。",
      "team-demo-planning":
        "研发确认先完成团队录音索引与权限校验，再接入异步转写。测试将重点覆盖切换空间、撤回分享与网络异常后的恢复。",
      "team-demo-sales":
        "渠道合作方希望通过真实客户会议演示产品价值。双方约定先统一演示脚本与试点范围，报价将在交付范围确认后讨论。",
      "team-demo-design":
        "交互评审确认会议正文采用原位编辑，导出、分享、删除直接展示。Agent 在当前页面展开，桌面小屏必须保留可见输入区。",
      "team-demo-launch":
        "发布准备会确认演示材料需包含录音、纪要与团队共享完整链路。设备素材与成员邀请说明仍待复核。",
      "team-demo-retro":
        "团队复盘认为信息重复录入是主要协作成本。后续以会议上下文复用为重点，减少孤立模块和无来源的自动建议。",
    };
    for (const f of w.files)
      if (
        summaries[f.id] &&
        f.summary ===
          `本次会议围绕「${f.title}」展开，明确本阶段目标、交付范围与协作分工。\n\n下一步：补齐客户反馈，确认方案负责人，并在下次例会跟进交付进度。`
      )
        f.summary = summaries[f.id];
    if (w.id === "team-eureka" && !w.teamInsightsVersion) {
      const additions = {
        "team-demo-pilot":
          "星海试点复盘再次确认，同步失败重试属于客户验收条件。",
        "team-demo-sales":
          "星海渠道合作中承诺 10 月 12 日交付设备同步与失败重试能力，客户将据此安排试点验收。",
        "team-demo-planning":
          "星海试点所需的设备同步与失败重试能力预计 10 月 17 日完成联调，之后才能进入验收。",
        "team-customer": "星海客户明确要求把同步失败重试纳入试点验收条件。",
      };
      for (const [fid, extra] of Object.entries(additions)) {
        const f = w.files.find((f) => f.id === fid);
        // Preserve every user-authored edit; enrich only unchanged demo text.
        if (f && f.summary === summaries[fid]) f.summary += "\n\n" + extra;
      }
      w.teamInsightsVersion = 1;
    }
    if (w.id === "team-eureka" && !w.teamDeviceVisibilityVersion) {
      // Only known device demo recordings are migrated; never infer ownership from arbitrary text.
      for (const fid of [
        "team-demo-pilot",
        "team-demo-research",
        "team-demo-sales",
        "team-demo-design",
      ]) {
        const f = w.files.find((f) => f.id === fid);
        if (f) {
          f.origin = "device";
          f.recordedWorkspaceId = w.id;
          f.visibility = "team";
        }
      }
      w.teamDeviceVisibilityVersion = 1;
    }
    if (w.id === "team-eureka" && !w.memberHistoryVersion) {
      const demos = [
        [
          "delivery",
          "lin",
          "星海试点交付对齐",
          "梳理星海试点里客户承诺与验收准备的关键问题。",
          ["team-demo-sales", "team-demo-pilot"],
          "2026-10-07 09:40",
          "渠道沟通承诺 10 月 12 日交付；试点复盘强调同步失败重试属于验收条件。下一步应由渠道与交付共同确认演示范围、重试案例和验收清单。",
        ],
        [
          "research",
          "kevin",
          "用户访谈中的高频需求",
          "把用户访谈和交互评审串起来，找出值得优先解决的问题。",
          ["team-demo-research", "team-demo-design"],
          "2026-10-07 09:05",
          "两场讨论都强调上下文连续性：用户希望从结论回到录音原文，并继续追问；交互评审确认 Agent 在当前页面展开，小屏也应保留输入区。建议优先验证会议内追问与原位编辑链路。",
        ],
        [
          "review",
          SELF,
          "会议工作台体验复盘",
          "汇总试点复盘和交互评审，整理下一轮体验验证重点。",
          ["team-demo-pilot", "team-demo-design"],
          "2026-10-06 17:20",
          "试点关注交付与验收口径，交互评审关注正文编辑与页面内 Agent。下一轮验证可以覆盖：会议正文原位编辑、设备同步异常重试、小屏连续提问。上述建议尚未创建任务。",
        ],
        [
          "partner",
          "lin",
          "渠道演示沟通准备",
          "根据渠道合作沟通，整理下一次演示前需要确认的内容。",
          ["team-demo-sales"],
          "2026-10-06 16:10",
          "先统一真实客户会议的演示脚本与试点范围，再确认设备同步、失败重试能力的交付承诺。报价应在交付范围确认后讨论。",
        ],
      ];
      for (const [key, user, title, prompt, files, time, answer] of demos) {
        const tid = "team-history-" + key;
        // Shared sample conversations only cite known team-visible device recordings.
        if (
          !(w.deletedThreadIds || []).includes(tid) &&
          !w.threads.some((t) => t.id === tid) &&
          files.every((fid) =>
            w.files.some(
              (f) => f.id === fid && !f.deleted && teamRecording(w, f),
            ),
          )
        )
          w.threads.push({
            id: tid,
            user,
            title,
            prompt,
            answer:
              answer + "\n\n本地模拟 · 基于团队会议记录，未连接 AI 服务。",
            files,
            time,
            visibility: "team",
            demo: true,
          });
      }
      w.memberHistoryVersion = 1;
    }
    if (!w.ownTaskVersion) {
      w.automaticTasks ||= [];
      if (w.id === "team-eureka")
        for (const [key, title, prompt, frequency, time] of [
          [
            "weekly",
            "研发周报自动整理",
            "汇总本周团队会议的研发进展、风险和下周计划。",
            "weekly",
            "09:00",
          ],
          [
            "daily",
            "会议决策每日回顾",
            "整理团队会议中的关键决策和需要对齐的问题。",
            "daily",
            "18:00",
          ],
        ])
          w.automaticTasks.push({
            id: "team-auto-" + key,
            user: SELF,
            title,
            prompt,
            frequency,
            time,
            enabled: true,
            runs: [],
            demo: true,
          });
      w.ownTaskVersion = 1;
    }
    w.files.forEach((f) => {
      const defaults = {
        size: (f.duration * 0.82).toFixed(1) + " MB",
        creator: w.members.find((m) => m.id === f.owner)?.name || "已移除成员",
        status: "已总结",
        tags: ["会议记录"],
        updated: f.created,
        detail: {},
      };
      for (const [k, v] of Object.entries(defaults)) if (f[k] == null) f[k] = v;
    });
  }
  return s;
}
function saveDetail(w, fid, patch, uid = SELF) {
  const f = edit(w, fid, patch, uid);
  const allowed = [
    "template",
    "language",
    "detail",
    "speakers",
    "tags",
    "customer",
    "project",
    "location",
    "updated",
    "generated",
    "feedback",
    "verbatim",
    "summaryHtml",
    "verbatimHtml",
    "customerType",
    "projectType",
  ];
  f.detail ||= {};
  for (const k of allowed) if (patch[k] != null) f.detail[k] = clone(patch[k]);
  if (patch.tags) f.tags = clone(patch.tags);
  f.updated = stamp();
  return f;
}
function purge(w, fid, uid = SELF) {
  access(w, uid);
  writable(w);
  const f =
    w.files.find((f) => f.id === fid && f.owner === uid && f.deleted) ||
    fail("只能永久删除自己的回收站录音");
  w.files = w.files.filter((x) => x !== f);
  log(w, "永久删除回收站录音", uid);
}
function saveContacts(w, data, uid = SELF) {
  access(w, uid);
  writable(w);
  w.contacts = clone(data.contacts);
  w.contactNotes = clone(data.notes);
  w.contactTasks = clone(data.tasks);
  log(w, "更新联系人关系与跟进", uid);
}
function askContact(w, prompt, cid, uid = SELF) {
  access(w, uid);
  writable(w);
  const c = w.contacts.find((c) => c.id === cid) || fail("请先选择联系人");
  const answer = `基于${c.name}的团队联系人记录：\n\n${c.summary}\n\n开放承诺：${(c.commitments || []).map((x) => x[0]).join("；") || "暂无"}。\n下一步：确认负责人和截止时间，在沟通后更新备注与跟进任务。\n\n仅引用当前联系人；本地模拟，未连接 AI 服务。`;
  const runId = id("run"),
    usage = simulatedTokenUsage(prompt + "\n" + c.summary, answer),
    charge = settleCredits(w, runId, prompt, usage, uid);
  w.threads.unshift({
    id: id("chat"),
    runId,
    usage: { ...usage, cost: charge.amount },
    user: uid,
    prompt,
    answer,
    time: stamp(),
    contactId: cid,
    files: [],
  });
  return answer;
}
function load(storage) {
  try {
    const s = JSON.parse(storage.getItem(KEY));
    if (
      s?.version === 2 &&
      Array.isArray(s.spaces) &&
      s.spaces.some((w) => w.id === "personal")
    )
      return enrich(s);
  } catch {
    /* recover demo state */
  }
  return enrich(seed());
}

const workspaceModel = {
  KEY,
  SELF,
  id,
  clone,
  seed: () => enrich(seed()),
  enrich,
  insights,
  history,
  getThread,
  conversation,
  deleteConversation,
  scheduledTasks,
  getTask,
  saveTask,
  runTask,
  saveDetail,
  saveContacts,
  askContact,
  purge,
  get,
  member,
  admin,
  seatEntitlement,
  usedSeats,
  writable,
  govern,
  teamRecording,
  visible,
  getFile,
  price,
  create,
  invite,
  memberAction,
  leave,
  dissolve,
  seats,
  seatQuote,
  createSeatOrder,
  getSeatOrder,
  cancelSeatOrder,
  paySeatOrder,
  CREDIT_PACKS,
  creditBalance,
  creditQuote,
  createCreditOrder,
  getCreditOrder,
  cancelCreditOrder,
  payCreditOrder,
  simulatedTokenUsage,
  settleCredits,
  advanceCycle,
  addFile,
  edit,
  share,
  trash,
  exportFile,
  importFile,
  registerDevice,
  bind,
  sync,
  ask,
  acceptInvite,
  load,
  log,
};

export default workspaceModel;
