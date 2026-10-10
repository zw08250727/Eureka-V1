lv = ie({
  __name: "MeetingSummaryTemplateCardIcon",
  props: {
    template: {},
    fallbackMagicStick: {
      type: Boolean,
      default: !1
    }
  },
  setup(e) {
    const t = e,
      n = F(() => yl(t.template) ? "" : hp(t.template)),
      r = F(() => t.fallbackMagicStick && !n.value && !yl(t.template));
    return (a, s) => {
      const c = Vt("el-icon");
      return D(), V("span", gNe, [b(yl)(a.template) ? (D(), Se(ix, {
        key: 0,
        size: 24,
        class: "generate-example-sparkle-icon"
      })) : n.value ? (D(), V("img", {
        key: 1,
        src: n.value,
        alt: "",
        class: "msd-card-icon-img m-0 block size-6 max-h-6 max-w-6 min-h-6 min-w-6 shrink-0 object-contain",
        loading: "eager",
        decoding: "async",
        referrerpolicy: "no-referrer"
      }, null, 8, _Ne)) : r.value ? (D(), Se(c, {
        key: 2,
        size: 24,
        color: "#165DFF"
      }, {
        default: se(() => [W(b(VEe))]),
        _: 1
      })) : ce("", !0)]);
    };
  }
})