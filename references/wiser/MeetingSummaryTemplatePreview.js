FNe = ie({
  __name: "MeetingSummaryTemplatePreview",
  props: Ou({
    title: {},
    previewContent: {},
    showLanguageSwitch: {
      type: Boolean,
      default: !0
    },
    allowHtml: {
      type: Boolean,
      default: !0
    }
  }, {
    language: {
      required: !0
    },
    languageModifiers: {}
  }),
  emits: Ou(["back"], ["update:language"]),
  setup(e, {
    emit: t
  }) {
    const n = e,
      r = Kf(e, "language"),
      a = t,
      s = F(() => {
        var c, l;
        return (l = (c = n.previewContent) == null ? void 0 : c.detailMarkdown) != null ? l : "";
      });
    return (c, l) => (D(), V("div", bNe, [N("header", yNe, [N("div", ENe, [N("div", SNe, [N("button", {
      type: "button",
      class: "inline-flex !h-8 min-w-[76px] shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[6px] border border-[#00000014] !bg-white !px-3 text-sm font-normal leading-6 text-[#262626] hover:!border-[#bfbfbf] hover:!bg-[#fafafa]",
      onClick: l[0] || (l[0] = u => a("back"))
    }, [W(vNe, {
      size: 16,
      color: "#262626",
      class: "shrink-0"
    }), l[3] || (l[3] = N("span", {
      class: "shrink-0 whitespace-nowrap"
    }, "返回", -1))]), N("h2", {
      class: G(["m-0 truncate text-base font-medium leading-7 text-[#262626]", c.$slots.actions ? "w-[330px]" : "w-[512px]"])
    }, me(c.title), 3)]), c.$slots.actions ? (D(), V("div", CNe, [Ae(c.$slots, "actions", {}, void 0, !0)])) : c.showLanguageSwitch ? (D(), V("div", wNe, [N("button", {
      type: "button",
      class: G(["flex !h-8 w-[52px] cursor-pointer items-center justify-center !border-0 !px-0 text-sm font-normal leading-6 text-[#262626]", r.value === "zh" ? "!bg-[#165dff] !text-white" : "!bg-transparent"]),
      onClick: l[1] || (l[1] = u => r.value = "zh")
    }, [...(l[4] || (l[4] = [N("span", {
      class: "shrink-0 whitespace-nowrap"
    }, "中文", -1)]))], 2), N("button", {
      type: "button",
      class: G(["flex !h-8 w-[43px] cursor-pointer items-center justify-center !border-0 !px-0 text-sm font-normal leading-6 text-[#262626]", r.value === "en" ? "!bg-[#165dff] !text-white" : "!bg-transparent"]),
      onClick: l[2] || (l[2] = u => r.value = "en")
    }, [...(l[5] || (l[5] = [N("span", {
      class: "shrink-0 whitespace-nowrap"
    }, "EN", -1)]))], 2)])) : ce("", !0)])]), N("div", TNe, [c.previewContent ? (D(), V("section", xNe, [N("div", ONe, [N("div", RNe, [c.previewContent.heroIconUrl ? (D(), V("img", {
      key: 0,
      src: c.previewContent.heroIconUrl,
      class: "size-7 shrink-0 object-contain",
      alt: ""
    }, null, 8, ANe)) : c.previewContent.heroEmoji ? (D(), V("span", INe, me(c.previewContent.heroEmoji), 1)) : ce("", !0), N("h3", NNe, me(c.previewContent.headerName), 1)]), N("p", kNe, me(c.previewContent.heroDescription), 1), c.$slots.metadata ? (D(), V("div", DNe, [Ae(c.$slots, "metadata", {}, void 0, !0)])) : ce("", !0)])])) : ce("", !0), c.previewContent ? (D(), V("div", MNe)) : ce("", !0), c.previewContent ? (D(), V("section", PNe, [N("div", LNe, [(D(), Se(b(S1), {
      key: r.value,
      source: s.value,
      class: "min-w-fit",
      html: c.allowHtml,
      breaks: !0,
      linkify: !0,
      typographer: !0
    }, null, 8, ["source", "html"]))])])) : ce("", !0)])]));
  }
})