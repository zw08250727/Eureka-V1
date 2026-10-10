i3e = ie({
  name: "MemberOrderListDialog",
  __name: "MemberOrderListDialog",
  props: {
    modelValue: {
      type: Boolean
    }
  },
  emits: ["update:modelValue"],
  setup(e, {
    emit: t
  }) {
    const n = e,
      r = t,
      a = H("all"),
      s = H(!1),
      c = H(!1),
      l = H([]),
      u = H(!1),
      i = H(!1),
      d = H(1),
      p = H(0),
      g = H(null);
    let f = 0;
    const _ = [{
        key: "all",
        label: "全部"
      }, {
        key: "paid",
        label: "已支付"
      }, {
        key: "cancelled",
        label: "已取消"
      }, {
        key: "refunded",
        label: "已退款"
      }],
      h = {
        all: {
          trackId: "Home_Order_Popup_Tab_All",
          elementText: "首页（订单列表弹窗）-全部Tab"
        },
        paid: {
          trackId: "Home_Order_Popup_Tab_Paid",
          elementText: "首页（订单列表弹窗）-已支付Tab"
        },
        cancelled: {
          trackId: "Home_Order_Popup_Tab_Cancel",
          elementText: "首页（订单列表弹窗）-已取消Tab"
        },
        refunded: {
          trackId: "Home_Order_Popup_Tab_Refund",
          elementText: "首页（订单列表弹窗）-已退款Tab"
        }
      },
      v = F(() => _.filter(q => q.key !== "refunded" || c.value)),
      y = F(() => v.value.length === 4 ? "w-[481px]" : "w-[361px]"),
      E = F(() => l.value.length < p.value);
    function C(q) {
      var K, j, Q, re, te, Z;
      const Y = q.orderSource === "ADMIN_GRANT";
      return {
        id: String((j = (K = q.id) != null ? K : q.orderNo) != null ? j : ""),
        name: ((Q = q.skuName) == null ? void 0 : Q.trim()) || ((re = q.skuTypeZh) == null ? void 0 : re.trim()) || ((te = q.skuCode) == null ? void 0 : te.trim()) || "-",
        orderNo: ((Z = q.orderNo) == null ? void 0 : Z.trim()) || "-",
        orderTime: Mxe(q.createTime || q.createdAt, "YYYY-MM-DD HH:mm:ss") || "-",
        amount: T(q.orderAmount),
        status: S(q.orderStatus),
        statusText: Y ? "平台赠送" : w(q.orderStatus, q.orderStatusName),
        isAdminGrant: Y
      };
    }
    function S(q) {
      const Y = String(q || "").trim().toUpperCase();
      return Y === "PENDING" ? "pending" : Y === "PAID" ? "paid" : Y === "REFUNDED" ? "refunded" : "cancelled";
    }
    function w(q, Y) {
      if (Y != null && Y.trim()) return Y.trim();
      const K = S(q);
      return K === "pending" ? "待支付" : K === "paid" ? "已支付" : K === "refunded" ? "已退款" : "已取消";
    }
    function T(q) {
      const Y = Number(q);
      return Number.isFinite(Y) ? Number.isInteger(Y) ? `¥${Y}` : `¥${Y.toFixed(2)}` : "¥-";
    }
    function O(q) {
      if (q === "paid") return "PAID";
      if (q === "cancelled") return "CANCELLED";
      if (q === "refunded") return "REFUNDED";
    }
    function x() {
      l.value = [], d.value = 1, p.value = 0, i.value = !1;
    }
    function R() {
      return Re(this, null, function* () {
        var q, Y;
        try {
          const K = yield nN({
              status: "REFUNDED",
              current: 1,
              size: 1
            }),
            j = Number((Y = (q = K == null ? void 0 : K.data) == null ? void 0 : q.total) != null ? Y : 0);
          c.value = j > 0;
        } catch (K) {
          c.value = !1, console.error("[MemberOrderListDialog] 检查退款订单失败:", K);
        }
      });
    }
    function A(q = !1) {
      return Re(this, null, function* () {
        var K, j, Q;
        if (u.value) return;
        u.value = !0;
        const Y = ++f;
        try {
          const re = {
              status: O(a.value),
              current: d.value,
              size: o3e
            },
            te = yield nN(re);
          if (Y !== f) return;
          const ee = (Array.isArray((K = te == null ? void 0 : te.data) == null ? void 0 : K.records) ? te.data.records : []).map(C);
          p.value = Number((Q = (j = te == null ? void 0 : te.data) == null ? void 0 : j.total) != null ? Q : 0), l.value = q ? [...l.value, ...ee] : ee, i.value = !0;
        } catch (re) {
          if (Y !== f) return;
          q || (l.value = [], p.value = 0, i.value = !0), Pt.error("订单列表加载失败，请重试"), console.error("[MemberOrderListDialog] 加载订单列表失败:", re);
        } finally {
          Y === f && (u.value = !1);
        }
      });
    }
    function I() {
      return Re(this, null, function* () {
        var q;
        x(), (q = g.value) == null || q.scrollTo({
          top: 0,
          behavior: "auto"
        }), yield A(!1);
      });
    }
    function k() {
      return Re(this, null, function* () {
        u.value || !E.value || (d.value += 1, yield A(!0));
      });
    }
    function M(q) {
      const Y = q.target;
      !Y || u.value || !E.value || Y.scrollHeight - Y.scrollTop - Y.clientHeight > 48 || k();
    }
    Ie(() => n.modelValue, q => {
      if (q) {
        a.value = "all", s.value = !1, Re(null, null, function* () {
          yield Promise.all([R(), I()]);
        });
        return;
      }
      s.value = !1, c.value = !1, f += 1, u.value = !1, x();
    });
    function L(q) {
      r("update:modelValue", q);
    }
    function U() {
      wn("Home_Order_Popup_Close", "button", "首页（订单列表弹窗）-关闭按钮"), s.value = !1, L(!1);
    }
    function B() {
      wn("Home_Order_Popup_Invoice", "button", "首页（订单列表弹窗）-开发票按钮"), s.value = !0;
    }
    function $(q) {
      const Y = h[q];
      wn(Y.trackId, "tab", Y.elementText), a.value !== q && (a.value = q, I());
    }
    function P(q) {
      return q === "pending" ? "text-[#FA8C16]" : q === "paid" ? "text-[#262626]" : "text-[#BFBFBF]";
    }
    function z(q) {
      s.value = q;
    }
    return (q, Y) => (D(), V(Ge, null, [W(b(Ei), {
      "model-value": n.modelValue,
      width: "640px",
      "append-to-body": !0,
      "show-close": !1,
      "close-on-click-modal": !1,
      "header-class": "!hidden",
      class: "member-order-list-dialog !rounded-2xl !p-0",
      "onUpdate:modelValue": L
    }, {
      default: se(() => [N("div", Pxe, [N("div", Lxe, [N("div", Fxe, [Y[0] || (Y[0] = N("h3", {
        class: "flex-1 text-[16px] leading-7 font-medium text-black"
      }, " 订单列表 ", -1)), N("div", {
        role: "button",
        tabindex: "0",
        "data-track-id": "Home_Order_Popup_Invoice",
        "data-custom-element-text": "首页（订单列表弹窗）-开发票按钮",
        class: "flex h-6 cursor-pointer select-none items-center justify-center rounded-[4px] border border-black/[0.08] bg-white px-2 text-[12px] leading-4 text-[#262626] outline-none transition-colors hover:bg-[#F7F7F7]",
        onClick: B,
        onKeydown: dt(He(B, ["prevent"]), ["enter"])
      }, " 开发票 ", 40, Bxe), N("div", {
        role: "button",
        tabindex: "0",
        class: "ml-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] outline-none transition-colors hover:bg-[#F2F3F5]",
        onClick: U,
        onKeydown: dt(He(U, ["prevent"]), ["enter"])
      }, [W(Aa, {
        class: "h-4 w-4 text-[#262626]"
      })], 40, $xe)])]), N("div", Uxe, [N("div", {
        class: G(["member-order-list-dialog__tabs mt-4 flex items-center gap-[3px] overflow-hidden rounded-[8px] bg-[#F7F7F7] p-[3px]", y.value])
      }, [(D(!0), V(Ge, null, Et(v.value, K => (D(), V("div", {
        key: K.key,
        role: "button",
        tabindex: "0",
        class: G(["flex h-8 flex-1 cursor-pointer select-none items-center justify-center rounded-[6px] px-3 text-[14px] leading-6 outline-none transition-all", a.value === K.key ? "bg-white font-medium text-black" : "bg-transparent font-normal text-[#565656]"]),
        onClick: j => $(K.key),
        onKeydown: dt(He(j => $(K.key), ["prevent"]), ["enter"])
      }, me(K.label), 43, Vxe))), 128))], 2)]), N("div", Hxe, [N("div", {
        ref_key: "orderListScrollRef",
        ref: g,
        class: "member-order-list-dialog__scroll pure-scrollbar min-h-0 flex-1 overflow-y-auto",
        onScroll: M
      }, [l.value.length ? (D(!0), V(Ge, {
        key: 0
      }, Et(l.value, (K, j) => (D(), V("div", {
        key: K.id
      }, [N("div", zxe, [N("div", Gxe, [N("div", qxe, [N("div", Yxe, me(K.name), 1), K.isAdminGrant ? ce("", !0) : (D(), V("div", jxe, [Y[1] || (Y[1] = N("span", {
        class: "text-[#8C8C8C]"
      }, "订单编号：", -1)), N("span", Kxe, me(K.orderNo), 1)])), N("div", Wxe, [N("span", Qxe, me(K.isAdminGrant ? "赠送时间：" : "订单时间："), 1), N("span", Xxe, me(K.orderTime), 1)]), K.isAdminGrant ? ce("", !0) : (D(), V("div", Zxe, [Y[2] || (Y[2] = N("span", {
        class: "text-[#8C8C8C]"
      }, "支付金额：", -1)), N("span", Jxe, me(K.amount), 1)]))])]), N("div", e3e, [N("div", {
        class: G(["flex h-8 w-[88px] items-center justify-center rounded-[44px] px-3 text-[14px] leading-6", P(K.status)])
      }, me(K.statusText), 3)])]), j < l.value.length - 1 ? (D(), V("div", t3e)) : ce("", !0)]))), 128)) : u.value && !i.value ? (D(), V("div", n3e, " 加载中... ")) : (D(), V("div", r3e, " 暂无订单 ")), l.value.length && u.value ? (D(), V("div", a3e, " 加载中... ")) : ce("", !0)], 544)])])]),
      _: 1
    }, 8, ["model-value"]), W(Dxe, {
      "model-value": s.value,
      "onUpdate:modelValue": z
    }, null, 8, ["model-value"])], 64));
  }
})