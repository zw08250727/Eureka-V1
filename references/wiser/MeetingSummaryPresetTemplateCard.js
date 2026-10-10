O8e = ie({
  __name: "MeetingSummaryPresetTemplateCard",
  props: {
    template: {},
    selected: {
      type: Boolean
    },
    showDefaultControl: {
      type: Boolean,
      default: !1
    },
    isDefaultTemplate: {
      type: Boolean,
      default: !1
    },
    disabled: {
      type: Boolean,
      default: !1
    },
    statusLabel: {
      default: ""
    },
    fallbackMagicStick: {
      type: Boolean,
      default: !1
    }
  },
  emits: ["pick", "preview", "setAsDefault"],
  setup(e, {
    emit: t
  }) {
    const n = e,
      r = t,
      a = F(() => n.showDefaultControl && n.isDefaultTemplate),
      s = F(() => !n.disabled && n.showDefaultControl && (!n.isDefaultTemplate || n.selected)),
      c = F(() => n.isDefaultTemplate ? "已默认" : "默认模版");
    function l() {
      n.disabled || r("pick", n.template);
    }
    function u(g) {
      (g.key === "Enter" || g.key === " ") && (g.preventDefault(), l());
    }
    function i(g) {
      g.preventDefault(), g.stopPropagation(), !n.disabled && r("preview", n.template);
    }
    function d(g) {
      g.preventDefault(), g.stopPropagation(), !(n.disabled || n.isDefaultTemplate) && r("setAsDefault", n.template);
    }
    function p(g) {
      (g.key === "Enter" || g.key === " ") && d(g);
    }
    return (g, f) => {
      const _ = Vt("el-icon");
      return D(), V("div", {
        role: "button",
        tabindex: g.disabled ? -1 : 0,
        class: G(["group msd-card relative flex h-[122px] w-full flex-col items-stretch justify-start overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-[#165dff] focus-visible:ring-offset-2", {
          "is-selected": g.selected,
          "msd-card--smart-match": b(yl)(g.template),
          "is-disabled": g.disabled
        }]),
        "aria-pressed": g.selected,
        "aria-disabled": g.disabled,
        onClick: l,
        onKeydown: u
      }, [N("span", {
        class: G(["absolute right-2 top-2 z-[4] flex size-[20px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] bg-transparent text-[#bfbfbf] hover:bg-[#0000000D] hover:text-[#165dff]", {
          "pointer-events-none cursor-default": g.disabled
        }]),
        role: "button",
        tabindex: g.disabled ? -1 : 0,
        "aria-disabled": g.disabled,
        onClick: He(i, ["stop", "prevent"]),
        onKeydown: dt(He(i, ["prevent"]), ["enter"])
      }, [W(sv)], 42, g8e), N("div", _8e, [N("div", h8e, [W(lv, {
        template: g.template,
        "fallback-magic-stick": g.fallbackMagicStick
      }, null, 8, ["template", "fallback-magic-stick"])]), N("div", v8e, [N("div", b8e, me(g.template.name), 1), a.value ? (D(), V("span", y8e, " 默认模板 ")) : ce("", !0)]), N("p", E8e, me(b(dF)(g.template)), 1), g.statusLabel ? (D(), V("div", S8e, [N("span", {
        class: G(["shrink-0 rounded-[3px] px-1.5 text-xs leading-5", g.statusLabel === "已下架" ? "bg-[#fff2f0] text-[#f53f3f]" : "bg-[#f3f7ff] text-[#165dff]"])
      }, me(g.statusLabel), 3)])) : ce("", !0)]), s.value ? (D(), V("span", C8e)) : ce("", !0), s.value ? (D(), V("span", {
        key: 1,
        class: G(["msd-card-default-action absolute bottom-3 z-[9] flex h-6 items-center justify-center gap-1 rounded px-2 text-xs leading-[18px] text-white transition-opacity duration-150", g.isDefaultTemplate ? "pointer-events-none cursor-default bg-[#adc6ff] opacity-0 group-focus-within:opacity-100 group-hover:opacity-100" : "cursor-pointer bg-[#165dff] opacity-0 hover:bg-[#3975FF] group-focus-within:opacity-100 group-hover:opacity-100"]),
        style: {
          left: "50%",
          width: "84px",
          transform: "translateX(-50%)"
        },
        role: "button",
        tabindex: g.isDefaultTemplate ? -1 : 0,
        "aria-disabled": g.isDefaultTemplate,
        onClick: He(d, ["stop", "prevent"]),
        onKeydown: p
      }, [W(_, {
        size: 16,
        class: "!text-white"
      }, {
        default: se(() => [W(b(Nm))]),
        _: 1
      }), N("span", T8e, me(c.value), 1)], 42, w8e)) : ce("", !0), g.selected ? (D(), V("span", x8e, [W(_, {
        size: 14,
        class: "!text-white"
      }, {
        default: se(() => [W(b(EP))]),
        _: 1
      })])) : ce("", !0)], 42, m8e);
    };
  }
})