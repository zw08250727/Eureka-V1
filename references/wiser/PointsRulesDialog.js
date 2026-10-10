P5e = ie({
  name: "PointsRulesDialog",
  __name: "index",
  emits: ["viewPoints"],
  setup(e, {
    expose: t,
    emit: n
  }) {
    const r = H(!1),
      {
        ensureTaskDefinitions: a,
        getTaskMonthlyCredits: s,
        getTaskRewardCredits: c
      } = QL(),
      l = () => {
        r.value = !0, a();
      },
      u = () => {
        r.value = !1;
      },
      i = F(() => cl(c(sl.REGISTER), {
        prefix: !0
      })),
      d = F(() => cl(c(sl.FEEDBACK), {
        prefix: !0,
        unit: "积分/次"
      }));
    F(() => cl(s(sl.FEEDBACK)));
    const p = F(() => cl(c(sl.DAILY_LOGIN), {
      prefix: !0,
      unit: "积分/次"
    }));
    F(() => cl(s(sl.DAILY_LOGIN)));
    const g = E => cl(c(E), {
        prefix: !0,
        unit: "/月"
      }),
      f = F(() => [{
        method: "直接充值积分",
        points: "+5000/10000/15000",
        note: "平台当前提供三档积分包，可按需充值"
      }, {
        method: "购买标准版会员",
        points: g(sl.BUY_STANDARD),
        note: "积分随会员权益周期定期重置发放"
      }, {
        method: "购买专业版会员",
        points: g(sl.BUY_PRO),
        note: "积分随会员权益周期定期重置发放"
      }, {
        method: "购买卓越版会员",
        points: g(sl.BUY_ELITE),
        note: "积分随会员权益周期定期重置发放"
      }, {
        method: "新用户注册",
        points: i.value,
        note: "新用户注册成功后发放"
      }, {
        method: "首次完善个人信息",
        points: "+500",
        note: "首次完成个人信息填写后发放"
      }, {
        method: "下载 App 并首次登录",
        points: "+200",
        note: "首次下载百智 WiseNote App 并登录后发放"
      }, {
        method: "完成用户反馈",
        points: d.value,
        note: "在APP端或PC端完成用户反馈，包括对AI执行任务完成情况及录音智能总结情况打分或提交用户反馈，每自然月限10次"
      }, {
        method: "每日签到",
        points: p.value,
        note: "在 App 端或 PC 端完成每日签到，每自然月限 15 次"
      }]),
      _ = ["对话类任务", "小任务处理", "深度任务处理", "AI PPT生成", "AI Editor 内容生成"],
      h = ["充值积分：通过充值积分包获得的积分", "会员积分：通过会员权益发放获得的积分", "任务积分：通过完成平台任务获得的积分", "赠送积分：通过平台活动、运营福利等特别赠送的积分"],
      v = ["通过充值、完成任务或平台赠送获得的积分，自到账之日起365个自然日内有效。", "会员月赠积分按会员权益周期管理，到期及重置规则与其他会员权益项保持一致。", "积分到期未使用的，将自动失效，无法恢复、补发、转移或折现"],
      y = ["积分仅限当前账号使用，不支持转赠、转让、提现或兑换现金。", "因退款、订单撤销、异常发放、作弊或其他不符合规则的情形，平台有权回收已发放的积分。", "如发现用户存在恶意刷取、虚假领取、违规套利等行为，平台有权取消其积分资格，并追回相关积分及权益。", "平台有权根据运营情况对积分获取方式、使用范围、有效期、兑换规则等进行调整，具体以页面实际展示和最新规则说明为准。"];
    return t({
      openDialog: l
    }), (E, C) => (D(), V(Ge, null, [N("div", {
      class: "inline-block",
      onClick: He(l, ["stop"])
    }, [Ae(E.$slots, "default")]), W(b(Ei), {
      "append-to-body": "",
      modelValue: r.value,
      "onUpdate:modelValue": C[0] || (C[0] = S => r.value = S),
      width: "640px",
      class: "points-rules-dialog !rounded-2xl !pt-0 !px-0 !pb-0 z-10",
      "show-close": !1,
      "close-on-click-modal": !1,
      "header-class": "!py-0 !px-0 h-0"
    }, {
      header: se(() => [...(C[1] || (C[1] = []))]),
      default: se(() => [N("div", {
        class: "absolute top-6 right-6 z-10 w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#F2F3F5] cursor-pointer",
        onClick: u
      }, [W(Aa, {
        class: "w-4 h-4 !text-[#262626]"
      })]), N("div", h5e, [C[20] || (C[20] = N("div", {
        class: "h-[64px] leading-[64px] text-[16px] font-medium text-[#000] sticky top-0 bg-white"
      }, " 积分规则 ", -1)), N("div", v5e, [C[3] || (C[3] = N("div", {
        class: "text-[14px] leading-[24px] text-[#262626] my-2"
      }, " 积分可通过购买、会员权益赠送、完成站内任务等方式获得，可用于平台内指定AI功能消耗或兑换相关权益。 ", -1)), C[4] || (C[4] = N("div", {
        class: "text-[14px] leading-[24px] font-medium text-[#262626] my-2"
      }, " 一、积分怎么获得 ", -1)), C[5] || (C[5] = N("div", {
        class: "text-[14px] leading-[24px] text-[#262626] my-2"
      }, " 1.可通过以下方式获得积分： ", -1)), N("div", b5e, [C[2] || (C[2] = N("div", {
        class: "flex bg-[#F7F7F7] text-[13px] text-[#262626] border-b border-black/[0.05]"
      }, [N("div", {
        class: "flex-1 px-3 py-2 leading-[24px]"
      }, "获取方式"), N("div", {
        class: "w-[141px] px-3 py-2 leading-[24px]"
      }, "积分"), N("div", {
        class: "w-[280px] px-3 py-2 leading-[24px]"
      }, "说明")], -1)), (D(!0), V(Ge, null, Et(f.value, (S, w) => (D(), V("div", {
        key: w,
        class: "flex border-b border-black/[0.05] last:border-0 text-[13px] text-[#262626]"
      }, [N("div", y5e, me(S.method), 1), N("div", E5e, me(S.points), 1), N("div", S5e, me(S.note), 1)]))), 128))])]), N("div", C5e, [C[7] || (C[7] = N("div", {
        class: "text-[14px] leading-[24px] text-[#262626] mb-2"
      }, " 2.积分类型说明： ", -1)), N("ul", w5e, [(D(), V(Ge, null, Et(h, (S, w) => N("li", {
        key: w,
        class: "flex items-center gap-2 text-[13px] text-[#565656] mb-0 font-normal"
      }, [C[6] || (C[6] = N("span", {
        class: "w-[4px] h-[4px] rounded-full bg-[#595959] flex-shrink-0"
      }, null, -1)), N("span", T5e, me(S), 1)])), 64))])]), N("div", x5e, [C[9] || (C[9] = N("div", {
        class: "text-[14px] leading-[24px] font-medium text-[#262626] mb-2"
      }, " 二、积分怎么使用 ", -1)), C[10] || (C[10] = N("div", {
        class: "text-[14px] leading-[24px] text-[#262626] mb-2"
      }, " 积分可用于平台内指定功能消耗或兑换权益，具体以页面展示为准。 ", -1)), C[11] || (C[11] = N("div", {
        class: "text-[14px] leading-[24px] font-medium text-[#262626] mb-2"
      }, " 1. PC端功能消耗 ", -1)), C[12] || (C[12] = N("div", {
        class: "text-[14px] leading-[24px] text-[#262626] mb-2"
      }, " 在 PC 端使用部分AI能力时，系统将按对应规则扣减积分，包括但不限于： ", -1)), N("ul", O5e, [(D(), V(Ge, null, Et(_, (S, w) => N("li", {
        key: w,
        class: "flex items-center gap-2 text-[13px] text-[#565656] mb-0 font-normal"
      }, [C[8] || (C[8] = N("span", {
        class: "w-[4px] h-[4px] rounded-full bg-[#595959] flex-shrink-0"
      }, null, -1)), N("span", R5e, me(S), 1)])), 64))]), C[13] || (C[13] = N("div", {
        class: "text-[14px] leading-[24px] text-[#262626] mb-2"
      }, " 不同功能对应的积分消耗标准不同，实际以用户发起任务时的平台说明或最终扣减结果为准。 ", -1)), C[14] || (C[14] = N("div", {
        class: "text-[14px] leading-[24px] font-medium text-[#262626] mb-2"
      }, " 2. App端兑换使用 ", -1)), C[15] || (C[15] = N("div", {
        class: "text-[14px] leading-[24px] text-[#262626] mb-2"
      }, " 积分可用于在 App 端兑换录音转写时长，具体可兑换内容以 App 端实际功能展示为准。 ", -1))]), N("div", A5e, [C[17] || (C[17] = N("div", {
        class: "text-[14px] leading-[24px] font-medium text-[#262626] mb-2"
      }, " 三、积分有效期说明 ", -1)), N("ul", I5e, [(D(), V(Ge, null, Et(v, (S, w) => N("li", {
        key: w,
        class: "flex items-center gap-2 text-[13px] text-[#565656] mb-0 font-normal"
      }, [C[16] || (C[16] = N("span", {
        class: "w-[4px] h-[4px] rounded-full bg-[#595959] flex-shrink-0"
      }, null, -1)), N("span", N5e, me(S), 1)])), 64))])]), N("div", k5e, [C[19] || (C[19] = N("div", {
        class: "text-[14px] leading-[24px] font-medium text-[#262626] mb-2"
      }, " 四、特别说明 ", -1)), N("ul", D5e, [(D(), V(Ge, null, Et(y, (S, w) => N("li", {
        key: w,
        class: "flex items-center gap-2 text-[13px] text-[#565656] mb-0 font-normal"
      }, [C[18] || (C[18] = N("span", {
        class: "w-[4px] h-[4px] rounded-full bg-[#595959] flex-shrink-0"
      }, null, -1)), N("span", M5e, me(S), 1)])), 64))])])])]),
      _: 1
    }, 8, ["modelValue"])], 64));
  }
})