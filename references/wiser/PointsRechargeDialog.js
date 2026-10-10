CF = ie({
  name: "PointsRechargeDialog",
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
    const {
        refreshPoints: n
      } = kl(),
      r = $r(),
      {
        isLogin: a
      } = W7(),
      {
        isShare: s
      } = H7e(),
      c = F(() => {
        var oe, le;
        return ((le = (oe = r.userInfo) == null ? void 0 : oe.user) == null ? void 0 : le.userType) === "ENTERPRISE";
      }),
      l = H("PERSONAL"),
      u = F(() => l.value === "ENTERPRISE" ? "充值企业积分" : "充值积分");
    function i(oe) {
      if (!oe) return;
      const le = String(oe).trim().toLowerCase();
      if (le === "alipay") return "alipay";
      if (le === "wechat") return "wechat";
    }
    const d = e,
      p = H(!1),
      g = H(null),
      f = H(null),
      _ = H(""),
      h = H(""),
      v = H(null),
      y = H("wechat"),
      E = H(!1),
      C = H(!1),
      S = H(!1),
      w = H(!1),
      T = H(null),
      O = H(Date.now()),
      x = H(!1);
    let R = null,
      A = null,
      I = 0;
    function k() {
      return Re(this, null, function* () {
        try {
          const oe = yield vT();
          if (oe.code !== 200 || !oe.data || !r.userInfo) return;
          r.SET_USER_INFO(ye(X({}, r.userInfo), {
            user: oe.data
          }));
        } catch (oe) {}
      });
    }
    const M = F(() => {
      if (!g.value || !f.value || C.value || S.value || w.value) return "";
      const oe = T.value;
      if (oe == null || Number.isNaN(oe)) return "";
      const le = Math.max(0, Math.ceil((oe - O.value) / 1e3));
      if (le <= 0) return "支付已超时，请刷新二维码";
      const we = Math.min(le, TPe),
        Ce = Math.floor(we / 3600),
        Oe = Math.floor(we % 3600 / 60),
        De = we % 60;
      return Ce > 0 ? `距订单过期还剩 ${Ce}小时${Oe.toString().padStart(2, "0")}分` : `距订单过期还剩 ${Oe}:${De.toString().padStart(2, "0")}`;
    });
    function L() {
      R && (clearInterval(R), R = null);
    }
    function U() {
      B(), A = setInterval(() => {
        O.value = Date.now();
      }, 1e3);
    }
    function B() {
      A && (clearInterval(A), A = null);
    }
    function $(oe) {
      const le = oe == null ? void 0 : oe.trim();
      if (!le) return;
      const we = Date.parse(le);
      Number.isNaN(we) || (T.value = we, U());
    }
    const P = (...le) => Re(null, [...le], function* (oe = {}) {
        var Ne, Ze, Ye;
        if (s.value || !a.value) return;
        if (l.value = "PERSONAL", c.value) {
          if (!((Ze = (Ne = r.userInfo) == null ? void 0 : Ne.user) != null && Ze.canPurchaseEnterpriseCredits)) {
            Pt.warning("仅企业管理员可购买企业积分");
            return;
          }
          l.value = "ENTERPRISE";
        }
        d.trackOnOpen && wn("Home_Points_Recharge", "button", "首页-充值积分按钮"), p.value = !0, f.value = null, _.value = "", h.value = "", C.value = !1, S.value = !1, w.value = !1, T.value = null, x.value = !1, L(), B();
        const we = i(oe.payChannel);
        we && (y.value = we), yield ge();
        const Ce = te.value,
          Oe = (Ye = oe.skuCode) == null ? void 0 : Ye.trim();
        if (Oe) {
          if (Ce.some(ke => ke.id === Oe)) {
            g.value = Oe, yield j();
            return;
          }
          console.warn("[PointsRechargeDialog] 继续支付未匹配到 SKU:", Oe);
          return;
        }
        const De = g.value;
        !!(De && Ce.some(ke => ke.id === De)) ? yield j() : (g.value = ne(Ce), g.value && (yield j()));
      }),
      z = () => {
        wn(" Home_Pay_Popup_Close", "button", "首页-充值积分弹窗-关闭按钮"), p.value = !1, L(), B();
      };
    function q(oe, le) {
      return Re(this, null, function* () {
        try {
          const we = yield zL.toDataURL(oe, {
            width: 128,
            margin: 1,
            color: {
              dark: "#000000",
              light: "#ffffff"
            }
          });
          if (le !== I) return;
          _.value = we, h.value = "";
        } catch (we) {
          console.error("生成微信二维码失败:", we), le === I && (_.value = "");
        }
      });
    }
    function Y(oe) {
      const le = oe.trim(),
        we = `<style>
html,body{margin:0!important;padding:0!important;overflow:hidden!important;width:128px!important;height:128px!important;max-width:128px!important;max-height:128px!important;box-sizing:border-box!important;}
</style>`;
      return /^<!DOCTYPE/i.test(le) || /^<html[\s>]/i.test(le) ? /<head[\s>]/i.test(le) ? le.replace(/<head[^>]*>/i, Ce => `${Ce}${we}`) : le.replace(/<html[^>]*>/i, Ce => `${Ce}<head><meta charset="utf-8"/>${we}</head>`) : `<!DOCTYPE html><html><head><meta charset="utf-8"/>${we}</head><body>${le}</body></html>`;
    }
    function K() {
      const oe = v.value;
      if (oe != null && oe.contentDocument) try {
        const le = oe.contentDocument.querySelector("form");
        le && !le.dataset.vueFormSubmit && (le.dataset.vueFormSubmit = "1", le.submit());
      } catch (le) {
        console.error("[PointsRechargeDialog] 支付宝表单提交失败:", le);
      }
    }
    function j() {
      return Re(this, null, function* () {
        const oe = g.value;
        if (!oe) return;
        const le = ++I;
        L(), C.value = !1, S.value = !1, w.value = !1, T.value = null, x.value = !1, B(), E.value = !0, _.value = "", h.value = "";
        try {
          const we = yield IL(oe, y.value, {
            purchaseScope: l.value
          });
          if (le !== I) return;
          if (f.value = we.orderId, $(we.expireTime), y.value === "wechat" && we.wechatCodeUrl) yield q(we.wechatCodeUrl, le);else if (y.value === "alipay" && we.alipayFormHtml) {
            if (le !== I) return;
            h.value = Y(we.alipayFormHtml), _.value = "";
          } else throw new Error("下单返回与当前支付方式不匹配");
          if (le !== I) return;
          Q();
        } catch (we) {
          if (le !== I) return;
          f.value = null, _.value = "", h.value = "", L(), w.value = !0;
        } finally {
          le === I && (E.value = !1);
        }
      });
    }
    function Q() {
      L();
      const oe = f.value;
      if (!oe) return;
      const le = () => Re(null, null, function* () {
        var we, Ce;
        if (f.value === oe && p.value) try {
          const Oe = yield NL(oe);
          if (f.value !== oe) return;
          if (Oe.expiredAt) {
            const De = Date.parse(Oe.expiredAt);
            Number.isNaN(De) || (T.value = De, U());
          }
          if (Oe.status === "paid") {
            if (B(), T.value = null, C.value = !0, S.value = !1, L(), !x.value) {
              x.value = !0, b5("credits");
              const De = (Ce = (we = te.value.find(Ue => Ue.id === g.value)) == null ? void 0 : we.points) != null ? Ce : 0;
              Hu.success({
                title: l.value === "ENTERPRISE" ? "企业积分充值成功" : "积分充值成功",
                content: l.value === "ENTERPRISE" ? "积分已充值至企业积分池" : "充值成功",
                count: De
              }), yield k(), yield n();
            }
            z();
          } else Oe.status === "expired" && (B(), S.value = !0, C.value = !1, L());
        } catch (Oe) {}
      });
      le(), R = setInterval(() => void le(), wPe);
    }
    function re() {
      return Re(this, null, function* () {
        E.value || (S.value = !1, w.value = !1, yield j());
      });
    }
    const te = H([]),
      Z = H(!1);
    function ee(oe) {
      return [...oe.filter(Ce => (Ce == null ? void 0 : Ce.skuCode) && (Ce == null ? void 0 : Ce.displayConfig) != null)].sort((Ce, Oe) => {
        var De, Ue, Ne, Ze;
        return ((Ue = (De = Ce.displayConfig) == null ? void 0 : De.sortOrder) != null ? Ue : 0) - ((Ze = (Ne = Oe.displayConfig) == null ? void 0 : Ne.sortOrder) != null ? Ze : 0);
      }).map(Ce => {
        var Ne, Ze, Ye, ke, tt;
        const Oe = Ce.displayConfig,
          De = (Ne = Oe == null ? void 0 : Oe.exchange) != null ? Ne : 0,
          Ue = (Ze = Oe == null ? void 0 : Oe.sortOrder) != null ? Ze : 0;
        return {
          id: Ce.skuCode,
          points: (Ye = Oe == null ? void 0 : Oe.points) != null ? Ye : 0,
          priceOriginal: (ke = Oe == null ? void 0 : Oe.originPrice) != null ? ke : 0,
          price: (tt = Oe == null ? void 0 : Oe.price) != null ? tt : 0,
          rate: `1元≈${De}积分`,
          tag: Ue === 3 ? "最划算" : null
        };
      });
    }
    function ne(oe) {
      return oe.length ? oe[Math.min(2, oe.length - 1)].id : null;
    }
    function ge() {
      return Re(this, null, function* () {
        var oe, le;
        Z.value = !0;
        try {
          const we = yield Uwe({
            type: "PC"
          });
          (le = (oe = we.data) == null ? void 0 : oe.CRE) != null && le.length ? te.value = ee(we.data.CRE) : (te.value = [], we.message && console.warn("[PointsRechargeDialog] SKU 列表:", we.message));
        } catch (we) {
          console.error("[PointsRechargeDialog] 获取套餐失败:", we), te.value = [];
        } finally {
          Z.value = !1;
        }
      });
    }
    const ae = () => {
        var Ce, Oe, De;
        const oe = te.value,
          le = {
            id: "",
            points: 0,
            priceOriginal: 0,
            price: 0,
            rate: "",
            tag: null
          };
        if (!oe.length) return le;
        const we = ne(oe);
        return (De = (Oe = (Ce = oe.find(Ue => Ue.id === g.value)) != null ? Ce : oe.find(Ue => Ue.id === we)) != null ? Oe : oe[0]) != null ? De : le;
      },
      fe = F(() => ["积分可在PC端执行任务消耗使用，或在App端兑换录音转写时长使用。", "积分自购买之日起一年有效，请在有效期内及时使用。", "积分为虚拟产品，购买后不支持退款，如需开票，可联系客服开具发票。", l.value === "ENTERPRISE" ? "企业管理员购买的积分将充值至企业积分池，可分配给企业成员。" : "个人购买的积分将直接充值至个人账号。"]);
    function he(oe) {
      return Re(this, null, function* () {
        wn({
          CRE_3000: "Home_Pay_Popup_3000",
          CRE_10000: "Home_Pay_Popup_10000",
          CRE_15000: "Home_Pay_Popup_15000"
        }[oe] || oe, "button", {
          CRE_3000: "首页-充值积分弹窗-3000积分充值",
          CRE_10000: "首页-充值积分弹窗-10000积分充值",
          CRE_15000: "首页-充值积分弹窗-15000积分充值"
        }[oe] || oe), g.value !== oe && (g.value = oe, yield j());
      });
    }
    return Ie(p, oe => {
      oe || (L(), B());
    }), vs(() => {
      L(), B();
    }), Ie(y, () => Re(null, null, function* () {
      !p.value || !g.value || (yield j());
    })), t({
      openDialog: P
    }), (oe, le) => {
      const we = Vt("el-dialog");
      return D(), V(Ge, null, [N("div", {
        class: G(["inline-block", d.class]),
        onClick: P
      }, [Ae(oe.$slots, "default")], 2), W(we, {
        modelValue: p.value,
        "onUpdate:modelValue": le[2] || (le[2] = Ce => p.value = Ce),
        width: "860px",
        class: "points-recharge-dialog !rounded-2xl !pt-0 !px-0 !pb-0",
        "append-to-body": !0,
        "show-close": !1,
        "close-on-click-modal": !1,
        "header-class": "!py-0 !px-0 !h-0 !m-0"
      }, {
        header: se(() => [...(le[3] || (le[3] = []))]),
        default: se(() => [N("div", {
          class: "points-recharge-close absolute top-6 right-6 z-10 w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[#F2F3F5] cursor-pointer transition-colors",
          onClick: z
        }, [W(Aa, {
          class: "w-4 h-4 text-[#262626]"
        })]), N("div", z7e, [N("div", G7e, [N("div", {
          class: "points-recharge-bg absolute inset-0 left-0 top-0 h-[280px] w-[580px] bg-left-top bg-no-repeat pointer-events-none",
          style: mt({
            backgroundImage: `url(${b(P7e)})`,
            backgroundSize: "100% auto"
          })
        }, null, 4), N("div", q7e, [N("div", Y7e, me(u.value), 1), le[7] || (le[7] = N("div", {
          class: "flex items-center justify-center my-6"
        }, [N("div", {
          class: "points-recharge-promo-title relative text-[24px] font-semibold leading-8 text-[#000] flex items-center gap-0 justify-center"
        }, [N("span", {
          class: "bg-gradient-to-r from-[#004EFF] to-[#4F1EFF] bg-clip-text text-transparent"
        }, " 特惠 "), bt(" 充值 "), N("div", {
          class: "points-recharge-promo-tag absolute -top-3 -right-11 h-[24px] flex items-center px-2 text-[12px] font-medium text-white rounded-tl-[12px] rounded-tr-[12px] rounded-br-[12px] rounded-bl-0 bg-gradient-to-r from-[#F95114] to-[#FBA950]"
        }, " 限时 ")])], -1)), Z.value && !te.value.length ? (D(), V("div", j7e, " 套餐加载中... ")) : te.value.length ? (D(), V("div", W7e, [(D(!0), V(Ge, null, Et(te.value, Ce => (D(), V("button", {
          key: Ce.id,
          type: "button",
          "data-track-id": {
            CRE_3000: "Home_Pay_Popup_3000",
            CRE_10000: "Home_Pay_Popup_10000",
            CRE_15000: "Home_Pay_Popup_15000"
          }[Ce.id],
          "data-custom-element-text": {
            CRE_3000: "首页-充值积分弹窗-3000积分充值",
            CRE_10000: "首页-充值积分弹窗-10000积分充值",
            CRE_15000: "首页-充值积分弹窗-15000积分充值"
          }[Ce.id],
          class: G(["points-recharge-package-card relative flex-1 flex flex-col items-start rounded-[12px] border-2 !pt-10 pb-2 !px-4 transition-all duration-200", g.value === Ce.id ? "border-[#165DFF] bg-[#EEF3FF] bg-gradient-to-r from-[#F0F5FF] to-[#FAF9FF]" : "border-black/8 hover:bg-[#FAFAFA] bg-white"]),
          onClick: Oe => he(Ce.id)
        }, [Ce.tag ? (D(), V("span", X7e, me(Ce.tag), 1)) : ce("", !0), N("div", Z7e, [N("div", J7e, [W(cv, {
          class: "w-3 h-3 flex-shrink-0 text-[#165DFF]"
        }), N("span", ePe, me(Ce.points), 1), le[4] || (le[4] = N("span", {
          class: "self-end text-[12px] leading-4 !text-[#262626]"
        }, " 积分 ", -1))]), N("span", tPe, me(Ce.rate), 1)]), le[5] || (le[5] = N("div", {
          class: "h-[1px] bg-black/5 my-1 w-full"
        }, null, -1)), N("div", nPe, [N("span", rPe, " ¥" + me(Ce.priceOriginal), 1), N("span", {
          class: G(["text-[16px] font-medium leading-7", g.value === Ce.id ? "text-[#165DFF]" : "text-[#262626]"])
        }, " ¥" + me(Ce.price), 3)])], 10, Q7e))), 128))])) : (D(), V("div", K7e, " 暂无可用套餐，请稍后重试 ")), N("ul", aPe, [(D(!0), V(Ge, null, Et(fe.value, (Ce, Oe) => (D(), V("li", {
          key: Oe,
          class: "flex items-start gap-2 text-[12px] leading-[16px] text-[#565656]"
        }, [le[6] || (le[6] = N("span", {
          class: "mt-1.5 w-[4px] h-[4px] rounded-full bg-[#565656] flex-shrink-0"
        }, null, -1)), N("span", null, me(Ce), 1)]))), 128))])])]), N("div", oPe, [g.value ? (D(), V(Ge, {
          key: 0
        }, [N("div", iPe, " ¥" + me(ae().price), 1), N("div", sPe, [N("span", lPe, " ¥ " + me(ae().priceOriginal), 1), N("span", cPe, " 已减 ¥" + me(ae().priceOriginal - ae().price), 1)]), N("div", uPe, [N("button", {
          type: "button",
          class: G(["flex-1 rounded-[8px] !text-[14px] !font-medium flex items-center justify-center gap-1 transition-all border border-transparent cursor-pointer", y.value === "wechat" ? "border!border-black/5 bg-white !text-[#262626] font-medium" : "border-transparent bg-transparent"]),
          onClick: le[0] || (le[0] = Ce => y.value = "wechat")
        }, [W(FL, {
          class: "w-4 h-4"
        }), le[8] || (le[8] = bt(" 微信 ", -1))], 2), N("button", {
          type: "button",
          class: G(["flex-1 rounded-[8px] !text-[14px] !font-medium flex items-center justify-center gap-1 transition-all border border-transparent cursor-pointer", y.value === "alipay" ? "border !border-black/5 bg-white !text-[#262626] font-medium" : "border-transparent bg-transparent"]),
          onClick: le[1] || (le[1] = Ce => y.value = "alipay")
        }, [W(LL, {
          class: "w-4 h-4"
        }), le[9] || (le[9] = bt(" 支付宝 ", -1))], 2)]), N("div", dPe, [N("div", pPe, [_.value ? (D(), V("img", {
          key: 0,
          src: _.value,
          alt: "支付二维码",
          class: "points-recharge-qr-image w-[128px] h-[128px] object-contain"
        }, null, 8, fPe)) : h.value ? (D(), V("iframe", {
          key: 1,
          ref_key: "alipayIframeRef",
          ref: v,
          class: "points-recharge-qr-image block h-[128px] w-[128px] max-h-[128px] max-w-[128px] shrink-0 border-0 bg-white overflow-hidden",
          title: "支付宝支付",
          scrolling: "no",
          sandbox: "allow-forms allow-scripts allow-same-origin allow-popups",
          referrerpolicy: "no-referrer",
          srcdoc: h.value,
          onLoad: K
        }, null, 40, mPe)) : ce("", !0), (_.value || h.value) && C.value ? (D(), V("div", gPe, [...(le[10] || (le[10] = [N("span", {
          class: "text-[20px] font-semibold text-white"
        }, " 支付完成 ", -1)]))])) : (_.value || h.value) && S.value ? (D(), V("div", _Pe, [le[11] || (le[11] = N("span", {
          class: "text-[12px] text-[#262626] text-center leading-[18px]"
        }, [bt(" 二维码失效 "), N("br"), bt(" 请点击刷新 ")], -1)), N("button", {
          type: "button",
          class: "border-none bg-transparent",
          disabled: E.value,
          onClick: He(re, ["stop"])
        }, [W(ev, {
          class: "w-4 h-4 flex-shrink-0 hover:!text-[#262626] text-[#8C8C8C]"
        })], 8, hPe)])) : w.value && !_.value && !h.value && !E.value ? (D(), V("div", vPe, [le[12] || (le[12] = N("span", {
          class: "text-[12px] text-[#262626] text-center leading-[18px]"
        }, [bt(" 获取支付码失败 "), N("br"), bt(" 请点击刷新 ")], -1)), N("button", {
          type: "button",
          class: "border-none bg-transparent",
          disabled: E.value,
          onClick: He(re, ["stop"])
        }, [W(ev, {
          class: "w-4 h-4 flex-shrink-0 hover:!text-[#262626] text-[#8C8C8C]"
        })], 8, bPe)])) : E.value ? (D(), V("div", yPe, " 加载中... ")) : ce("", !0)])]), M.value && g.value && f.value && !E.value ? (D(), V("div", EPe, me(M.value), 1)) : ce("", !0), N("p", SPe, [le[14] || (le[14] = bt(" 付费即表示同意 ", -1)), W(V7e, null, {
          default: se(() => [...(le[13] || (le[13] = [N("span", {
            class: "text-[#165DFF] cursor-pointer hover:underline"
          }, " 《积分充值协议》 ", -1)]))]),
          _: 1
        })])], 64)) : (D(), V("div", CPe, " 请先选择套餐 "))])])]),
        _: 1
      }, 8, ["modelValue"])], 64);
    };
  }
})