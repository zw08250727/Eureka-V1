yOe = ie({
  name: "MemberRechargeDialog",
  __name: "index",
  props: {
    class: {
      default: ""
    }
  },
  emits: ["success", "fail"],
  setup(e, {
    expose: t,
    emit: n
  }) {
    const {
        refreshPoints: r,
        pointsStore: a
      } = kl(),
      s = $r(),
      c = e;
    function l(Fe) {
      if (!Fe) return;
      const $e = String(Fe).trim().toLowerCase();
      if ($e === "alipay") return "alipay";
      if ($e === "wechat") return "wechat";
    }
    const u = new Set(["JSB", "ADDON", "ADDON_PACKAGE", "DURATION"]),
      i = new Set(["VIP", "MEMBER", "MEMBERSHIP", "PRO", "PE", "STD", "STANDARD"]);
    function d(Fe) {
      const $e = String(Fe || "").trim().toUpperCase();
      return $e ? u.has($e) ? "addon" : (i.has($e), "member") : "member";
    }
    function p(Fe) {
      const $e = Fe == null ? void 0 : Fe.trim();
      return $e ? le.value.some(_t => _t.id === $e) ? {
        tab: "addon",
        billingPeriod: null
      } : fe.value.some(_t => _t.id === $e) ? {
        tab: "member",
        billingPeriod: "annual"
      } : he.value.some(_t => _t.id === $e) ? {
        tab: "member",
        billingPeriod: "monthly"
      } : null : null;
    }
    function g(Fe) {
      var _t;
      const $e = p(Fe.skuCode);
      if ($e) {
        Oe.value = $e.tab, $e.billingPeriod && (De.value = $e.billingPeriod);
        return;
      }
      Oe.value = (_t = Fe.initialTab) != null ? _t : d(Fe.productType);
    }
    function f(Fe) {
      return (Oe.value === "member" ? ke() : le.value).some(_t => _t.id === Fe) && !Me(Fe);
    }
    function _(Fe) {
      const $e = Fe == null ? void 0 : Fe.trim();
      if (!$e) return;
      const _t = Date.parse($e);
      Number.isNaN(_t) || ($.value = _t, Z());
    }
    const h = n,
      v = H(!1),
      y = H(null),
      E = H(null),
      C = H(""),
      S = H(""),
      w = H(null),
      T = H("wechat"),
      O = H(!1),
      x = H(!1),
      R = H(!1),
      A = H(!1),
      I = H(!1),
      k = H(!1),
      M = H(!1),
      L = H(!1),
      U = H(!1),
      B = H(!1),
      $ = H(null),
      P = H(Date.now()),
      z = H(!1),
      q = H(!1);
    let Y = null,
      K = null,
      j = 0,
      Q = null;
    const re = F(() => {
      if (!y.value || !E.value || x.value || R.value || A.value) return "";
      const Fe = $.value;
      if (Fe == null || Number.isNaN(Fe)) return "";
      const $e = Math.max(0, Math.ceil((Fe - P.value) / 1e3));
      if ($e <= 0) return "支付已超时，请刷新二维码";
      const _t = Math.min($e, bOe),
        je = Math.floor(_t / 3600),
        Cn = Math.floor(_t % 3600 / 60),
        ln = _t % 60;
      return je > 0 ? `距订单过期还剩 ${je}小时${Cn.toString().padStart(2, "0")}分` : `距订单过期还剩 ${Cn}:${ln.toString().padStart(2, "0")}`;
    });
    function te() {
      Y && (clearInterval(Y), Y = null);
    }
    function Z() {
      ee(), K = setInterval(() => {
        P.value = Date.now();
      }, 1e3);
    }
    function ee() {
      K && (clearInterval(K), K = null);
    }
    function ne() {
      return Re(this, null, function* () {
        var Fe;
        try {
          const $e = yield vT();
          if ($e.code !== 200 || !$e.data || !s.userInfo) return;
          s.SET_USER_INFO(ye(X({}, s.userInfo), {
            user: $e.data
          })), a.SET_SHOW_CREDITS_GUIDE(!!((Fe = $e.data) != null && Fe.showCreditsGuide));
        } catch ($e) {
          console.error("[MemberRechargeDialog] 刷新用户信息失败:", $e);
        }
      });
    }
    function ge() {
      return Re(this, null, function* () {
        try {
          yield uTe();
        } catch (Fe) {
          console.error("[MemberRechargeDialog] 重试额度不足自动总结失败:", Fe);
        }
      });
    }
    function ae() {
      return Re(this, null, function* () {
        if (Oe.value === "addon") try {
          const Fe = yield BL();
          v5(Fe.records.reduce(($e, _t) => {
            var je;
            return $e + Math.max((je = _t.remainingQuota) != null ? je : 0, 0);
          }, 0));
        } catch (Fe) {}
      });
    }
    const fe = H([]),
      he = H([]),
      oe = H([]),
      le = H([]),
      we = H([]),
      Ce = H(!1),
      Oe = H("member"),
      De = H("annual"),
      Ue = {
        pro: "PRO",
        elite: "PE"
      },
      Ne = {
        pro: 2,
        elite: 3
      };
    function Ze() {
      var $e, _t;
      const Fe = (_t = ($e = s.userInfo) == null ? void 0 : $e.user) == null ? void 0 : _t.membershipType;
      return Fe === "PE" ? 3 : Fe === "PRO" ? 2 : Fe === "STD" ? 1 : 0;
    }
    function Ye(Fe) {
      return Ze() > Ne[Fe];
    }
    function ke() {
      return De.value === "annual" ? fe.value : he.value;
    }
    function tt(Fe) {
      if (!Fe.length) return null;
      const $e = sr.value.filter(je => Fe.some(Cn => Cn.id === je.id) && !Ye(je.key));
      if (!$e.length) return null;
      const _t = $e.find(je => je.recommended);
      return _t ? _t.id : $e[0].id;
    }
    const ft = {
        headerBgColor: "#FFF4EC",
        headerTextColor: "#7E4800",
        bodyBgColor: "#FFF4EC",
        bodyTextColor: "#7E4800"
      },
      it = F(() => {
        var Fe, $e;
        return (($e = (Fe = s.userInfo) == null ? void 0 : Fe.user) == null ? void 0 : $e.userType) === "ENTERPRISE" ? ["权益对比", "常见问题"] : ["权益对比", "常见问题", "我的订单"];
      }),
      kt = {
        pro: {
          trackId: "Home_Member_Popup_SKU_Pro",
          elementText: "首页（会员购买弹窗）-专业版SKU卡片"
        },
        elite: {
          trackId: "Home_Member_Popup_SKU_Premium",
          elementText: "首页（会员购买弹窗）-卓越版SKU卡片"
        }
      },
      Gt = {
        120: {
          trackId: "Home_Member_Popup_SKU_Pack_Lite",
          elementText: "首页（会员购买弹窗）-加时包120分钟"
        },
        1e3: {
          trackId: "Home_Member_Popup_SKU_Pack_Hot",
          elementText: "首页（会员购买弹窗）-加时包1000分钟"
        },
        2e3: {
          trackId: "Home_Member_Popup_SKU_Pack_Best",
          elementText: "首页（会员购买弹窗）-加时包2000分钟"
        }
      },
      Yt = {
        权益对比: {
          trackId: "Home_Member_Popup_Benefits",
          elementText: "首页（会员购买弹窗）-权益对比入口"
        },
        常见问题: {
          trackId: "Home_Member_Popup_FAQ",
          elementText: "首页（会员购买弹窗）-常见问题入口"
        },
        我的订单: {
          trackId: "Home_Member_Popup_Order",
          elementText: "首页（会员购买弹窗）-我的订单入口"
        }
      },
      at = {
        trackId: "Home_Member_Popup_Close",
        elementText: "首页（会员购买弹窗）-关闭按钮"
      },
      Tt = {
        trackId: "Home_Member_Retention_Popup_Show",
        elementText: "首页（会员购买弹窗）-会员权益挽留弹窗曝光"
      },
      Lt = {
        trackId: "Home_Pack_Retention_Popup_Show",
        elementText: "首页（会员购买弹窗）-加时包权益挽留弹窗曝光"
      },
      _e = {
        trackId: "Home_Member_Retention_Popup_Close",
        elementText: "首页（会员挽留弹窗）-关闭按钮"
      },
      ze = H([]),
      J = H([]),
      pe = {
        free: "w-[112px]",
        standard: "w-[146px]",
        pro: "w-[112px]",
        elite: "w-[134px]"
      };
    function Ve(Fe) {
      const $e = Number(Fe);
      return Number.isFinite($e) ? $e : 0;
    }
    function lt(Fe) {
      return Fe ? Fe.split(`
`).map($e => $e.trim()).filter(Boolean) : [];
    }
    function At(Fe) {
      return Fe.map($e => ({
        key: $e.key,
        title: $e.title,
        description: $e.description,
        badge: $e.badge,
        recommended: $e.recommended,
        features: $e.features.map(_t => ({
          label: _t.label,
          icon: _t.icon,
          highlight: _t.highlight,
          medium: _t.medium
        }))
      }));
    }
    function ct(Fe) {
      var _t, je, Cn, ln;
      if (!(Fe != null && Fe.skuCode)) return null;
      const $e = ((_t = Fe.displayConfig) == null ? void 0 : _t.unitPrice) != null ? Ve(Fe.displayConfig.unitPrice) : Ve(Fe.price);
      return {
        id: Fe.skuCode,
        displayPrice: $e,
        displayPriceUnitLabel: ((Cn = (je = Fe.displayConfig) == null ? void 0 : je.unitPriceLabel) == null ? void 0 : Cn.trim()) || "月",
        priceOriginal: ((ln = Fe.displayConfig) == null ? void 0 : ln.originalPrice) != null ? Ve(Fe.displayConfig.originalPrice) : null,
        price: Ve(Fe.price)
      };
    }
    function vn(Fe, $e) {
      const _t = Fe == null ? void 0 : Fe.find(je => {
        var Cn;
        return ((Cn = je.skuConfig) == null ? void 0 : Cn.unit) === $e;
      });
      return ct(_t);
    }
    function xn(Fe, $e, _t) {
      return Fe.map(je => {
        const Cn = Ue[je.key];
        return vn($e[Cn], _t);
      }).filter(je => je !== null);
    }
    function Sn(Fe) {
      return [...(Fe != null ? Fe : [])].sort((_t, je) => {
        var Cn, ln;
        return Ve((Cn = _t.displayConfig) == null ? void 0 : Cn.sortOrder) - Ve((ln = je.displayConfig) == null ? void 0 : ln.sortOrder);
      }).filter(_t => _t.skuCode).map(_t => {
        var je, Cn, ln, Pn, jr, Hr, ri, Si;
        return {
          id: _t.skuCode,
          duration: Ve((je = _t.skuConfig) == null ? void 0 : je.quota),
          unit: "分钟",
          description: ((ln = (Cn = _t.skuConfig) == null ? void 0 : Cn.description) == null ? void 0 : ln.trim()) || _t.skuName,
          rate: ((jr = (Pn = _t.displayConfig) == null ? void 0 : Pn.unit) == null ? void 0 : jr.trim()) || "",
          priceOriginal: ((Hr = _t.displayConfig) == null ? void 0 : Hr.originalPrice) != null ? Ve(_t.displayConfig.originalPrice) : null,
          price: Ve(_t.price),
          tag: ((Si = (ri = _t.displayConfig) == null ? void 0 : ri.badge) == null ? void 0 : Si.trim()) || null
        };
      });
    }
    function Fn() {
      return Re(this, null, function* () {
        var Fe, $e, _t, je;
        Ce.value = !0, oe.value = [], fe.value = [], he.value = [], le.value = [], we.value = [];
        try {
          const Cn = yield AL(),
            ln = (Fe = Cn.products) != null ? Fe : {},
            Pn = At(($e = Cn.pcSkuConfig) != null ? $e : []).filter(jr => {
              const Hr = Ue[jr.key];
              return !!(vn(ln[Hr], "YEAR") && vn(ln[Hr], "MONTH"));
            });
          oe.value = Pn, fe.value = xn(Pn, ln, "YEAR"), he.value = xn(Pn, ln, "MONTH"), le.value = Sn(ln.JSB), we.value = lt((je = (_t = ln.JSB) == null ? void 0 : _t[0]) == null ? void 0 : je.description);
        } catch (Cn) {
          console.error("[MemberRechargeDialog] 获取会员在售 SKU 失败:", Cn), oe.value = [], fe.value = [], he.value = [], le.value = [], we.value = [];
        } finally {
          Ce.value = !1;
        }
      });
    }
    function We() {
      var Fe, $e;
      return ($e = (Fe = le.value[le.value.length - 1]) == null ? void 0 : Fe.id) != null ? $e : null;
    }
    function Ft() {
      var je, Cn, ln;
      const Fe = Oe.value === "member" ? ke() : le.value,
        $e = X(ye(X(X(X({
          id: ""
        }, Oe.value === "member" ? {} : {
          duration: 0,
          unit: "分钟",
          description: "",
          rate: ""
        }), Oe.value === "member" ? {
          displayPrice: 0
        } : {}), Oe.value === "member" ? {
          displayPriceUnitLabel: "月"
        } : {}), {
          priceOriginal: null,
          price: 0
        }), Oe.value === "member" ? {} : {
          tag: null
        });
      if (!Fe.length) return $e;
      const _t = Dt(Oe.value);
      return (ln = (Cn = (je = Fe.find(Pn => Pn.id === y.value)) != null ? je : Fe.find(Pn => Pn.id === _t)) != null ? Cn : Fe[0]) != null ? ln : $e;
    }
    function Dt(Fe) {
      return Fe === "member" ? tt(ke()) : We();
    }
    const qn = F(() => Oe.value === "member" ? "成为会员，专享15项+核心会员权益，覆盖录音转写、AI总结与知识库协同全流程。" : "加购加时包，录音转写时长即刻到账，按需叠加更灵活。"),
      sr = F(() => {
        const Fe = De.value === "annual" ? fe.value : he.value,
          $e = fe.value;
        return oe.value.map((_t, je) => {
          var Pn, jr;
          const Cn = Fe[je],
            ln = $e[je];
          return Cn ? ye(X({}, _t), {
            id: Cn.id,
            displayPrice: Cn.displayPrice,
            displayPriceUnitLabel: Cn.displayPriceUnitLabel,
            annualTotalPrice: (Pn = ln == null ? void 0 : ln.price) != null ? Pn : null,
            originalPrice: (jr = ln == null ? void 0 : ln.priceOriginal) != null ? jr : null
          }) : null;
        }).filter(_t => _t !== null);
      });
    function br(Fe) {
      wn(Fe.trackId, "button", Fe.elementText);
    }
    function dn(Fe) {
      if (Oe.value === "member") {
        const $e = sr.value.find(_t => _t.id === Fe);
        if ($e) return kt[$e.key];
      } else {
        const $e = le.value.find(_t => _t.id === Fe);
        if ($e) {
          const _t = Gt[$e.duration];
          if (_t) return _t;
        }
      }
      return {
        trackId: "Member_Recharge_Sku",
        elementText: Fe
      };
    }
    function Me(Fe) {
      if (Oe.value !== "member") return !1;
      const $e = sr.value.find(_t => _t.id === Fe);
      return $e ? Ye($e.key) : !1;
    }
    function st(Fe) {
      return Oe.value === "member" && Ye(Fe);
    }
    function xt() {
      Q || (Q = Pt.warning({
        message: "您当前已是卓越版，暂不支持降级购买。",
        onClose: () => {
          Q = null;
        }
      }));
    }
    function sn(Fe, $e) {
      return typeof Fe == "number" && Fe > $e;
    }
    function Gn(Fe, $e) {
      return sn(Fe, $e) ? Fe - $e : 0;
    }
    function Kn() {
      var $e;
      const Fe = sr.value.find(_t => _t.id === y.value);
      return (($e = Fe == null ? void 0 : Fe.title) == null ? void 0 : $e.trim()) || "";
    }
    function Be() {
      if (Oe.value === "member") {
        const $e = Kn();
        return {
          title: "会员购买成功",
          content: "购买成功",
          resultText: $e ? `${$e}会员已到账` : "会员权益已到账"
        };
      }
      const Fe = Ft();
      return "duration" in Fe && Fe.duration > 0 ? {
        title: "加时包购买成功",
        content: "购买成功",
        resultText: `${Fe.duration}${Fe.unit}加时包已到账`
      } : {
        title: "加时包购买成功",
        content: "购买成功",
        resultText: "加时包已到账"
      };
    }
    function be() {
      if (Oe.value === "member") return Kn();
      const Fe = Ft();
      return "description" in Fe ? Fe.description : "";
    }
    function Te(Fe) {
      var $e, _t, je;
      return {
        skuId: (_t = ($e = Fe == null ? void 0 : Fe.skuId) != null ? $e : y.value) != null ? _t : "",
        orderId: (je = Fe == null ? void 0 : Fe.orderId) != null ? je : E.value,
        rechargeType: Oe.value,
        paymentMethod: T.value,
        billingPeriod: Oe.value === "member" ? De.value : null,
        productName: be()
      };
    }
    function ot(Fe) {
      h("success", ye(X({}, Te(Fe)), {
        status: "paid"
      }));
    }
    function Bt(Fe, $e) {
      h("fail", X(ye(X({}, Te($e)), {
        reason: Fe
      }), $e != null && $e.message ? {
        message: $e.message
      } : {}));
    }
    const qt = F(() => L.value ? J.value.filter(Fe => {
      const $e = ze.value.map(_t => Fe[_t.key]);
      return new Set($e.map(_t => String(_t))).size > 1;
    }) : J.value);
    function pn(Fe) {
      return Fe.map($e => {
        const _t = {
          key: $e.key,
          title: $e.title,
          headerBgColor: $e.headerBgColor,
          headerTextColor: $e.headerTextColor,
          bodyBgColor: $e.bodyBgColor,
          bodyTextColor: $e.bodyTextColor,
          linkEnabled: $e.linkEnabled,
          linkUrl: $e.linkUrl
        };
        return $e.key !== "elite" ? _t : X(X({}, _t), ft);
      });
    }
    function Je(Fe) {
      return Fe.map($e => ({
        label: $e.label,
        free: $e.free,
        standard: $e.standard,
        pro: $e.pro,
        elite: $e.elite
      }));
    }
    function fn() {
      return Re(this, null, function* () {
        if (!B.value && !U.value) {
          B.value = !0;
          try {
            const Fe = yield Vwe(),
              $e = pn(Fe.columns),
              _t = Je(Fe.rows);
            if (!$e.length || !_t.length) throw new Error("会员权益对比返回为空");
            ze.value = $e, J.value = _t, U.value = !0;
          } catch (Fe) {
            console.error("[MemberRechargeDialog] 获取会员权益对比失败:", Fe), ze.value = [], J.value = [];
          } finally {
            B.value = !1;
          }
        }
      });
    }
    function Dn(Fe, $e) {
      return Re(this, null, function* () {
        try {
          const _t = yield zL.toDataURL(Fe, {
            width: 128,
            margin: 1,
            color: {
              dark: "#000000",
              light: "#ffffff"
            }
          });
          if ($e !== j) return;
          C.value = _t, S.value = "";
        } catch (_t) {
          console.error("[MemberRechargeDialog] 生成微信二维码失败:", _t), $e === j && (C.value = "");
        }
      });
    }
    function Qt(Fe) {
      const $e = Fe.trim(),
        _t = `<style>
html,body{margin:0!important;padding:0!important;overflow:hidden!important;width:128px!important;height:128px!important;max-width:128px!important;max-height:128px!important;box-sizing:border-box!important;}
</style>`;
      return /^<!DOCTYPE/i.test($e) || /^<html[\s>]/i.test($e) ? /<head[\s>]/i.test($e) ? $e.replace(/<head[^>]*>/i, je => `${je}${_t}`) : $e.replace(/<html[^>]*>/i, je => `${je}<head><meta charset="utf-8"/>${_t}</head>`) : `<!DOCTYPE html><html><head><meta charset="utf-8"/>${_t}</head><body>${$e}</body></html>`;
    }
    function _n() {
      const Fe = w.value;
      if (Fe != null && Fe.contentDocument) try {
        const $e = Fe.contentDocument.querySelector("form");
        $e && !$e.dataset.vueFormSubmit && ($e.dataset.vueFormSubmit = "1", $e.submit());
      } catch ($e) {
        console.error("[MemberRechargeDialog] 支付宝表单提交失败:", $e);
      }
    }
    function Qe() {
      return Re(this, null, function* () {
        const Fe = y.value;
        if (!Fe || Me(Fe)) return;
        const $e = ++j;
        te(), x.value = !1, R.value = !1, A.value = !1, $.value = null, z.value = !1, q.value = !1, ee(), O.value = !0, C.value = "", S.value = "";
        try {
          const _t = yield IL(Fe, T.value);
          if ($e !== j) return;
          if (E.value = _t.orderId, _(_t.expireTime), T.value === "wechat" && _t.wechatCodeUrl) yield Dn(_t.wechatCodeUrl, $e);else if (T.value === "alipay" && _t.alipayFormHtml) {
            if ($e !== j) return;
            S.value = Qt(_t.alipayFormHtml), C.value = "";
          } else throw new Error("下单返回与当前支付方式不匹配");
          if ($e !== j) return;
          Nt();
        } catch (_t) {
          if ($e !== j) return;
          E.value = null, C.value = "", S.value = "", te(), A.value = !0, Bt("createOrderFailed", {
            skuId: Fe,
            orderId: null,
            message: _t instanceof Error ? _t.message : "创建订单失败"
          });
        } finally {
          $e === j && (O.value = !1);
        }
      });
    }
    function Nt() {
      te();
      const Fe = E.value;
      if (!Fe) return;
      const $e = () => Re(null, null, function* () {
        if (E.value === Fe && v.value) try {
          const _t = yield NL(Fe);
          if (E.value !== Fe) return;
          if (_t.expiredAt) {
            const je = Date.parse(_t.expiredAt);
            Number.isNaN(je) || ($.value = je, Z());
          }
          _t.status === "paid" ? (ee(), $.value = null, x.value = !0, R.value = !1, te(), z.value || (z.value = !0, b5(Oe.value === "member" ? "membership" : "time_pack"), Hu.success(Be()), yield ne(), yield r(), yield ae(), ge(), ot({
            orderId: Fe
          })), mn()) : _t.status === "expired" && (ee(), R.value = !0, x.value = !1, te(), q.value || (q.value = !0, Bt("expired", {
            orderId: Fe,
            message: "订单已过期"
          })));
        } catch (_t) {}
      });
      $e(), Y = setInterval(() => void $e(), vOe);
    }
    function Wt() {
      return Re(this, null, function* () {
        O.value || (R.value = !1, A.value = !1, yield Qe());
      });
    }
    function mn() {
      v.value = !1, I.value = !1, k.value = !1, M.value = !1, te(), ee();
    }
    function Sr() {
      br(at), br(_e), mn();
    }
    function Vr() {
      ia();
    }
    const ia = (...$e) => Re(null, [...$e], function* (Fe = {}) {
      var jr;
      wn("Member_Recharge_Open", "button", "会员充值弹窗-打开"), v.value = !0, fn(), Oe.value = "member", De.value = "annual", E.value = null, C.value = "", S.value = "", x.value = !1, R.value = !1, A.value = !1, I.value = !1, k.value = !1, M.value = !1, $.value = null, z.value = !1, q.value = !1, te(), ee();
      const _t = l(Fe.payChannel);
      _t && (T.value = _t), yield Fn(), g(Fe);
      const je = (jr = Fe.skuCode) == null ? void 0 : jr.trim();
      if (je) {
        if (f(je)) {
          y.value = je, yield Qe();
          return;
        }
        console.warn("[MemberRechargeDialog] 继续支付未匹配到 SKU:", je, Fe.productType);
        return;
      }
      const Cn = Oe.value === "member" ? ke() : le.value,
        ln = y.value;
      !!(ln && Cn.some(Hr => Hr.id === ln) && !Me(ln)) ? yield Qe() : (y.value = Dt(Oe.value), y.value && (yield Qe()));
    });
    function xr(Fe) {
      return Re(this, null, function* () {
        if (st(Fe.key)) {
          xt();
          return;
        }
        yield $a(Fe.id);
      });
    }
    function $a(Fe) {
      return Re(this, null, function* () {
        br(dn(Fe)), y.value !== Fe && (y.value = Fe, yield Qe());
      });
    }
    function Ua() {
      wn("Home_Member_Popup_Pay_Wechat", "button", "首页（会员购买弹窗）-支付方式-微信支付"), T.value = "wechat";
    }
    function Ia() {
      wn("Home_Member_Popup_Pay_Alipay", "button", "首页（会员购买弹窗）-支付方式-支付宝支付"), T.value = "alipay";
    }
    function $o(Fe) {
      return Re(this, null, function* () {
        Oe.value !== Fe && (Oe.value = Fe, y.value = Dt(Fe), y.value ? yield Qe() : (E.value = null, C.value = "", S.value = "", te(), ee()));
      });
    }
    function na(Fe) {
      return Re(this, null, function* () {
        if (De.value === Fe) return;
        De.value = Fe;
        const $e = Fe === "annual" ? fe.value : he.value;
        y.value = tt($e), y.value ? yield Qe() : (E.value = null, C.value = "", S.value = "", te(), ee());
      });
    }
    function Va() {
      wn("Home_Member_Popup_Period_Year", "tab", "首页（会员购买弹窗）-按年切换"), na("annual");
    }
    function Ht() {
      wn("Home_Member_Popup_Period_Month", "tab", "首页（会员购买弹窗）-按月切换"), na("monthly");
    }
    function nn() {
      wn("Home_Member_Popup_Member_Tab", "tab", "首页（会员购买弹窗）-会员Tab"), wn(Tt.trackId, "show", Tt.elementText), $o("member");
    }
    function Hn() {
      wn("Home_Member_Popup_Pack_Tab", "tab", "首页（会员购买弹窗）-加时包Tab"), wn(Lt.trackId, "show", Lt.elementText), $o("addon");
    }
    function Wn(Fe) {
      const $e = Yt[Fe];
      if ($e && br($e), Fe === "权益对比") {
        fn(), I.value = !0;
        return;
      }
      if (Fe === "常见问题") {
        k.value = !0;
        return;
      }
      Fe === "我的订单" && (M.value = !0);
    }
    function Mr() {
      wn("Home_Benefits_Popup_Close", "button", "首页（权益对比弹窗）-关闭按钮"), I.value = !1;
    }
    function va(Fe) {
      M.value = Fe;
    }
    function Ha(Fe) {
      k.value = Fe;
    }
    function Pe() {
      wn("Home_Benefits_Popup_Diff_Switch", "switch", "首页（权益对比弹窗）-查看差异项开关"), L.value = !L.value;
    }
    function Le(Fe) {
      var $e;
      return ($e = pe[Fe]) != null ? $e : "w-[128px]";
    }
    function Ct(Fe) {
      return {
        backgroundColor: Fe.headerBgColor,
        color: Fe.headerTextColor
      };
    }
    function En(Fe) {
      return {
        backgroundColor: Fe.bodyBgColor,
        color: Fe.bodyTextColor
      };
    }
    function Yn(Fe) {
      return {
        borderColor: Fe.bodyTextColor,
        color: Fe.bodyTextColor
      };
    }
    function Nr(Fe, $e) {
      return Fe[$e];
    }
    function kr(Fe) {
      return Fe.linkEnabled && !!Fe.linkUrl;
    }
    function Or(Fe) {
      if (!kr(Fe)) return;
      const $e = Fe.key === "standard" ? "Home_Benefits_Popup_JD_Store" : "Member_Recharge_Compare_Column_Link",
        _t = Fe.key === "standard" ? "首页（权益对比弹窗）-购卡赠送链接" : `会员版本对比弹窗-${Fe.title}`;
      wn($e, "button", _t), window.open(Fe.linkUrl, "_blank", "noopener,noreferrer");
    }
    function Ja(Fe) {
      return typeof Fe == "boolean" && Fe;
    }
    const Ot = F(() => R.value ? "订单已过期，请重新下单" : re.value && y.value && E.value && !O.value ? re.value : ""),
      Yr = F(() => R.value);
    return Ie(v, Fe => {
      Fe || (te(), ee());
    }), vs(() => {
      te(), ee();
    }), Ie(T, () => Re(null, null, function* () {
      !v.value || !y.value || (yield Qe());
    })), t({
      openDialog: ia
    }), (Fe, $e) => {
      const _t = Vt("el-dialog");
      return D(), V(Ge, null, [Fe.$slots.default ? (D(), V("div", {
        key: 0,
        class: G(["inline-block", c.class]),
        onClick: Vr
      }, [Ae(Fe.$slots, "default", {}, void 0, !0)], 2)) : ce("", !0), W(_t, {
        modelValue: v.value,
        "onUpdate:modelValue": $e[0] || ($e[0] = je => v.value = je),
        width: "850px",
        class: "member-recharge-dialog !rounded-2xl !pt-0 !px-0 !pb-0",
        "append-to-body": !0,
        "show-close": !1,
        "close-on-click-modal": !1,
        "header-class": "!py-0 !px-0 !h-0 !m-0"
      }, {
        header: se(() => [...($e[2] || ($e[2] = []))]),
        default: se(() => [N("div", {
          class: "absolute right-4 top-4 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] transition-colors hover:bg-[rgba(0,0,0,0.06)]",
          onClick: Sr
        }, [W(Aa, {
          class: "w-4 h-4 text-[#262626]"
        })]), N("div", k3e, [N("div", D3e, [$e[3] || ($e[3] = N("div", {
          class: "absolute left-[-36px] top-[88px] h-[492px] w-[492px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.8)_0%,rgba(255,255,255,0)_70%)]"
        }, null, -1)), $e[4] || ($e[4] = N("div", {
          class: "absolute left-[212px] top-[32px] h-[164px] w-[164px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.48)_0%,rgba(255,255,255,0)_72%)]"
        }, null, -1)), N("div", M3e, [N("img", {
          src: b(N3e),
          alt: "",
          class: "member-recharge-dialog__edge-image pointer-events-none absolute inset-0 block h-full w-full select-none object-fill"
        }, null, 8, P3e)])]), N("div", L3e, [N("div", F3e, [$e[5] || ($e[5] = N("h2", {
          class: "text-[16px] font-medium leading-7 text-[#262626]"
        }, "百智WiseNote会员", -1)), N("p", B3e, me(qn.value), 1)]), N("div", $3e, [N("div", {
          role: "tab",
          tabindex: "0",
          "data-track-id": "Home_Member_Popup_Member_Tab",
          "data-custom-element-text": "首页（会员购买弹窗）-会员Tab",
          class: G(["flex h-8 flex-1 cursor-pointer select-none items-center justify-center rounded-[8px] border border-solid px-2 text-[14px] leading-6 outline-none transition-all", Oe.value === "member" ? "border-[#E7E7F2] bg-white font-medium text-[#262626]" : "border-transparent text-[#565656]"]),
          onClick: nn,
          onKeydown: dt(He(nn, ["prevent"]), ["enter"])
        }, " 会员 ", 42, U3e), N("div", {
          role: "tab",
          tabindex: "0",
          "data-track-id": "Home_Member_Popup_Pack_Tab",
          "data-custom-element-text": "首页（会员购买弹窗）-加时包Tab",
          class: G(["flex h-8 flex-1 cursor-pointer select-none items-center justify-center rounded-[8px] border border-solid px-3 text-[14px] leading-6 outline-none transition-all", Oe.value === "addon" ? "border-[#E7E7F2] bg-white font-medium text-[#262626]" : "border-transparent text-[#565656]"]),
          onClick: Hn,
          onKeydown: dt(He(Hn, ["prevent"]), ["enter"])
        }, " 加时包 ", 42, V3e)])]), N("div", {
          class: G(["member-recharge-dialog__plan-panel absolute left-6 top-[102px] z-[1] w-[538px] rounded-[16px] border border-white/50 bg-white/40", Oe.value === "member" ? "h-[458px] overflow-visible" : "h-[458px] overflow-hidden"])
        }, [Oe.value === "member" ? (D(), V("div", H3e, [N("div", {
          role: "tab",
          tabindex: "0",
          "data-track-id": "Home_Member_Popup_Period_Year",
          "data-custom-element-text": "首页（会员购买弹窗）-按年切换",
          class: G(["relative flex h-12 min-w-0 flex-1 cursor-pointer select-none items-center justify-center overflow-visible text-[16px] outline-none transition-colors", De.value === "annual" ? "z-10 text-[#262626]" : "z-[30] text-[#8C8C8C]"]),
          onClick: Va,
          onKeydown: dt(He(Va, ["prevent"]), ["enter"])
        }, [De.value === "annual" ? (D(), V(Ge, {
          key: 0
        }, [$e[6] || ($e[6] = N("div", {
          class: "pointer-events-none absolute inset-x-0 bottom-0 z-0 h-14 rounded-t-[16px] bg-white",
          "aria-hidden": "true"
        }, null, -1)), $e[7] || ($e[7] = N("div", {
          class: "pointer-events-none absolute bottom-0 right-[-20px] z-0 h-5 w-5 bg-white",
          "aria-hidden": "true"
        }, null, -1))], 64)) : (D(), V(Ge, {
          key: 1
        }, [$e[8] || ($e[8] = N("div", {
          class: "pointer-events-none absolute inset-x-0 bottom-0 z-0 h-4 bg-white",
          "aria-hidden": "true"
        }, null, -1)), $e[9] || ($e[9] = N("div", {
          class: "pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-12 rounded-br-[16px] rounded-tl-[16px] bg-[#F3F2FF]",
          "aria-hidden": "true"
        }, null, -1))], 64)), N("span", {
          class: G(["relative z-10 leading-none", De.value === "annual" ? "font-medium" : ""])
        }, " 按年 ", 2)], 42, z3e), N("div", {
          role: "tab",
          tabindex: "0",
          "data-track-id": "Home_Member_Popup_Period_Month",
          "data-custom-element-text": "首页（会员购买弹窗）-按月切换",
          class: G(["relative flex h-12 min-w-0 flex-1 cursor-pointer select-none items-center justify-center overflow-visible text-[16px] outline-none transition-colors", De.value === "monthly" ? "z-10 text-[#262626]" : "z-[30] text-[#8C8C8C]"]),
          onClick: Ht,
          onKeydown: dt(He(Ht, ["prevent"]), ["enter"])
        }, [De.value === "monthly" ? (D(), V(Ge, {
          key: 0
        }, [$e[10] || ($e[10] = N("div", {
          class: "pointer-events-none absolute inset-x-0 bottom-0 z-0 h-14 rounded-t-[16px] bg-white",
          "aria-hidden": "true"
        }, null, -1)), $e[11] || ($e[11] = N("div", {
          class: "pointer-events-none absolute bottom-0 left-[-20px] z-0 h-5 w-5 bg-white",
          "aria-hidden": "true"
        }, null, -1))], 64)) : (D(), V(Ge, {
          key: 1
        }, [$e[12] || ($e[12] = N("div", {
          class: "pointer-events-none absolute inset-x-0 bottom-0 z-0 h-4 bg-white",
          "aria-hidden": "true"
        }, null, -1)), $e[13] || ($e[13] = N("div", {
          class: "pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-12 rounded-bl-[16px] rounded-tr-[16px] bg-[#F3F2FF]",
          "aria-hidden": "true"
        }, null, -1))], 64)), N("span", {
          class: G(["relative z-10 leading-none", De.value === "monthly" ? "font-medium" : ""])
        }, " 按月 ", 2)], 42, G3e)])) : ce("", !0), N("div", {
          class: G(["member-recharge-dialog__plan-content relative flex flex-col overflow-hidden bg-white", Oe.value === "member" ? ["h-[408px] rounded-b-[16px]", De.value === "annual" ? "rounded-tr-[16px]" : "rounded-tl-[16px]"] : "h-[456px] rounded-[16px]"])
        }, [N("div", q3e, [Oe.value === "member" ? (D(), V(Ge, {
          key: 0
        }, [Ce.value && !(De.value === "annual" ? fe.value.length : he.value.length) ? (D(), V("div", Y3e, " 套餐加载中... ")) : sr.value.length ? (D(), V("div", K3e, [(D(!0), V(Ge, null, Et(sr.value, je => {
          var Cn;
          return D(), V("div", {
            key: je.id,
            role: "button",
            tabindex: "0",
            "data-track-id": dn(je.id).trackId,
            "data-custom-element-text": dn(je.id).elementText,
            class: G(["member-recharge-dialog__member-card relative cursor-pointer overflow-hidden rounded-[12px] border outline-none transition-all", je.key === "pro" && y.value === je.id ? "member-recharge-dialog__member-card--pro-selected border-[#FFD472] bg-[linear-gradient(180deg,#FFF6E1_0%,#FFFFFF_100%)]" : je.key === "elite" && y.value === je.id ? "member-recharge-dialog__member-card--elite-selected border-[#FFC193] bg-[linear-gradient(180deg,#FFF4EC_0%,#FFFFFF_100%)]" : je.key === "elite" && ((Cn = sr.value.find(ln => ln.id === y.value)) == null ? void 0 : Cn.key) === "pro" ? "member-recharge-dialog__member-card--elite-pro-selected border-transparent bg-[#FAFAFA]" : y.value === je.id ? je.recommended ? "border-[#165DFF] bg-[#F9FAFF]" : "border-[#165DFF] bg-[#FAFAFA]" : je.recommended ? "border-transparent bg-[#F9FAFF]" : "border-transparent bg-[#FAFAFA]"]),
            onClick: ln => xr(je),
            onKeydown: dt(He(ln => xr(je), ["prevent"]), ["enter"])
          }, [je.recommended || je.key === "pro" && y.value === je.id ? (D(), V("div", Q3e)) : ce("", !0), je.badge && De.value === "annual" ? (D(), V("div", {
            key: 1,
            class: G(["member-recharge-dialog__member-card-badge absolute right-0 top-0 z-[2] rounded-bl-[16px] rounded-tr-[12px] px-3 py-1 text-[12px] leading-5", je.recommended ? "bg-[linear-gradient(107deg,#004EFF_4.74%,#9905D4_97.7%)] text-white" : "bg-[linear-gradient(90deg,#FDCA98_0%,#FCEDC6_100%)] text-[#262626]"])
          }, me(je.badge), 3)) : ce("", !0), N("div", X3e, [N("div", Z3e, [N("div", J3e, [N("div", e6e, me(je.title), 1), N("div", t6e, me(je.description), 1)]), N("div", n6e, [De.value === "annual" ? (D(), V(Ge, {
            key: 0
          }, [N("div", r6e, [$e[14] || ($e[14] = N("span", {
            class: "text-[16px] font-semibold leading-8"
          }, "¥", -1)), N("span", a6e, me(je.displayPrice), 1), N("span", o6e, " / " + me(je.displayPriceUnitLabel), 1)]), N("div", i6e, [je.annualTotalPrice != null ? (D(), V("span", s6e, " ¥" + me(je.annualTotalPrice) + "/年 ", 1)) : ce("", !0), je.originalPrice != null ? (D(), V("span", {
            key: 1,
            class: G(je.annualTotalPrice != null ? "ml-1 line-through" : "line-through")
          }, " 原价¥" + me(je.originalPrice), 3)) : ce("", !0)])], 64)) : (D(), V(Ge, {
            key: 1
          }, [N("div", l6e, [$e[15] || ($e[15] = N("span", {
            class: "text-[16px] font-semibold leading-8"
          }, "¥", -1)), N("span", c6e, me(je.displayPrice), 1), N("span", u6e, " / " + me(je.displayPriceUnitLabel), 1)]), $e[16] || ($e[16] = N("div", {
            class: "h-[18px]",
            "aria-hidden": "true"
          }, null, -1))], 64))])]), N("div", d6e, [$e[17] || ($e[17] = N("div", {
            class: "text-[12px] leading-[18px] text-[#252525]"
          }, "包含功能", -1)), N("div", p6e, [(D(!0), V(Ge, null, Et(je.features, ln => (D(), V("div", {
            key: `${je.key}-${ln.label}`,
            class: "flex items-center gap-[6px]"
          }, [N("div", f6e, [ln.icon === "star" ? (D(), Se(ixe, {
            key: 0,
            class: "member-recharge-dialog__member-feature-star h-3 w-3"
          })) : (D(), Se(nxe, {
            key: 1,
            class: G(["member-recharge-dialog__member-feature-check h-4 w-4", (je.key === "elite" || je.key === "pro") && y.value === je.id && ln.medium ? "text-[#7E4800]" : "text-[#262626]"])
          }, null, 8, ["class"]))]), N("div", {
            class: G(["member-recharge-dialog__member-feature-label text-[12px] leading-5", [ln.highlight ? "bg-[linear-gradient(106deg,#004EFF_4.91%,#9905D4_97.89%)] bg-clip-text text-transparent" : "text-[#252525]", ln.medium ? "font-medium" : "font-normal"]])
          }, me(ln.label), 3)]))), 128))])])])], 42, W3e);
        }), 128))])) : (D(), V("div", j3e, " 暂无可用套餐，请稍后重试 "))], 64)) : (D(), V(Ge, {
          key: 1
        }, [le.value.length ? (D(), V("div", m6e, [N("div", g6e, [(D(!0), V(Ge, null, Et(le.value, je => (D(), V("div", {
          key: je.id,
          role: "button",
          tabindex: "0",
          "data-track-id": dn(je.id).trackId,
          "data-custom-element-text": dn(je.id).elementText,
          class: G(["relative flex h-[180px] cursor-pointer flex-col justify-center rounded-[12px] border px-4 pb-2 pt-[30px] text-left outline-none transition-all", y.value === je.id ? "border-[#165DFF] bg-[linear-gradient(180deg,#F0F5FF_0%,#FAF9FF_100%)]" : "border-black/[0.08] bg-[#FAFAFA]"]),
          onClick: Cn => $a(je.id),
          onKeydown: dt(He(Cn => $a(je.id), ["prevent"]), ["enter"])
        }, [je.tag ? (D(), V("div", h6e, me(je.tag), 1)) : ce("", !0), N("div", v6e, [N("div", b6e, [N("div", y6e, [N("span", E6e, me(je.duration), 1), N("span", S6e, me(je.unit), 1)]), N("div", C6e, me(je.description), 1)]), je.rate ? (D(), V("div", w6e, me(je.rate), 1)) : ce("", !0)]), N("div", T6e, [$e[18] || ($e[18] = N("div", {
          class: "h-px w-full bg-black/[0.05]"
        }, null, -1)), N("div", x6e, [sn(je.priceOriginal, je.price) ? (D(), V("span", O6e, " ¥" + me(je.priceOriginal), 1)) : ce("", !0), N("span", {
          class: G(["text-[16px] font-medium leading-7", y.value === je.id ? "text-[#165DFF]" : "text-[#262626]"])
        }, " ¥" + me(je.price), 3)])])], 42, _6e))), 128))]), N("div", R6e, [(D(!0), V(Ge, null, Et(we.value, je => (D(), V("div", {
          key: je,
          class: "text-[12px] leading-[18px] text-[#8C8C8C]"
        }, me(je), 1))), 128))])])) : (D(), V("div", A6e, " 暂无可用加时包，请稍后重试 "))], 64))]), N("div", I6e, [(D(!0), V(Ge, null, Et(it.value, (je, Cn) => {
          var ln, Pn;
          return D(), V(Ge, {
            key: je
          }, [N("span", {
            role: "button",
            tabindex: "0",
            "data-track-id": (ln = Yt[je]) == null ? void 0 : ln.trackId,
            "data-custom-element-text": (Pn = Yt[je]) == null ? void 0 : Pn.elementText,
            class: "cursor-pointer select-none whitespace-nowrap outline-none transition-colors hover:text-[#262626]",
            onClick: jr => Wn(je),
            onKeydown: dt(He(jr => Wn(je), ["prevent"]), ["enter"])
          }, me(je), 41, N6e), Cn < it.value.length - 1 ? (D(), V("span", k6e)) : ce("", !0)], 64);
        }), 128))])], 2)], 2), N("div", D6e, [N("div", M6e, [y.value ? (D(), V(Ge, {
          key: 0
        }, [N("div", {
          class: G(["flex w-full flex-col items-center", Yr.value ? "gap-0" : "gap-2"])
        }, [N("div", P6e, " ¥" + me(Ft().price), 1), !Yr.value && sn(Ft().priceOriginal, Ft().price) ? (D(), V("div", L6e, [N("span", F6e, "¥" + me(Ft().priceOriginal), 1), N("span", B6e, " 已优惠 ¥" + me(Gn(Ft().priceOriginal, Ft().price)), 1)])) : ce("", !0)], 2), N("div", $6e, [N("div", {
          role: "button",
          tabindex: "0",
          "data-track-id": "Home_Member_Popup_Pay_Wechat",
          "data-custom-element-text": "首页（会员购买弹窗）-支付方式-微信支付",
          class: G(["flex h-8 flex-1 cursor-pointer select-none items-center justify-center gap-1 rounded-[8px] border text-[14px] font-medium leading-6 outline-none transition-all", T.value === "wechat" ? "border-black/[0.05] bg-white text-[#262626]" : "border-transparent bg-transparent text-[#565656]"]),
          onClick: Ua,
          onKeydown: dt(He(Ua, ["prevent"]), ["enter"])
        }, [W(FL, {
          class: "h-4 w-4"
        }), $e[19] || ($e[19] = bt(" 微信 ", -1))], 42, U6e), N("div", {
          role: "button",
          tabindex: "0",
          "data-track-id": "Home_Member_Popup_Pay_Alipay",
          "data-custom-element-text": "首页（会员购买弹窗）-支付方式-支付宝支付",
          class: G(["flex h-8 flex-1 cursor-pointer select-none items-center justify-center gap-1 rounded-[8px] border text-[14px] leading-6 outline-none transition-all", T.value === "alipay" ? "border-black/[0.05] bg-white font-medium text-[#262626]" : "border-transparent bg-transparent text-[#565656]"]),
          onClick: Ia,
          onKeydown: dt(He(Ia, ["prevent"]), ["enter"])
        }, [W(LL, {
          class: "h-4 w-4"
        }), $e[20] || ($e[20] = bt(" 支付宝 ", -1))], 42, V6e)]), N("div", H6e, [N("div", z6e, [C.value ? (D(), V("img", {
          key: 0,
          src: C.value,
          alt: "支付二维码",
          class: "h-[128px] w-[128px] object-contain"
        }, null, 8, G6e)) : S.value ? (D(), V("iframe", {
          key: 1,
          ref_key: "alipayIframeRef",
          ref: w,
          class: "block h-[128px] w-[128px] max-h-[128px] max-w-[128px] shrink-0 overflow-hidden border-0 bg-white",
          title: "支付宝支付",
          scrolling: "no",
          sandbox: "allow-forms allow-scripts allow-same-origin allow-popups",
          referrerpolicy: "no-referrer",
          srcdoc: S.value,
          onLoad: _n
        }, null, 40, q6e)) : ce("", !0), (C.value || S.value) && x.value ? (D(), V("div", Y6e, [...($e[21] || ($e[21] = [N("span", {
          class: "text-[20px] font-semibold text-white"
        }, "支付完成", -1)]))])) : (C.value || S.value) && R.value ? (D(), V("div", j6e, [N("div", K6e, [$e[22] || ($e[22] = N("div", {
          class: "flex flex-col items-center text-[12px] leading-[18px] text-[#262626]"
        }, [N("span", {
          class: "whitespace-nowrap"
        }, "二维码失效"), N("span", {
          class: "whitespace-nowrap"
        }, "请点击刷新")], -1)), N("span", {
          role: "button",
          tabindex: "0",
          class: G(["inline-flex border-none bg-transparent outline-none", O.value ? "pointer-events-none cursor-not-allowed opacity-40" : "cursor-pointer"]),
          onClick: He(Wt, ["stop"]),
          onKeydown: dt(He(Wt, ["prevent"]), ["enter"])
        }, [W(ev, {
          class: "h-4 w-4 flex-shrink-0 text-[#262626]"
        })], 42, W6e)])])) : A.value && !C.value && !S.value && !O.value ? (D(), V("div", Q6e, [N("div", X6e, [$e[23] || ($e[23] = N("div", {
          class: "flex flex-col items-center text-[12px] leading-[18px] text-[#262626]"
        }, [N("span", {
          class: "whitespace-nowrap"
        }, "获取支付码失败"), N("span", {
          class: "whitespace-nowrap"
        }, "请点击刷新")], -1)), N("span", {
          role: "button",
          tabindex: "0",
          class: G(["inline-flex border-none bg-transparent outline-none", O.value ? "pointer-events-none cursor-not-allowed opacity-40" : "cursor-pointer"]),
          onClick: He(Wt, ["stop"]),
          onKeydown: dt(He(Wt, ["prevent"]), ["enter"])
        }, [W(ev, {
          class: "h-4 w-4 flex-shrink-0 text-[#262626]"
        })], 42, Z6e)])])) : O.value ? (D(), V("div", J6e, " 加载中... ")) : ce("", !0)])]), N("div", eOe, [N("span", {
          class: G(Ot.value ? "visible" : "invisible")
        }, me(Ot.value || " "), 3)]), $e[26] || ($e[26] = N("div", {
          class: "text-center text-[12px] font-medium leading-[18px] text-[#7E4800]"
        }, " 支付成功后，权益立即到账 ", -1)), N("div", tOe, [$e[25] || ($e[25] = bt(" 付费即表示同意 ", -1)), W(TTe, null, {
          default: se(() => [...($e[24] || ($e[24] = [N("span", {
            class: "cursor-pointer text-[#165DFF]"
          }, " 《百融百智会员服务协议》 ", -1)]))]),
          _: 1
        })])], 64)) : (D(), V("div", nOe, " 请先选择套餐 "))])])])]),
        _: 1
      }, 8, ["modelValue"]), W(s3e, {
        "model-value": M.value,
        "onUpdate:modelValue": va
      }, null, 8, ["model-value"]), W(Sxe, {
        "model-value": k.value,
        "onUpdate:modelValue": Ha
      }, null, 8, ["model-value"]), W(_t, {
        modelValue: I.value,
        "onUpdate:modelValue": $e[1] || ($e[1] = je => I.value = je),
        width: "700px",
        class: "member-compare-dialog !rounded-2xl !p-0",
        "append-to-body": !0,
        "show-close": !1,
        "close-on-click-modal": !1,
        "header-class": "!hidden"
      }, {
        default: se(() => [N("div", rOe, [N("div", aOe, [N("div", oOe, [$e[28] || ($e[28] = N("h3", {
          class: "text-[16px] font-medium leading-7 text-[#262626]"
        }, " 各版本功能对比 ", -1)), N("div", iOe, [$e[27] || ($e[27] = N("span", {
          class: "text-[12px] leading-[18px] text-[#8C8C8C]"
        }, " 查看差异项 ", -1)), N("div", {
          role: "switch",
          tabindex: "0",
          "data-track-id": "Home_Benefits_Popup_Diff_Switch",
          "data-custom-element-text": "首页（权益对比弹窗）-查看差异项开关",
          "aria-checked": L.value,
          class: G(["relative flex h-4 w-7 cursor-pointer items-center rounded-[24px] outline-none transition-colors", L.value ? "bg-[#165DFF]" : "bg-[#DADBE2]"]),
          onClick: Pe,
          onKeydown: [dt(He(Pe, ["prevent"]), ["enter"]), dt(He(Pe, ["prevent"]), ["space"])]
        }, [N("span", {
          class: G(["absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-[0_0.75px_2.25px_0_rgba(0,0,0,0.1)] transition-all", L.value ? "left-[14px]" : "left-[2px]"])
        }, null, 2)], 42, sOe)])]), N("div", {
          class: "flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] transition-colors hover:bg-[rgba(0,0,0,0.06)]",
          onClick: Mr
        }, [W(Aa, {
          class: "h-4 w-4 text-[#262626]"
        })])]), N("div", lOe, [N("div", cOe, [B.value ? (D(), V("div", uOe, " 权益对比加载中... ")) : qt.value.length ? (D(), V("div", pOe, [N("div", fOe, [$e[29] || ($e[29] = N("div", {
          class: "sticky top-0 z-[2] bg-[#F1F2F6] px-5 py-[13px] text-[12px] font-medium leading-[18px] text-[#727272]"
        }, " 权益项 ", -1)), N("div", mOe, [(D(!0), V(Ge, null, Et(qt.value, je => (D(), V("div", {
          key: `label-${je.label}`,
          class: "whitespace-nowrap"
        }, me(je.label), 1))), 128))])]), (D(!0), V(Ge, null, Et(ze.value, je => (D(), V("div", {
          key: je.key,
          class: G(["shrink-0", Le(je.key)])
        }, [N("div", {
          class: "sticky top-0 z-[2] px-3 py-[13px] text-center text-[12px] font-medium leading-[18px]",
          style: mt(Ct(je))
        }, [kr(je) ? (D(), V("div", {
          key: 0,
          role: "link",
          tabindex: "0",
          "data-track-id": je.key === "standard" ? "Home_Benefits_Popup_JD_Store" : void 0,
          "data-custom-element-text": je.key === "standard" ? "首页（权益对比弹窗）-购卡赠送链接" : void 0,
          class: "cursor-pointer underline underline-offset-[1px]",
          onClick: Cn => Or(je),
          onKeydown: [dt(He(Cn => Or(je), ["prevent"]), ["enter"]), dt(He(Cn => Or(je), ["prevent"]), ["space"])]
        }, me(je.title), 41, gOe)) : (D(), V("span", _Oe, me(je.title), 1))], 4), N("div", {
          class: "flex flex-col items-center gap-5 px-3 py-[13px] text-[12px] leading-[18px]",
          style: mt(En(je))
        }, [(D(!0), V(Ge, null, Et(qt.value, Cn => (D(), V("div", {
          key: `${je.key}-${Cn.label}`,
          class: "flex min-h-[18px] items-center justify-center whitespace-nowrap"
        }, [Ja(Nr(Cn, je.key)) ? (D(), V("div", {
          key: 0,
          class: "flex h-[18px] w-[18px] items-center justify-center rounded-full border",
          style: mt(Yn(je))
        }, [W(yP, {
          class: "h-3 w-3"
        })], 4)) : (D(), V("span", hOe, me(Nr(Cn, je.key)), 1))]))), 128))], 4)], 2))), 128))])) : (D(), V("div", dOe, " 暂无权益对比数据 "))])])])]),
        _: 1
      }, 8, ["modelValue"])], 64);
    };
  }
})