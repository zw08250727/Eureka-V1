Z4e = ie({
  name: "TemplateCommunityContent",
  __name: "TemplateCommunityContent",
  props: {
    embedded: {
      type: Boolean,
      default: !1
    }
  },
  emits: ["close", "previewing"],
  setup(e, {
    emit: t
  }) {
    const n = e,
      r = t,
      a = xc(),
      s = Mp(),
      c = H([]),
      l = H("mine"),
      u = H("custom"),
      i = H(""),
      d = H(!1),
      p = H(!1),
      g = H([]),
      f = H([]),
      _ = H([]),
      h = H([]),
      v = H(new Set()),
      y = H(!1),
      E = H("comprehensive"),
      C = H("all"),
      S = H(null),
      w = H(!1),
      T = H(!1),
      O = H("zh"),
      x = H(!1),
      R = H(null),
      A = H(!1),
      I = H(null),
      k = H(!1),
      M = H(!1),
      L = H(zd()),
      U = H(!1),
      B = H(null),
      $ = H(!1),
      P = H(!1),
      z = H(null),
      q = H(!1),
      Y = H("");
    let K = null,
      j = 0;
    const Q = F(() => [{
        categoryCode: "mine",
        categoryName: "我的模版"
      }, ...c.value.filter(be => be.categoryCode && be.categoryCode !== "custom" && v.value.has(be.categoryCode))]),
      re = F(() => Q.value.filter(be => be.categoryCode !== "mine")),
      te = F(() => {
        const be = i.value.trim() ? h.value : l.value === "mine" ? u.value === "custom" ? _.value : f.value : h.value,
          Te = i.value.trim().toLowerCase(),
          ot = be.filter(qt => {
            const pn = !Te || [qt.templateName, qt.name, qt.title, qt.description, qt.tagline].filter(Boolean).join(" ").toLowerCase().includes(Te),
              Je = at(qt),
              fn = C.value === "all" || C.value === "published" && Je === "已发布" || C.value === "withdrawn" && Je === "已下架";
            return pn && fn;
          }),
          Bt = (qt, pn) => {
            var Je;
            return Number(((Je = qt.metrics) == null ? void 0 : Je[pn]) || 0);
          };
        return [...ot].sort((qt, pn) => E.value === "latest" ? String(pn.createdAt || "").localeCompare(String(qt.createdAt || "")) : E.value === "likes" ? Bt(pn, "likes") - Bt(qt, "likes") : E.value === "dislikes" ? Bt(pn, "dislikes") - Bt(qt, "dislikes") : E.value === "collects" ? Bt(pn, "collects") - Bt(qt, "collects") : 0);
      }),
      Z = F(() => i.value.trim() ? "搜索结果" : l.value === "mine" ? "" : "共享模版"),
      ee = F(() => !!(L.value.name.trim() && L.value.content.trim())),
      ne = F(() => I.value ? "编辑自定义模板" : "新增自定义模板"),
      ge = F(() => I.value ? "保存自定义模板" : "保存至自定义模板"),
      ae = F(() => {
        var be, Te;
        return String(((Te = (be = s.userInfo) == null ? void 0 : be.user) == null ? void 0 : Te.nickname) || "我").trim() || "我";
      }),
      fe = F(() => {
        var be, Te, ot, Bt;
        return String(((Te = (be = s.userInfo) == null ? void 0 : be.user) == null ? void 0 : Te.userId) || ((Bt = (ot = s.userInfo) == null ? void 0 : ot.user) == null ? void 0 : Bt.id) || "").trim();
      }),
      he = F(() => {
        var be;
        return ((be = Q.value.find(Te => Te.categoryCode === l.value)) == null ? void 0 : be.categoryName) || "模版社区";
      }),
      oe = F(() => c.value.filter(be => be.categoryCode && be.categoryCode !== "custom")),
      le = F(() => R.value ? {
        id: R.value.dataId,
        name: R.value.name,
        prompt: R.value.prompt
      } : null),
      we = F(() => S.value ? pF(ft(S.value), O.value) : null),
      Ce = () => {
        if (n.embedded) {
          r("close");
          return;
        }
        a.back();
      };
    Ie(w, be => r("previewing", be));
    const Oe = be => String(be.id || be.dataId || "").trim(),
      De = be => be.templateName || be.name || be.title || "未命名模版",
      Ue = be => be.description || be.tagline || be.prompt || "暂无描述",
      Ne = (be, Te) => {
        var ot;
        return Number(((ot = be.metrics) == null ? void 0 : ot[Te]) || 0);
      },
      Ze = (be, Te) => {
        if (Te <= 0) return 0;
        let ot = 0;
        for (let Bt = 0; Bt < be.length; Bt += 1) ot = ot * 31 + be.charCodeAt(Bt) >>> 0;
        return ot % Te;
      },
      Ye = (be, Te) => {
        if (!Te.length) return "";
        const ot = [Oe(be), De(be), be.scene || ""].join("|");
        return Te[Ze(ot, Te.length)] || "";
      },
      ke = be => be.iconUrl || be.icon_url || be.templateIcon || be.template_icon || be.icon || "",
      tt = be => ye(X({}, be), {
        dataId: Oe(be),
        name: De(be),
        description: Ue(be),
        iconUrl: ke(be)
      }),
      ft = be => ye(X({}, be), {
        iconUrl: ke(be) || void 0
      }),
      it = (be, Te) => {
        var ot, Bt, qt;
        return ye(X(X({}, be), Te), {
          id: Te.id || be.id,
          dataId: Te.dataId || Te.id || be.dataId || be.id,
          templateName: Te.templateName || Te.name || be.templateName || be.name,
          name: Te.name || Te.templateName || be.name || be.templateName,
          iconUrl: Te.iconUrl || be.iconUrl,
          metrics: X(X({}, be.metrics || {}), Te.metrics || {}),
          liked: (ot = Te.liked) != null ? ot : be.liked,
          disliked: (Bt = Te.disliked) != null ? Bt : be.disliked,
          collected: (qt = Te.collected) != null ? qt : be.collected,
          creatorName: Te.creatorName || be.creatorName,
          creatorNickname: Te.creatorNickname || be.creatorNickname,
          templateSource: "COMMUNITY"
        });
      },
      kt = be => {
        const Te = be == null ? void 0 : be.data;
        return ic(Te && typeof Te == "object" && "data" in Te ? Te.data : Te != null ? Te : be);
      },
      Gt = be => {
        const Te = String(be.status || "").toUpperCase(),
          ot = String(be.templateAvailability || "").toLowerCase();
        return ["DELETED", "FORBIDDEN"].includes(Te) || ["deleted", "forbidden", "not_collected"].includes(ot);
      },
      Yt = be => {
        const Te = String(be.status || "").toUpperCase(),
          ot = String(be.templateAvailability || "").toLowerCase();
        return ["WITHDRAWN", "OFF_SHELF", "UNPUBLISHED"].includes(Te) || ["withdrawn", "off_shelf", "unpublished"].includes(ot);
      },
      at = be => {
        const Te = String(be.status || "").toUpperCase();
        return Gt(be) || Yt(be) ? "已下架" : ["PUBLISHED", "PUBLISH", "ONLINE", "ON_SHELF"].includes(Te) ? "已发布" : "";
      },
      Tt = be => {
        const Te = String(be.createdAt || "").trim();
        return Te ? `创建于 ${Te.replace("T", " ").slice(0, 19)}` : "创建时间暂无";
      },
      Lt = be => at(be) === "已发布",
      _e = be => be.available === !1 || Gt(be) || Yt(be) || String(be.effectiveMode || "").toUpperCase() === "INTELLIGENT",
      ze = be => {
        const Te = Oe(be);
        return _.value.some(ot => Oe(ot) === Te) || g.value.some(ot => String(ot.dataId || "") === Te) || !!(fe.value && String(be.creatorId || "").trim() === fe.value);
      },
      J = be => l.value === "mine" && u.value === "saved" && _e(be),
      pe = be => Re(null, null, function* () {
        const Te = new Set(),
          ot = new Set((be || []).map(Bt => String(Bt || "").trim()).filter(Boolean));
        return yield Promise.all(c.value.filter(Bt => Bt.categoryCode && Bt.categoryCode !== "custom").filter(Bt => ot.size === 0 || ot.has(String(Bt.categoryCode || ""))).map(Bt => Re(null, null, function* () {
          try {
            const qt = yield Ff({
              categoryCode: Bt.categoryCode || "",
              language: "zh"
            });
            Bf(qt).forEach(pn => {
              const Je = String(pn.iconUrl || pn.icon_url || "").trim();
              Je && Te.add(Je);
            });
          } catch (qt) {}
        }))), [...Te];
      }),
      Ve = (be, Te) => be.map(ot => {
        const Bt = ke(ot) || Ye(ot, Te);
        return Bt ? ye(X({}, ot), {
          iconUrl: Bt
        }) : ot;
      }),
      lt = be => Re(null, null, function* () {
        const [Te, ot] = yield Promise.all([rx("zh"), Xh()]);
        if (!Rs(ot)) throw new Error(Xc(ot, "模版社区数据加载失败"));
        g.value = ax(Te);
        const Bt = Qh(ot),
          qt = new Map();
        Bt.created.forEach(Dn => {
          const Qt = Oe(Dn);
          Qt && qt.set(Qt, Dn);
        });
        const pn = new Map();
        g.value.forEach(Dn => {
          const Qt = String(Dn.dataId || "").trim();
          Qt && pn.set(Qt, Dn);
        });
        const Je = new Set([...qt.keys(), ...pn.keys()]),
          fn = be != null ? be : yield pe();
        _.value = Ve([...Je].map(Dn => {
          const Qt = qt.get(Dn),
            _n = pn.get(Dn);
          return ic(ye(X({}, Qt), {
            id: Dn,
            title: (Qt == null ? void 0 : Qt.templateName) || (Qt == null ? void 0 : Qt.title) || (_n == null ? void 0 : _n.name),
            prompt: (Qt == null ? void 0 : Qt.prompt) || (_n == null ? void 0 : _n.prompt),
            createdAt: (Qt == null ? void 0 : Qt.createdAt) || (_n == null ? void 0 : _n.createdAt),
            iconUrl: (Qt == null ? void 0 : Qt.iconUrl) || (_n == null ? void 0 : _n.iconUrl),
            icon_url: (Qt == null ? void 0 : Qt.icon_url) || (_n == null ? void 0 : _n.icon_url),
            creatorName: (Qt == null ? void 0 : Qt.creatorName) || ae.value
          }));
        }), fn), f.value = Ve(Bt.saved.filter(Dn => !ze(Dn) && !Gt(Dn)), fn);
      }),
      At = (be, Te) => Re(null, null, function* () {
        if (be !== j) return;
        const ot = i.value.trim();
        if (l.value === "mine" && !ot) return;
        const Bt = l.value,
          qt = yield BN({
            categoryId: ot ? void 0 : Bt,
            query: ot || void 0
          });
        if (be !== j) return;
        if (!Rs(qt)) throw new Error(Xc(qt, "模版社区数据加载失败"));
        const pn = ot || Bt === "mine" ? void 0 : [Bt],
          Je = Te != null ? Te : yield pe(pn);
        be === j && (h.value = Ve(FN(qt).filter(fn => !_e(fn)), Je));
      }),
      ct = () => Re(null, null, function* () {
        const be = ++j;
        p.value = !0, Y.value = "";
        try {
          const Te = l.value,
            ot = yield pe(i.value.trim() || Te === "mine" ? void 0 : [Te]);
          if (be !== j) return;
          yield At(be, ot);
        } catch (Te) {
          if (be !== j) return;
          Y.value = Te instanceof Error ? Te.message : "模版社区加载失败，请重试";
        } finally {
          be === j && (p.value = !1);
        }
      }),
      vn = () => Re(null, null, function* () {
        const be = c.value.filter(ot => ot.categoryCode && ot.categoryCode !== "custom"),
          Te = yield Promise.all(be.map(ot => Re(null, null, function* () {
            const Bt = ot.categoryCode || "";
            try {
              const qt = yield BN({
                categoryId: Bt
              });
              if (!Rs(qt)) throw new Error(Xc(qt, "模版社区数据加载失败"));
              return [Bt, FN(qt)];
            } catch (qt) {
              return [Bt, []];
            }
          })));
        v.value = new Set(Te.filter(([, ot]) => ot.length > 0).map(([ot]) => ot));
      }),
      xn = () => Re(null, null, function* () {
        const be = ++j;
        d.value = !0, Y.value = "";
        try {
          const Te = yield pe();
          yield Promise.all([lt(Te), At(be, Te), vn()]);
        } catch (Te) {
          Y.value = Te instanceof Error ? Te.message : "模版社区加载失败，请重试";
        } finally {
          d.value = !1;
        }
      }),
      Sn = be => Re(null, null, function* () {
        if (!(!be || be === l.value)) {
          if (l.value = be, h.value = [], be === "mine" && !i.value.trim()) {
            Y.value = "";
            return;
          }
          yield ct();
        }
      }),
      Fn = () => {
        E.value = "comprehensive", C.value = "all";
      },
      We = be => Re(null, null, function* () {
        var ot, Bt, qt;
        const Te = ft(be);
        S.value = Te, O.value = "zh", w.value = !0, T.value = !0;
        try {
          const pn = yield g2(Oe(be)),
            Je = pn == null ? void 0 : pn.data,
            fn = ic(Je && typeof Je == "object" && "data" in Je ? Je.data : Je != null ? Je : pn);
          if (fn.id) {
            const Dn = ye(X(X({}, Te), fn), {
              iconUrl: ke(fn) || ke(Te) || void 0,
              metrics: X(X({}, Te.metrics || {}), fn.metrics || {}),
              liked: (ot = fn.liked) != null ? ot : Te.liked,
              disliked: (Bt = fn.disliked) != null ? Bt : Te.disliked,
              collected: (qt = fn.collected) != null ? qt : Te.collected,
              creatorName: fn.creatorName || Te.creatorName || Te.creatorNickname || "",
              creatorNickname: fn.creatorNickname || Te.creatorNickname || Te.creatorName || ""
            });
            if (ke(Dn)) S.value = ft(Dn);else {
              const [Qt] = Ve([Dn], yield pe());
              S.value = ft(Qt);
            }
          }
        } catch (pn) {} finally {
          T.value = !1;
        }
      }),
      Ft = (be, Te) => Re(null, null, function* () {
        const ot = Oe(be);
        if (!ot) return;
        const qt = !(Te === "like" ? !!be.liked : Te === "dislike" ? !!be.disliked : !!be.collected);
        try {
          const pn = Te === "like" ? yield nF(ot, qt) : Te === "dislike" ? yield rF(ot, qt) : yield aF(ot, qt);
          if (!Rs(pn)) throw new Error(Xc(pn));
          const Je = _n => Oe(_n) !== ot ? _n : X(X(X(X({}, _n), Te === "like" ? {
              liked: qt,
              disliked: qt ? !1 : _n.disliked,
              metrics: ye(X({}, _n.metrics), {
                likes: Math.max(0, Ne(_n, "likes") + (qt ? 1 : -1)),
                dislikes: qt && _n.disliked ? Math.max(0, Ne(_n, "dislikes") - 1) : Ne(_n, "dislikes")
              })
            } : {}), Te === "dislike" ? {
              disliked: qt,
              liked: qt ? !1 : _n.liked,
              metrics: ye(X({}, _n.metrics), {
                dislikes: Math.max(0, Ne(_n, "dislikes") + (qt ? 1 : -1)),
                likes: qt && _n.liked ? Math.max(0, Ne(_n, "likes") - 1) : Ne(_n, "likes")
              })
            } : {}), Te === "save" ? {
              collected: qt,
              metrics: ye(X({}, _n.metrics), {
                collects: Math.max(0, Ne(_n, "collects") + (qt ? 1 : -1))
              })
            } : {}),
            fn = kt(pn),
            Dn = fn.id ? it(be, fn) : Je(be),
            Qt = _n => Oe(_n) === ot ? it(_n, Dn) : _n;
          if (Te === "save") {
            if (ze(be)) f.value = f.value.filter(_n => Oe(_n) !== ot);else if (qt) {
              const _n = f.value.some(Qe => Oe(Qe) === ot);
              f.value = _n ? f.value.map(Qt) : [...f.value, Dn];
            } else f.value = f.value.filter(_n => Oe(_n) !== ot);
          } else f.value = f.value.map(Qt);
          _.value = _.value.map(Qt), h.value = h.value.map(Qt), S.value && Oe(S.value) === ot && (S.value = it(S.value, Dn));
        } catch (pn) {
          Pt.error(pn instanceof Error ? pn.message : "操作失败，请重试");
        }
      }),
      Dt = be => Re(null, null, function* () {
        z.value = be, P.value = !0;
      }),
      qn = () => {
        q.value || (P.value = !1, z.value = null);
      },
      sr = () => Re(null, null, function* () {
        const be = z.value,
          Te = be ? Oe(be) : "";
        if (!(!Te || q.value)) {
          q.value = !0;
          try {
            const ot = yield oF(Te);
            if (!Rs(ot)) throw new Error(Xc(ot));
            Pt.success("已下架社区模版"), yield lt(), P.value = !1, z.value = null;
          } catch (ot) {
            Pt.error(ot instanceof Error ? ot.message : "下架失败，请重试");
          } finally {
            q.value = !1;
          }
        }
      }),
      br = () => Re(null, null, function* () {
        R.value = null, yield lt();
      }),
      dn = () => {
        A.value = !1, I.value = null, L.value = zd();
      },
      Me = () => {
        I.value = null, L.value = zd(), A.value = !0;
      },
      st = be => {
        const Te = g.value.find(ot => String(ot.dataId || "").trim() === Oe(be));
        if (!Te) {
          Pt.warning("该模版缺少可编辑内容，请刷新后重试");
          return;
        }
        I.value = String(Te.dataId || "").trim(), L.value = mF(Te), A.value = !0;
      },
      xt = be => Re(null, null, function* () {
        B.value = be, U.value = !0;
      }),
      sn = () => {
        $.value || (U.value = !1, B.value = null);
      },
      Gn = () => Re(null, null, function* () {
        const be = B.value,
          Te = be ? Oe(be) : "";
        if (!(!Te || $.value)) {
          $.value = !0;
          try {
            yield _F(Te), Pt.success("模版已删除"), yield lt(), U.value = !1, B.value = null;
          } catch (ot) {
            Pt.error(ot instanceof Error ? ot.message : "删除失败，请重试");
          } finally {
            $.value = !1;
          }
        }
      }),
      Kn = () => Re(null, null, function* () {
        const be = L.value.keywords.trim();
        if (!be || M.value) {
          be || Pt.warning("请先填写关键词");
          return;
        }
        M.value = !0;
        try {
          L.value.content = yield gF({
            keywords: be
          });
        } catch (Te) {
          Pt.error("生成示例失败，请重试");
        } finally {
          M.value = !1;
        }
      }),
      Be = (be = !1) => Re(null, null, function* () {
        if (!ee.value || k.value) return;
        const Te = {
          name: L.value.name.trim(),
          content: L.value.content.trim()
        };
        k.value = !0;
        try {
          const {
            savedTemplateId: ot
          } = yield _2({
            customEditingId: I.value,
            form: L.value
          });
          if (Pt.success(I.value ? "自定义模版已更新" : "自定义模版已保存"), dn(), yield lt(), be) {
            const Bt = ot ? g.value.find(qt => String(qt.dataId || "").trim() === ot) : g.value.find(qt => {
              var pn, Je;
              return ((pn = qt.name) == null ? void 0 : pn.trim()) === Te.name && ((Je = qt.prompt) == null ? void 0 : Je.trim()) === Te.content;
            });
            if (!Bt) throw new Error("模版已保存，但暂未获取到可发布的模版，请稍后重试");
            R.value = Bt, x.value = !0;
          }
        } catch (ot) {
          Pt.error(ot instanceof Error ? ot.message : "保存失败，请重试");
        } finally {
          k.value = !1;
        }
      });
    return Ie(i, () => {
      j += 1, K !== null && window.clearTimeout(K), K = window.setTimeout(() => {
        ct();
      }, 300);
    }), vs(() => {
      j += 1, K !== null && (window.clearTimeout(K), K = null);
    }), Zt(() => Re(null, null, function* () {
      try {
        const be = yield ZL("zh");
        c.value = JL(be);
      } catch (be) {
        c.value = [];
      }
      yield xn();
    })), (be, Te) => {
      const ot = Vt("el-icon"),
        Bt = Vt("el-input"),
        qt = Vt("el-dialog"),
        pn = Gu("loading");
      return D(), V("main", {
        class: G(["template-community-page flex h-full min-h-0 flex-col overflow-hidden text-[#262626]", be.embedded ? "bg-white" : "bg-[#f7f8fa]"])
      }, [be.embedded ? ce("", !0) : (D(), V("header", $Ne, [N("div", UNe, [N("div", {
        role: "button",
        tabindex: "0",
        class: "flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[#f2f3f5]",
        onClick: Ce,
        onKeydown: dt(He(Ce, ["prevent"]), ["enter"])
      }, [W(ot, {
        size: 20
      }, {
        default: se(() => [W(b(zye))]),
        _: 1
      })], 40, VNe), Te[28] || (Te[28] = N("h1", {
        class: "m-0 text-xl font-semibold leading-8"
      }, "模版社区", -1))])])), N("div", {
        class: G(["template-community-workspace min-h-0 flex-1", be.embedded ? "" : "px-8 py-6"])
      }, [N("aside", HNe, [N("div", zNe, [N("div", GNe, [N("div", {
        role: "tab",
        tabindex: "0",
        class: G(["template-community-category template-community-category--mine", {
          "is-active": l.value === "mine"
        }]),
        onClick: Te[0] || (Te[0] = Je => Sn("mine")),
        onKeydown: Te[1] || (Te[1] = dt(He(Je => Sn("mine"), ["prevent"]), ["enter"]))
      }, [W(cF, {
        selected: l.value === "mine"
      }, null, 8, ["selected"]), Te[29] || (Te[29] = N("span", null, "我的模版", -1))], 34)]), re.value.length ? (D(), V("div", qNe)) : ce("", !0), N("div", YNe, [(D(!0), V(Ge, null, Et(re.value, Je => (D(), V("div", {
        key: Je.categoryCode,
        role: "tab",
        tabindex: "0",
        class: G(["template-community-category", {
          "is-active": l.value === Je.categoryCode
        }]),
        onClick: fn => Sn(Je.categoryCode),
        onKeydown: dt(He(fn => Sn(Je.categoryCode), ["prevent"]), ["enter"])
      }, me(Je.categoryName), 43, jNe))), 128))])])]), Kt((D(), V("section", KNe, [N("div", WNe, [l.value === "mine" && !i.value.trim() ? (D(), V("div", QNe, [N("div", {
        role: "tab",
        tabindex: "0",
        class: G(["template-community-my-tab", {
          "is-active": u.value === "custom"
        }]),
        "aria-selected": u.value === "custom",
        onClick: Te[2] || (Te[2] = Je => u.value = "custom"),
        onKeydown: Te[3] || (Te[3] = dt(He(Je => u.value = "custom", ["prevent"]), ["enter"]))
      }, " 自定义 ", 42, XNe), N("div", {
        role: "tab",
        tabindex: "0",
        class: G(["template-community-my-tab", {
          "is-active": u.value === "saved"
        }]),
        "aria-selected": u.value === "saved",
        onClick: Te[4] || (Te[4] = Je => u.value = "saved"),
        onKeydown: Te[5] || (Te[5] = dt(He(Je => u.value = "saved", ["prevent"]), ["enter"]))
      }, " 已收藏 ", 42, ZNe)])) : (D(), V("h2", JNe, me(Z.value || "选择社区模版"), 1)), N("div", e4e, [W(Bt, {
        modelValue: i.value,
        "onUpdate:modelValue": Te[6] || (Te[6] = Je => i.value = Je),
        class: "template-community-search",
        placeholder: "搜索全部模版",
        clearable: ""
      }, {
        prefix: se(() => [W(ot, null, {
          default: se(() => [W(b(uSe))]),
          _: 1
        })]),
        _: 1
      }, 8, ["modelValue"]), N("div", {
        role: "button",
        tabindex: "0",
        class: "template-community-filter-trigger",
        onClick: Te[7] || (Te[7] = Je => y.value = !y.value),
        onKeydown: Te[8] || (Te[8] = dt(He(Je => y.value = !y.value, ["prevent"]), ["enter"]))
      }, [W(ot, null, {
        default: se(() => [W(b(AEe))]),
        _: 1
      }), N("span", null, me(y.value ? "收起筛选" : "筛选"), 1)], 32)])]), y.value ? (D(), V("section", t4e, [N("div", n4e, [N("div", null, [Te[30] || (Te[30] = N("h4", {
        class: "mb-3 text-sm font-medium leading-6 text-[#565656]"
      }, " 排序依据 ", -1)), N("div", r4e, [(D(), V(Ge, null, Et([{
        label: "综合",
        value: "comprehensive"
      }, {
        label: "最新",
        value: "latest"
      }, {
        label: "最多点赞",
        value: "likes"
      }, {
        label: "最多点踩",
        value: "dislikes"
      }, {
        label: "最多收藏",
        value: "collects"
      }], Je => N("div", {
        key: Je.value,
        role: "radio",
        tabindex: "0",
        "aria-checked": E.value === Je.value,
        class: G(["template-community-filter-option", {
          "is-active": E.value === Je.value
        }]),
        onClick: fn => E.value = Je.value,
        onKeydown: dt(He(fn => E.value = Je.value, ["prevent"]), ["enter"])
      }, me(Je.label), 43, a4e)), 64))])]), N("div", null, [Te[31] || (Te[31] = N("h4", {
        class: "mb-3 text-sm font-medium leading-6 text-[#565656]"
      }, " 模版类型 ", -1)), N("div", o4e, [(D(), V(Ge, null, Et([{
        label: "不限",
        value: "all"
      }, {
        label: "已发布",
        value: "published"
      }, {
        label: "已下架",
        value: "withdrawn"
      }], Je => N("div", {
        key: Je.value,
        role: "radio",
        tabindex: "0",
        "aria-checked": C.value === Je.value,
        class: G(["template-community-filter-option", {
          "is-active": C.value === Je.value
        }]),
        onClick: fn => C.value = Je.value,
        onKeydown: dt(He(fn => C.value = Je.value, ["prevent"]), ["enter"])
      }, me(Je.label), 43, i4e)), 64))])])]), N("footer", s4e, [N("div", {
        role: "button",
        tabindex: "0",
        class: "flex flex-1 cursor-pointer items-center justify-center gap-2 text-sm hover:bg-[#fafafa]",
        onClick: Fn,
        onKeydown: dt(He(Fn, ["prevent"]), ["enter"])
      }, [W(ot, null, {
        default: se(() => [W(b(ZEe))]),
        _: 1
      }), Te[32] || (Te[32] = bt(" 重置 ", -1))], 40, l4e), Te[33] || (Te[33] = N("div", {
        class: "my-2.5 w-px bg-black/[0.08]"
      }, null, -1)), N("div", {
        role: "button",
        tabindex: "0",
        class: "flex flex-1 cursor-pointer items-center justify-center gap-2 text-sm hover:bg-[#fafafa]",
        onClick: Te[9] || (Te[9] = Je => y.value = !1),
        onKeydown: Te[10] || (Te[10] = dt(He(Je => y.value = !1, ["prevent"]), ["enter"]))
      }, " ⌃ 收起 ", 32)])])) : ce("", !0), y.value ? (D(), V("div", {
        key: 1,
        class: "template-community-filter-backdrop",
        "aria-hidden": "true",
        onClick: Te[11] || (Te[11] = Je => y.value = !1)
      })) : ce("", !0), Y.value ? (D(), V("div", c4e, [W(ot, {
        size: 34,
        class: "mb-3 text-[#bfc9d9]"
      }, {
        default: se(() => [W(b(RI))]),
        _: 1
      }), N("span", null, me(Y.value), 1), N("div", {
        role: "button",
        tabindex: "0",
        class: "mt-3 cursor-pointer text-sm text-[#165dff] transition-colors hover:text-[#0e4fe5]",
        onClick: xn,
        onKeydown: dt(He(xn, ["prevent"]), ["enter"])
      }, " 重新加载 ", 40, u4e)])) : l.value === "mine" && u.value === "custom" && !i.value.trim() ? (D(), V("div", d4e, [N("div", {
        role: "button",
        tabindex: "0",
        class: "template-community-card template-community-card--create flex cursor-pointer flex-col items-center justify-center gap-3",
        onClick: Me,
        onKeydown: dt(He(Me, ["prevent"]), ["enter"])
      }, [N("span", f4e, [W(ot, {
        size: 14
      }, {
        default: se(() => [W(b(CP))]),
        _: 1
      })]), Te[34] || (Te[34] = N("span", {
        class: "text-sm font-medium leading-[22px] text-[#262626]"
      }, " 新建模版 ", -1))], 40, p4e), (D(!0), V(Ge, null, Et(te.value, Je => (D(), V("div", {
        key: Oe(Je),
        class: "template-community-card template-community-custom-card group relative flex cursor-pointer flex-col",
        onClick: fn => Lt(Je) ? We(Je) : st(Je)
      }, [N("div", g4e, [N("div", {
        role: "button",
        tabindex: "0",
        class: "template-community-card-action",
        "aria-label": Lt(Je) ? "查看模版" : "编辑模版",
        onClick: He(fn => Lt(Je) ? We(Je) : st(Je), ["stop"]),
        onKeydown: dt(He(fn => Lt(Je) ? We(Je) : st(Je), ["stop", "prevent"]), ["enter"])
      }, [Lt(Je) ? (D(), Se(sv, {
        key: 0
      })) : (D(), Se(sF, {
        key: 1,
        size: 12
      }))], 40, _4e), Lt(Je) ? (D(), V("div", {
        key: 0,
        role: "button",
        tabindex: "0",
        class: "template-community-card-action is-withdraw",
        "aria-label": "下架社区模版",
        title: "下架社区模版",
        onClick: He(fn => Dt(Je), ["stop"]),
        onKeydown: dt(He(fn => Dt(Je), ["stop", "prevent"]), ["enter"])
      }, [W(lF, {
        size: 16
      })], 40, h4e)) : ce("", !0), N("div", {
        role: "button",
        tabindex: "0",
        class: "template-community-card-action is-danger",
        "aria-label": "删除模版",
        onClick: He(fn => xt(Je), ["stop"]),
        onKeydown: dt(He(fn => xt(Je), ["stop", "prevent"]), ["enter"])
      }, [W(ot, {
        size: 13
      }, {
        default: se(() => [W(b(SP))]),
        _: 1
      })], 40, v4e)]), N("div", b4e, [N("div", y4e, [W(lv, {
        template: tt(Je),
        "fallback-magic-stick": ""
      }, null, 8, ["template"])]), N("div", E4e, [N("div", S4e, me(De(Je)), 1)]), N("p", {
        class: "whitespace-nowrap text-[11px] leading-[18px] text-[#8c8c8c]",
        title: Tt(Je)
      }, me(Tt(Je)), 9, C4e), at(Je) ? (D(), V("span", {
        key: 0,
        class: G(["mt-auto w-fit rounded-[3px] bg-[#f3f7ff] px-1.5 text-xs leading-5 text-[#165dff]", {
          "!bg-[#fff2f0] !text-[#f53f3f]": at(Je) === "已下架"
        }])
      }, me(at(Je)), 3)) : ce("", !0)])], 8, m4e))), 128))])) : te.value.length ? (D(), V("div", w4e, [(D(!0), V(Ge, null, Et(te.value, Je => (D(), V("div", {
        key: Oe(Je),
        class: G(["template-community-card group relative flex cursor-pointer flex-col", {
          "is-unavailable": J(Je)
        }]),
        "aria-disabled": J(Je),
        onClick: fn => !J(Je) && We(Je)
      }, [N("div", {
        role: "button",
        tabindex: J(Je) ? -1 : 0,
        class: G(["template-community-preview-trigger", {
          "is-disabled": J(Je)
        }]),
        "aria-label": "预览模版",
        onClick: He(fn => !J(Je) && We(Je), ["stop"]),
        onKeydown: dt(He(fn => !J(Je) && We(Je), ["stop", "prevent"]), ["enter"])
      }, [W(sv)], 42, x4e), N("div", O4e, [N("div", R4e, [W(lv, {
        template: tt(Je),
        "fallback-magic-stick": ""
      }, null, 8, ["template"])]), N("div", A4e, [N("div", I4e, me(De(Je)), 1)]), N("p", N4e, me(Ue(Je)), 1)]), N("div", k4e, [N("div", {
        role: "button",
        tabindex: "0",
        class: G(["inline-flex cursor-pointer items-center justify-center gap-1 hover:text-[#165dff]", {
          "!text-[#165dff]": Je.liked
        }]),
        onClick: He(fn => Ft(Je, "like"), ["stop"]),
        onKeydown: dt(He(fn => Ft(Je, "like"), ["stop", "prevent"]), ["enter"])
      }, [W(Id, {
        size: 16
      }), bt(" " + me(Ne(Je, "likes")), 1)], 42, D4e), N("div", {
        role: "button",
        tabindex: "0",
        class: G(["inline-flex cursor-pointer items-center justify-center gap-1 hover:text-[#165dff]", {
          "!text-[#165dff]": Je.disliked
        }]),
        onClick: He(fn => Ft(Je, "dislike"), ["stop"]),
        onKeydown: dt(He(fn => Ft(Je, "dislike"), ["stop", "prevent"]), ["enter"])
      }, [W(Id, {
        size: 16,
        class: "rotate-180"
      }), bt(" " + me(Ne(Je, "dislikes")), 1)], 42, M4e), N("div", {
        role: "button",
        tabindex: "0",
        class: G(["inline-flex cursor-pointer items-center justify-center gap-1 hover:text-[#165dff]", {
          "!text-[#165dff]": Je.collected
        }]),
        onClick: He(fn => Ft(Je, "save"), ["stop"]),
        onKeydown: dt(He(fn => Ft(Je, "save"), ["stop", "prevent"]), ["enter"])
      }, [W(ot, null, {
        default: se(() => [Je.collected ? (D(), Se(b(Nm), {
          key: 0
        })) : (D(), Se(b(i2), {
          key: 1
        }))]),
        _: 2
      }, 1024), bt(" " + me(Ne(Je, "collects")), 1)], 42, P4e)])], 10, T4e))), 128))])) : (D(), V("div", L4e, [W(ot, {
        size: 36,
        class: "mb-3 text-[#bfc9d9]"
      }, {
        default: se(() => [W(b(RI))]),
        _: 1
      }), N("span", null, me(l.value === "mine" && u.value === "custom" ? "暂未创建自定义模版" : `${he.value}暂无模版`), 1)]))])), [[pn, d.value || p.value]])], 2), W(iF, {
        modelValue: x.value,
        "onUpdate:modelValue": Te[12] || (Te[12] = Je => x.value = Je),
        template: le.value,
        categories: oe.value,
        onPublished: br
      }, null, 8, ["modelValue", "template", "categories"]), W(uF, {
        modelValue: A.value,
        "onUpdate:modelValue": Te[13] || (Te[13] = Je => A.value = Je),
        form: L.value,
        "onUpdate:form": Te[14] || (Te[14] = Je => L.value = Je),
        title: ne.value,
        "generating-example": M.value,
        saving: k.value,
        "can-save": ee.value,
        "save-button-text": ge.value,
        "show-publish": !0,
        onClose: dn,
        onGenerateExample: Kn,
        onSave: Te[15] || (Te[15] = Je => Be()),
        onPublish: Te[16] || (Te[16] = Je => Be(!0))
      }, null, 8, ["modelValue", "form", "title", "generating-example", "saving", "can-save", "save-button-text"]), W(qt, {
        modelValue: U.value,
        "onUpdate:modelValue": Te[17] || (Te[17] = Je => U.value = Je),
        "align-center": "",
        "append-to": "#app",
        "show-close": !1,
        "destroy-on-close": "",
        width: "320px",
        class: "template-community-withdraw-dialog !rounded-2xl !p-0",
        onClosed: sn
      }, {
        default: se(() => [N("div", F4e, [N("div", B4e, [N("div", $4e, [W(iv, {
          size: 24,
          color: "#FA8C16"
        })]), Te[35] || (Te[35] = N("div", {
          class: "min-w-0 flex-1"
        }, [N("p", {
          class: "m-0 text-left text-[16px] font-medium leading-7 text-black"
        }, " 确认删除自定义模版？ "), N("p", {
          class: "mt-1 text-sm leading-5 text-[#8c8c8c]"
        }, " 删除后不可恢复，请谨慎操作。 ")], -1))]), N("div", U4e, [N("div", {
          role: "button",
          tabindex: "0",
          class: G(["flex h-10 flex-1 items-center justify-center rounded-lg bg-[#f5f5f5] px-3 text-sm leading-6 text-[#262626] transition-colors hover:bg-[#ebebeb]", {
            "cursor-not-allowed opacity-60": $.value,
            "cursor-pointer": !$.value
          }]),
          onClick: sn,
          onKeydown: dt(He(sn, ["prevent"]), ["enter"])
        }, " 取消 ", 42, V4e), N("div", {
          role: "button",
          tabindex: "0",
          class: G(["flex h-10 flex-1 items-center justify-center rounded-lg bg-[#165dff] px-3 text-sm leading-6 text-white transition-colors hover:bg-[#0e4fe5]", {
            "cursor-not-allowed opacity-80": $.value,
            "cursor-pointer": !$.value
          }]),
          onClick: Gn,
          onKeydown: dt(He(Gn, ["prevent"]), ["enter"])
        }, me($.value ? "删除中" : "确认删除"), 43, H4e)])])]),
        _: 1
      }, 8, ["modelValue"]), W(qt, {
        modelValue: P.value,
        "onUpdate:modelValue": Te[18] || (Te[18] = Je => P.value = Je),
        "align-center": "",
        "append-to": "#app",
        "show-close": !1,
        "destroy-on-close": "",
        width: "320px",
        class: "template-community-withdraw-dialog !rounded-2xl !p-0",
        onClosed: qn
      }, {
        default: se(() => [N("div", z4e, [N("div", G4e, [N("div", q4e, [W(iv, {
          size: 24,
          color: "#FA8C16"
        })]), Te[36] || (Te[36] = N("div", {
          class: "min-w-0 flex-1"
        }, [N("p", {
          class: "m-0 text-left text-[16px] font-medium leading-7 text-black"
        }, " 确认下架社区模版？ "), N("p", {
          class: "mt-1 text-sm leading-5 text-[#8c8c8c]"
        }, " 下架后，其他用户将无法继续使用该模版。 ")], -1))]), N("div", Y4e, [N("div", {
          role: "button",
          tabindex: "0",
          class: G(["flex h-10 flex-1 items-center justify-center rounded-lg bg-[#f5f5f5] px-3 text-sm leading-6 text-[#262626] transition-colors hover:bg-[#ebebeb]", {
            "cursor-not-allowed opacity-60": q.value,
            "cursor-pointer": !q.value
          }]),
          onClick: qn,
          onKeydown: dt(He(qn, ["prevent"]), ["enter"])
        }, " 取消 ", 42, j4e), N("div", {
          role: "button",
          tabindex: "0",
          class: G(["flex h-10 flex-1 items-center justify-center rounded-lg bg-[#165dff] px-3 text-sm leading-6 text-white transition-colors hover:bg-[#0e4fe5]", {
            "cursor-not-allowed opacity-80": q.value,
            "cursor-pointer": !q.value
          }]),
          onClick: sr,
          onKeydown: dt(He(sr, ["prevent"]), ["enter"])
        }, me(q.value ? "下架中" : "确认下架"), 43, K4e)])])]),
        _: 1
      }, 8, ["modelValue"]), W(qt, {
        modelValue: w.value,
        "onUpdate:modelValue": Te[27] || (Te[27] = Je => w.value = Je),
        width: "747px",
        "append-to-body": "",
        "destroy-on-close": "",
        "show-close": !1,
        class: "template-community-detail-dialog template-community-preview-dialog !rounded-2xl !p-0"
      }, {
        default: se(() => [S.value ? Kt((D(), V("div", W4e, [W(fF, {
          language: O.value,
          "onUpdate:language": Te[25] || (Te[25] = Je => O.value = Je),
          title: De(S.value),
          "preview-content": we.value,
          "allow-html": !1,
          "show-language-switch": !1,
          onBack: Te[26] || (Te[26] = Je => w.value = !1)
        }, {
          metadata: se(() => [N("div", Q4e, [N("div", {
            role: "button",
            tabindex: "0",
            class: G(["template-community-preview-action", {
              "is-active": S.value.liked
            }]),
            onClick: Te[19] || (Te[19] = Je => Ft(S.value, "like")),
            onKeydown: Te[20] || (Te[20] = dt(He(Je => Ft(S.value, "like"), ["prevent"]), ["enter"]))
          }, [W(Id, {
            size: 16
          }), N("span", null, me(Ne(S.value, "likes")), 1)], 34), N("div", {
            role: "button",
            tabindex: "0",
            class: G(["template-community-preview-action", {
              "is-active": S.value.disliked
            }]),
            onClick: Te[21] || (Te[21] = Je => Ft(S.value, "dislike")),
            onKeydown: Te[22] || (Te[22] = dt(He(Je => Ft(S.value, "dislike"), ["prevent"]), ["enter"]))
          }, [W(Id, {
            size: 16,
            class: "rotate-180"
          }), N("span", null, me(Ne(S.value, "dislikes")), 1)], 34), N("div", {
            role: "button",
            tabindex: "0",
            class: G(["template-community-preview-action", {
              "is-active": S.value.collected
            }]),
            onClick: Te[23] || (Te[23] = Je => Ft(S.value, "save")),
            onKeydown: Te[24] || (Te[24] = dt(He(Je => Ft(S.value, "save"), ["prevent"]), ["enter"]))
          }, [W(ot, null, {
            default: se(() => [S.value.collected ? (D(), Se(b(Nm), {
              key: 0
            })) : (D(), Se(b(i2), {
              key: 1
            }))]),
            _: 1
          }), N("span", null, me(Ne(S.value, "collects")), 1)], 34), N("span", X4e, [W(ot, {
            size: 14
          }, {
            default: se(() => [W(b(wP))]),
            _: 1
          }), bt(" " + me(S.value.creatorName || S.value.creatorNickname || "匿名用户"), 1)])])]),
          _: 1
        }, 8, ["language", "title", "preview-content"])])), [[pn, T.value]]) : ce("", !0)]),
        _: 1
      }, 8, ["modelValue"])], 2);
    };
  }
})