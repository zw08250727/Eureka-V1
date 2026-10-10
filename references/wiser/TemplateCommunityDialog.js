r8e = ie({
  name: "TemplateCommunityDialog",
  __name: "index",
  props: {
    visible: {
      type: Boolean,
      required: !0
    },
    visibleModifiers: {}
  },
  emits: Ou(["closed"], ["update:visible"]),
  setup(e, {
    emit: t
  }) {
    const n = Kf(e, "visible"),
      r = H(!1),
      a = t,
      s = () => {
        r.value = !1, n.value = !1;
      },
      c = () => {
        r.value = !1, a("closed");
      };
    return (l, u) => {
      const i = Vt("el-dialog");
      return D(), Se(i, {
        modelValue: n.value,
        "onUpdate:modelValue": u[1] || (u[1] = d => n.value = d),
        width: "747px",
        "destroy-on-close": "",
        class: "template-community-dialog !rounded-2xl !p-0",
        "append-to-body": !0,
        "show-close": !1,
        "header-class": "!m-0 !h-0 !p-0",
        onClosed: c
      }, {
        header: se(() => [...(u[2] || (u[2] = []))]),
        default: se(() => [r.value ? ce("", !0) : (D(), V("div", e8e, [u[3] || (u[3] = N("div", {
          class: "min-w-0 pr-12"
        }, [N("h2", {
          class: "m-0 text-base font-medium leading-6 text-[#262626]"
        }, " 模版社区 "), N("p", {
          class: "mt-1 text-sm leading-[22px] text-[#8c8c8c]"
        }, " 探索优质模版，收藏后可在「我的模版」中快速使用 ")], -1)), N("div", {
          class: "absolute right-6 top-[18px] flex h-8 w-8 cursor-pointer items-center justify-center rounded-[4px] transition-colors hover:bg-[#F2F3F5]",
          role: "button",
          tabindex: "0",
          "aria-label": "关闭模版社区弹窗",
          onClick: s,
          onKeydown: [dt(s, ["enter"]), dt(He(s, ["prevent"]), ["space"])]
        }, [W(Aa, {
          class: "h-4 w-4 text-[#262626]"
        })], 40, t8e)])), N("div", n8e, [W(J4e, {
          class: "min-h-0 min-w-0 flex-1",
          embedded: "",
          onClose: s,
          onPreviewing: u[0] || (u[0] = d => r.value = d)
        })])]),
        _: 1
      }, 8, ["modelValue"]);
    };
  }
})