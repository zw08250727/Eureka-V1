SF = ie({
  name: "PointsTaskDialog",
  __name: "index",
  props: {
    class: {
      default: ""
    },
    trackOnOpen: {
      type: Boolean,
      default: !0
    }
  },
  setup(e, {
    expose: t
  }) {
    const n = ["TASK_REGISTER", "TASK_PROFILE", "TASK_DOWNLOAD_APP"],
      r = ["TASK_FEEDBACK", "TASK_DAILY_LOGIN"],
      a = ["TASK_BUY_STANDARD", "TASK_BUY_PRO", "TASK_BUY_ELITE"],
      s = {
        TASK_BUY_STANDARD: 1,
        TASK_BUY_PRO: 2,
        TASK_BUY_ELITE: 3
      };
    function c(oe) {
      return oe === "STD" ? 1 : oe === "PRO" ? 2 : oe === "PE" ? 3 : 0;
    }
    function l() {
      var le, we;
      const oe = (we = (le = S.userInfo) == null ? void 0 : le.user) == null ? void 0 : we.membershipType;
      return c(oe);
    }
    function u(oe) {
      var Ce;
      const le = (Ce = s[oe.id]) != null ? Ce : 0,
        we = l();
      return we === le ? "equal" : we > le ? "user_above_task" : "user_below_task";
    }
    function i(oe) {
      var Ce;
      return ((Ce = s[oe.id]) != null ? Ce : 0) === 0 ? {
        label: oe.actionText,
        disabled: oe.status === "done" || !!oe.actionDisabled
      } : u(oe) === "equal" ? {
        label: "已完成",
        disabled: !0
      } : {
        label: "去完成",
        disabled: !1
      };
    }
    function d(oe) {
      const le = "shrink-0 whitespace-nowrap min-w-[72px] h-8 !px-[15px] rounded-[16px] !text-[14px] leading-8 border-none";
      return i(oe).disabled ? `${le} bg-transparent text-[#BFBFBF] cursor-default` : `${le} bg-[#165DFF] !text-white hover:bg-[#165DFF]/90 transition-colors`;
    }
    const p = {
      TASK_REGISTER: {
        trackId: "Home_Task_Popup_Newbie_Register",
        elementText: "首页-做任务积分弹窗-新手成长tab-新用户注册去完成按钮"
      },
      TASK_PROFILE: {
        trackId: "Home_Task_Popup_Newbie_Profile",
        elementText: "首页-做任务积分弹窗-新手成长tab-完善个人信息去完成按钮"
      },
      TASK_DOWNLOAD_APP: {
        trackId: "Home_Task_Popup_Newbie_Download",
        elementText: "首页-做任务积分弹窗-新手成长tab-下载APP去完成按钮"
      },
      TASK_FEEDBACK: {
        trackId: "Home_Task_Popup_Activity_Feedback",
        elementText: "首页-做任务积分弹窗-活跃互动tab-用户反馈-去完成按钮"
      },
      TASK_DAILY_LOGIN: {
        trackId: "Home_Task_Popup_Activity_Sign",
        elementText: "首页-做任务积分弹窗-活跃互动tab-每日签到-签到按钮"
      },
      TASK_BUY_STANDARD: {
        trackId: "Home_Task_Popup_Member_Std",
        elementText: "首页-做任务积分弹窗-会员升级tab-购买标准版-去完成按钮"
      },
      TASK_BUY_PRO: {
        trackId: "Home_Task_Popup_Member_Pro",
        elementText: "首页-做任务积分弹窗-会员升级tab-购买专业版-去完成按钮"
      },
      TASK_BUY_ELITE: {
        trackId: "Home_Task_Popup_Member_Premium",
        elementText: "首页-做任务积分弹窗-会员升级tab-购买卓越版-去完成按钮"
      }
    };
    function g(oe) {
      return p[oe];
    }
    function f(oe) {
      const le = g(oe.id);
      return le ? !a.includes(oe.id) && (oe.status === "done" || oe.actionDisabled) ? {} : {
        "data-sensors-click": "",
        "data-sensors-track-id": le.trackId,
        "data-sensors-element-name": le.elementText
      } : {};
    }
    const _ = {
      TASK_REGISTER: _Ae,
      TASK_PROFILE: PN,
      TASK_DOWNLOAD_APP: CAe,
      TASK_FEEDBACK: OAe,
      TASK_BUY_STANDARD: NAe,
      TASK_BUY_PRO: lAe,
      TASK_BUY_ELITE: pAe
    };
    function h(oe) {
      var Ue;
      const le = oe.taskCode,
        we = oe.baseReward,
        Ce = ["TASK_BUY_PRO", "TASK_BUY_ELITE", "TASK_BUY_STANDARD"].includes(le) ? cl(we, {
          prefix: !0,
          unit: "积分/月"
        }) : cl(we, {
          prefix: !0
        });
      let Oe = "去完成",
        De = !1;
      return oe.status === "COMPLETED" ? Oe = le === "TASK_DAILY_LOGIN" ? "下月再来" : "已完成" : oe.status === "COME_BACK_TOMORROW" ? (Oe = "明日再来", De = !0) : (le === "TASK_DAILY_LOGIN" || oe.taskName.includes("登录")) && (Oe = "签到"), {
        id: le,
        title: oe.taskName,
        desc: oe.taskDesc,
        points: Ce,
        actionText: Oe,
        status: oe.status === "COMPLETED" ? "done" : "todo",
        actionDisabled: De,
        icon: (Ue = _[le]) != null ? Ue : PN,
        completedCount: oe.completedCount,
        cycleLimit: oe.cycleLimit
      };
    }
    function v(oe, le) {
      const we = new Map(oe.map(Ce => [Ce.taskCode, Ce]));
      return le.map(Ce => we.get(Ce)).filter(Ce => Ce != null).map(h);
    }
    function y(oe) {
      return oe.length === n.length && oe.every(le => le.status === "done");
    }
    function E(oe) {
      const le = oe.cycleLimit;
      return le != null && le > 1 ? `${oe.title}（${oe.completedCount}/${le}次）` : oe.title;
    }
    const C = e,
      S = Mp(),
      {
        refreshPoints: w
      } = kl(),
      T = F(() => {
        var oe, le, we;
        return (we = (le = (oe = S.userInfo) == null ? void 0 : oe.user) == null ? void 0 : le.userId) != null ? we : "";
      }),
      O = H(),
      x = H(null),
      R = H(null),
      A = H(!1),
      I = H("newbie"),
      k = H(null),
      M = () => {
        A.value = !1, wn("Home_Task_Popup_Close", "button", "首页-做任务积分弹窗-关闭按钮");
      };
    function L() {
      return Re(this, null, function* () {
        const oe = k.value;
        k.value = null, oe === "upgrade" && (yield ut(), wMe.show());
      });
    }
    function U() {
      L();
    }
    const B = H([]),
      $ = H([]),
      P = H([]),
      z = H(!1),
      q = H(!1);
    function Y() {
      $.value = $.value.map(oe => oe.id === "TASK_DAILY_LOGIN" ? ye(X({}, oe), {
        actionText: "明日再来",
        actionDisabled: !0
      }) : oe);
    }
    function K(oe) {
      return Re(this, null, function* () {
        if (!(oe.id !== "TASK_DAILY_LOGIN" || oe.actionText !== "签到" || oe.actionDisabled || q.value)) {
          q.value = !0;
          try {
            const le = yield PL(),
              {
                message: we,
                alreadyCheckedIn: Ce,
                creditsAmount: Oe
              } = le.data;
            Y(), yield ge(), Ce ? Pt.info((we == null ? void 0 : we.trim()) || "今日已签到，明日再来") : (Hu.success({
              content: "签到成功",
              count: T1(Oe)
            }), yield w());
          } catch (le) {
            Pt.error("签到失败，请稍后重试");
          } finally {
            q.value = !1;
          }
        }
      });
    }
    function j(oe) {
      var le;
      if (!(oe.status === "done" || oe.actionDisabled)) {
        if (oe.id === "TASK_FEEDBACK") {
          he(oe.id), (le = R.value) == null || le.show(u7e, 3e3);
          return;
        }
        oe.actionText === "签到" && (he(oe.id), K(oe));
      }
    }
    function Q() {
      ge();
    }
    function re(oe) {
      var Ce, Oe;
      if (!a.includes(oe.id) || (he(oe.id), i(oe).disabled) || ((Ce = s[oe.id]) != null ? Ce : 0) === 0) return;
      const we = u(oe);
      if (we === "user_above_task") {
        (Oe = R.value) == null || Oe.show(c7e);
        return;
      }
      we === "user_below_task" && (k.value = "upgrade", A.value = !1);
    }
    function te(oe) {
      oe.status === "done" || oe.actionDisabled || (he(oe.id), oe.id === "TASK_DOWNLOAD_APP" && window.open(`${window.location.origin}/wisenote`, "_blank", "noopener,noreferrer"));
    }
    function Z() {
      he("TASK_PROFILE"), Pt.warning("请先登录后再完善资料");
    }
    function ee() {
      ge();
    }
    function ne(oe) {
      var le;
      oe.id !== "TASK_PROFILE" || !T.value || (he(oe.id), A.value = !1, (le = x.value) == null || le.openDialog());
    }
    function ge() {
      return Re(this, null, function* () {
        z.value = !0;
        try {
          const {
            data: oe
          } = yield KT();
          B.value = v(oe, n), $.value = v(oe, r), P.value = v(oe, a), y(B.value) && (I.value = "active");
        } catch (oe) {
          B.value = [], $.value = [], P.value = [], Pt.error("任务列表加载失败，请稍后重试");
        } finally {
          z.value = !1;
        }
      });
    }
    const ae = () => Re(null, null, function* () {
        C.trackOnOpen && wn("Home_Points_Task", "button", "首页-做任务赚积分按钮"), A.value = !0, I.value = "newbie", yield ge();
      }),
      fe = oe => {
        I.value = oe, wn({
          newbie: "Home_Task_Popup_Newbie",
          active: "Home_Task_Popup_Activity",
          vip: "Home_Task_Popup_Member_Tab"
        }[oe], "tab", {
          newbie: "首页-做任务积分弹窗-新手成长tab",
          active: "首页-做任务积分弹窗-活跃互动tab",
          vip: "首页-做任务积分弹窗-会员升级tab"
        }[oe]);
      };
    function he(oe) {
      const le = g(oe);
      le && wn(le.trackId, "button", le.elementText);
    }
    return t({
      openDialog: ae
    }), (oe, le) => (D(), V(Ge, null, [N("div", {
      class: G(["inline-block cursor-pointer", C.class]),
      onClick: ae
    }, [Ae(oe.$slots, "default")], 2), W(b(Ei), {
      "append-to-body": !0,
      modelValue: A.value,
      "onUpdate:modelValue": le[0] || (le[0] = we => A.value = we),
      width: "640px",
      class: "points-task-dialog !rounded-2xl !pt-0 !px-0 !pb-0",
      "show-close": !1,
      "close-on-click-modal": !1,
      "header-class": "!py-0 !px-0 !h-0 !m-0",
      onClosed: U
    }, {
      header: se(() => [...(le[1] || (le[1] = []))]),
      default: se(() => [N("div", TMe, [N("div", {
        class: "absolute top-6 right-6 z-10 w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[#F2F3F5] cursor-pointer transition-colors",
        onClick: M
      }, [W(Aa, {
        class: "w-4 h-4 text-[#262626]"
      })]), le[5] || (le[5] = N("div", {
        class: "h-[64px] flex items-center border-[#E8E8E8]"
      }, [N("div", {
        class: "text-[16px] font-medium text-[#000]"
      }, " 做任务赚积分 ")], -1)), N("div", xMe, [N("div", OMe, [N("div", RMe, [(D(), V(Ge, null, Et([{
        key: "newbie",
        label: "新手成长"
      }, {
        key: "active",
        label: "活跃互动"
      }, {
        key: "vip",
        label: "会员升级"
      }], we => N("button", {
        key: we.key,
        type: "button",
        class: G(["flex-1 h-8 px-5 rounded-[6px] text-[14px] leading-8 transition-all border-transparent text-[#565656]", I.value === we.key ? "bg-white !text-[#000] font-medium shadow-[0_2px_8px_rgba(15,23,42,0.12)]" : "bg-transparent"]),
        "data-sensors-click": "",
        "data-sensors-track-id": {
          newbie: "Home_Task_Popup_Newbie",
          active: "Home_Task_Popup_Activity",
          vip: "Home_Task_Popup_Member_Tab"
        }[we.key],
        "data-sensors-element-name": {
          newbie: "首页-做任务积分弹窗-新手成长tab",
          active: "首页-做任务积分弹窗-活跃互动tab",
          vip: "首页-做任务积分弹窗-会员升级tab"
        }[we.key],
        onClick: Ce => fe(we.key)
      }, me(we.label), 11, AMe)), 64))])]), I.value === "newbie" ? (D(), V("div", IMe, [N("ul", NMe, [(D(!0), V(Ge, null, Et(B.value, we => (D(), V("li", {
        key: we.id,
        class: "points-task-dialog__row flex items-center p-4"
      }, [N("div", kMe, [N("div", DMe, [(D(), Se(tn(we.icon), {
        class: "w-4 h-4 text-[#4E5969]"
      }))]), N("div", MMe, [N("div", PMe, me(we.title), 1), N("div", LMe, me(we.desc), 1)]), N("div", FMe, [N("div", {
        class: G(["text-[14px] font-medium leading-6 flex-1 min-w-0", we.status === "done" ? "text-[#C9CDD4]" : "text-[#0DC15B]"])
      }, me(we.points), 3), we.status === "done" || we.actionDisabled ? (D(), V("button", BMe, me(we.actionText), 1)) : we.id === "TASK_PROFILE" && T.value ? (D(), V("button", on({
        key: 1,
        type: "button"
      }, {
        ref_for: !0
      }, f(we), {
        class: "shrink-0 whitespace-nowrap h-8 !px-[15px] rounded-[16px] !text-[14px] leading-8 border-none bg-[#165DFF] !text-white hover:bg-[#165DFF]/90 transition-colors",
        onClick: Ce => ne(we)
      }), me(we.actionText), 17, $Me)) : we.id === "TASK_PROFILE" ? (D(), V("button", on({
        key: 2,
        type: "button"
      }, {
        ref_for: !0
      }, f(we), {
        class: "shrink-0 whitespace-nowrap h-8 !px-[15px] rounded-[16px] !text-[14px] leading-8 border-none bg-[#165DFF] !text-white hover:bg-[#165DFF]/90 transition-colors",
        onClick: Z
      }), me(we.actionText), 17)) : (D(), V("button", on({
        key: 3,
        type: "button"
      }, {
        ref_for: !0
      }, f(we), {
        class: "shrink-0 whitespace-nowrap h-8 !px-[15px] rounded-[16px] !text-[14px] leading-8 border-none bg-[#165DFF] !text-white hover:bg-[#165DFF]/90 transition-colors",
        onClick: Ce => te(we)
      }), me(we.actionText), 17, UMe))])])]))), 128))]), N("p", VMe, [W($f, {
        class: "w-3 h-3"
      }), le[2] || (le[2] = bt(" 每项任务仅奖励一次积分，完成后自动发放至账户，重复完成不再奖励 ", -1))])])) : I.value === "active" ? (D(), V("div", HMe, [N("ul", zMe, [(D(!0), V(Ge, null, Et($.value, we => (D(), V("li", {
        key: we.id,
        class: "points-task-dialog__row flex items-center p-4"
      }, [N("div", GMe, [N("div", qMe, [(D(), Se(tn(we.icon), {
        class: "w-4 h-4 text-[#4E5969]"
      }))]), N("div", YMe, [N("div", jMe, me(E(we)), 1), N("div", KMe, me(we.desc), 1)]), N("div", WMe, [N("div", {
        class: G(["text-[14px] font-medium leading-6 flex-1 min-w-0", we.status === "done" ? "text-[#C9CDD4]" : "text-[#0DC15B]"])
      }, me(we.points), 3), N("button", on({
        type: "button"
      }, {
        ref_for: !0
      }, f(we), {
        class: ["shrink-0 whitespace-nowrap h-8 !px-[15px] rounded-[16px] !text-[14px] leading-8 border-none", we.status === "done" || we.actionDisabled ? "bg-transparent text-[#BFBFBF] cursor-default" : "bg-[#165DFF] !text-white hover:bg-[#165DFF]/90 transition-colors"],
        disabled: q.value && we.id === "TASK_DAILY_LOGIN" && we.actionText === "签到",
        onClick: Ce => j(we)
      }), me(q.value && we.id === "TASK_DAILY_LOGIN" && we.actionText === "签到" ? "签到中…" : we.actionText), 17, QMe)])])]))), 128))]), N("p", XMe, [W($f, {
        class: "w-3 h-3"
      }), le[3] || (le[3] = bt(" 每个自然月可重复完成，每次完成后自动发放积分，达到月上限后不再累计 ", -1))])])) : (D(), V("div", ZMe, [N("ul", JMe, [(D(!0), V(Ge, null, Et(P.value, we => (D(), V("li", {
        key: we.id,
        class: "points-task-dialog__row flex items-center p-4"
      }, [N("div", e7e, [N("div", t7e, [(D(), Se(tn(we.icon), {
        class: "w-5 h-5 text-[#F7BA1E]"
      }))]), N("div", n7e, [N("div", r7e, me(we.title), 1), N("div", a7e, me(we.desc), 1)]), N("div", o7e, [N("div", i7e, me(we.points), 1), N("button", on({
        type: "button"
      }, {
        ref_for: !0
      }, f(we), {
        class: d(we),
        onClick: Ce => re(we)
      }), me(i(we).label), 17, s7e)])])]))), 128))]), N("p", l7e, [W($f, {
        class: "w-3 h-3"
      }), le[4] || (le[4] = bt(" 升级会员后可享有对应会员版本的积分权益，积分随会员周期按月发放至账户 ", -1))])]))])])]),
      _: 1
    }, 8, ["modelValue"]), T.value ? (D(), Se(o9e, {
      key: 0,
      ref_key: "accountSettingDialogRef",
      ref: x,
      "user-id": T.value,
      onUpdate: ee
    }, {
      default: se(() => [...(le[6] || (le[6] = [N("span", {
        class: "hidden"
      }, null, -1)]))]),
      _: 1
    }, 8, ["user-id"])) : ce("", !0), W(X9e, {
      ref_key: "userFeedbackRef",
      ref: O,
      onSubmitted: Q
    }, null, 512), W(m9e, {
      color: "#165DFF",
      ref_key: "audioToastRef",
      ref: R
    }, null, 512)], 64));
  }
})