Exe = ie({
  name: "MemberFaqDialog",
  __name: "MemberFaqDialog",
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
      a = H([]),
      s = H(!1);
    function c() {
      return Re(this, null, function* () {
        s.value = !0;
        try {
          a.value = yield Hwe();
        } catch (i) {
          console.error("[MemberFaqDialog] 获取常见问题失败:", i), a.value = [];
        } finally {
          s.value = !1;
        }
      });
    }
    function l(i) {
      r("update:modelValue", i);
    }
    function u() {
      wn("Home_FAQ_Popup_Close", "button", "首页（常见问题弹窗）-关闭按钮"), l(!1);
    }
    return Ie(() => n.modelValue, i => {
      i && c();
    }), (i, d) => (D(), Se(b(Ei), {
      "model-value": n.modelValue,
      width: "672px",
      top: "24px",
      "append-to-body": !0,
      "show-close": !1,
      "close-on-click-modal": !1,
      "header-class": "!hidden",
      class: "member-faq-dialog !rounded-2xl !p-0",
      "onUpdate:modelValue": l
    }, {
      default: se(() => [N("div", sxe, [N("div", lxe, [N("div", cxe, [d[0] || (d[0] = N("p", {
        class: "shrink-0 text-[16px] leading-7 font-medium text-black"
      }, " 常见问题 ", -1)), N("div", {
        role: "button",
        tabindex: "0",
        class: "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] outline-none transition-colors hover:bg-[#F2F3F5]",
        onClick: u,
        onKeydown: dt(He(u, ["prevent"]), ["enter"])
      }, [W(Aa, {
        class: "h-4 w-4 text-[#262626]"
      })], 40, uxe)])]), N("div", dxe, [N("div", pxe, [s.value ? (D(), V("div", fxe, " 常见问题加载中... ")) : a.value.length ? (D(), V("div", gxe, [(D(!0), V(Ge, null, Et(a.value, p => {
        var g;
        return D(), V("div", {
          key: p.title,
          class: "flex w-full shrink-0 flex-col items-start justify-center gap-[10px] rounded-[12px] bg-black/[0.03] p-4"
        }, [N("p", _xe, me(p.title), 1), N("div", hxe, [(D(!0), V(Ge, null, Et(p.paragraphs, f => (D(), V("p", {
          key: f,
          class: "whitespace-pre-wrap break-words"
        }, me(f), 1))), 128)), (g = p.bulletItems) != null && g.length ? (D(), V("div", vxe, [(D(!0), V(Ge, null, Et(p.bulletItems, (f, _) => (D(), V("div", {
          key: `${p.title}-${_}`,
          class: "flex items-start gap-2"
        }, [d[1] || (d[1] = N("span", {
          class: "mt-[10px] h-1 w-1 shrink-0 rounded-full bg-[#262626]"
        }, null, -1)), N("span", bxe, [f.label ? (D(), V("span", yxe, me(f.label), 1)) : ce("", !0), N("span", null, me(f.text), 1)])]))), 128))])) : ce("", !0)])]);
      }), 128))])) : (D(), V("div", mxe, " 暂无常见问题数据 "))])])])]),
      _: 1
    }, 8, ["model-value"]));
  }
})