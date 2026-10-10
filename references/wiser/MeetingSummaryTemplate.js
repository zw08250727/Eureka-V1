u5e = ie({
  name: "MeetingSummaryTemplate",
  __name: "index",
  emits: ["confirm", "preview", "customTemplate", "openRecordingSettings"],
  setup(e, {
    expose: t,
    emit: n
  }) {
    const r = {
        pageKey: "Meeting_Detail",
        title: "会议详情页"
      },
      a = {
        pageKey: "Profile",
        title: "个人中心"
      },
      s = n,
      c = Mp(),
      l = F(() => {
        var de, ve;
        return (ve = (de = c.userInfo) == null ? void 0 : de.user) != null ? ve : null;
      }),
      u = F(() => {
        var de;
        return ((de = l.value) == null ? void 0 : de.userType) === "ENTERPRISE";
      }),
      i = H(!1),
      d = H(),
      p = H(!1),
      g = H(!1),
      f = H(!1),
      _ = H(null),
      h = H("create"),
      v = H(null),
      y = H(!1),
      E = H(null),
      C = H(!1),
      S = H(!1),
      w = H(null),
      T = H(!1),
      O = H("generate"),
      x = H("generate"),
      R = H(""),
      A = H(""),
      I = H(!1),
      k = H(!1),
      M = H(!1),
      L = H(!1),
      U = H(!1),
      B = H(!1),
      $ = H(!1),
      P = H(!1),
      z = H(!1),
      q = de => de.code === 0 || de.code === 200 || de.code === 1e3 || !!de.success,
      Y = () => {
        Pt({
          type: "warning",
          message: s5e,
          duration: 6e3,
          showClose: !0
        });
      },
      K = () => Re(null, null, function* () {
        var de;
        try {
          const ve = yield bP();
          if (q(ve) && ve.data) {
            const Xe = ve.data.hasVoiceprint,
              Mt = Number((de = ve.data.voiceprintCount) != null ? de : 0);
            P.value = Number.isFinite(Mt) && Mt > 0, z.value = typeof Xe == "number" ? Xe === 0 : !1;
            return;
          }
        } catch (ve) {}
        P.value = !1, z.value = !1;
      }),
      j = H("general"),
      Q = H("custom");
    let re = 0,
      te = 0;
    const Z = H(null),
      ee = new Map(),
      ne = H([]),
      ge = H([]),
      ae = H([]),
      fe = H({}),
      he = H(""),
      oe = H(!1),
      le = H(!1),
      we = H(""),
      Ce = H(""),
      Oe = H(zd()),
      De = H({
        templateType: "SMART_MATCH",
        templateId: "smart-match",
        category: "general",
        language: "zh",
        detailLevel: "standard",
        voiceprintEnabled: !1
      }),
      Ue = F(() => ne.value.filter(de => de.isOfficial === 1)),
      Ne = F(() => [...ne.value.filter(de => de.isOfficial !== 1)]),
      Ze = F(() => j.value === "custom" && Q.value === "favorite"),
      Ye = de => i.value && de === te,
      ke = (de, ve, Xe) => de === re && j.value === ve && Ye(Xe),
      tt = H([]),
      ft = [{
        value: "detailed",
        label: "详细",
        rule: "还原现场，留档存证",
        hint: "逐项议题的背景、各发言人的核心观点与争论点、逻辑推导过程、详尽的方案对比、完整的待办清单。"
      }, {
        value: "standard",
        label: "标准",
        rule: "同步信息，明确任务",
        hint: "会议主题、各议题的主要结论、达成的共识、核心行动项。过滤掉琐碎的语气词和重复讨论。"
      }, {
        value: "brief",
        label: "简洁",
        rule: "结果导向，极速浏览",
        hint: "总结会议主旨、核心决定、最高优先级的待办任务。"
      }],
      it = de => String(de.dataId || ""),
      kt = de => {
        var ve;
        return ((ve = de.name) == null ? void 0 : ve.trim()) || "";
      },
      Gt = dF,
      Yt = (de, ve) => {
        if (ve <= 0) return 0;
        let Xe = 0;
        for (let Mt = 0; Mt < de.length; Mt += 1) Xe = Xe * 31 + de.charCodeAt(Mt) >>> 0;
        return Xe % ve;
      },
      at = (de, ve) => {
        if (!ve.length) return "";
        const Xe = [String(de.id || de.dataId || ""), kt(de), de.scene || ""].join("|");
        return ve[Yt(Xe, ve.length)] || "";
      },
      Tt = de => de === !0 || de === 1 || de === "1" || String(de).toLowerCase() === "true",
      Lt = de => {
        var Xe, Mt;
        const ve = de;
        return Tt((Mt = (Xe = ve.isDefault) != null ? Xe : ve.defaultTemplate) != null ? Mt : ve.default);
      },
      _e = de => we.value ? we.value === it(de) : Lt(de),
      ze = de => {
        const ve = de.find(Lt);
        ve && (we.value = it(ve));
      },
      J = de => {
        if (de.templateType !== "COMMUNITY") return;
        const ve = String(de.templateId || "").trim();
        !ve || ve === "smart-match" || (we.value = ve);
      },
      pe = de => Io(de) || As(de) ? "custom" : j.value,
      Ve = de => de.templateSource === "COMMUNITY" ? "COMMUNITY" : Io(de) ? "CUSTOM" : yl(de) ? "SMART_MATCH" : "PRESET",
      lt = de => {
        const ve = Ve(de);
        return ve === "COMMUNITY" ? 3 : ve === "CUSTOM" ? 2 : 1;
      },
      At = F(() => O.value === "preference"),
      ct = F(() => x.value === "regenerate"),
      vn = F(() => !At.value && !ct.value),
      xn = F(() => ct.value ? "重新总结" : "让 AI 总结更懂你 👋"),
      Sn = F(() => At.value ? "保存并应用" : ct.value ? "开始重新总结" : "立即生成"),
      Fn = F(() => !At.value && !ct.value),
      We = F(() => !ct.value),
      Ft = F(() => $.value && !At.value),
      Dt = F(() => oe.value || ct.value && le.value),
      qn = F(() => !!(Oe.value.name.trim() && Oe.value.content.trim())),
      sr = F(() => O.value === "generate" && !!R.value),
      br = H(!1),
      dn = (de, ve, Xe = "button") => {
        sr.value && wn(de, Xe, ve, {
          routeInfo: r
        });
      },
      Me = (de, ve, Xe = "button") => {
        At.value && wn(de, Xe, ve, {
          routeInfo: a
        });
      },
      st = de => {
        const ve = Math.max(Math.floor(de || 0), 0);
        if (ve > 0 && ve < 60) return "1分钟";
        const Xe = Math.floor(ve / 3600),
          Mt = Math.floor(ve % 3600 / 60),
          jt = ve % 60;
        return Xe > 0 ? `${Xe}小时${Mt}分钟${jt}秒` : Mt > 0 ? `${Mt}分钟${jt}秒` : `${jt}秒`;
      },
      xt = de => {
        var wt, _r, ai, ba;
        const ve = de.trim();
        if (!ve) return null;
        const Xe = ve.match(/(\d+)\s*(小时|时|h|H)/),
          Mt = ve.match(/(\d+)\s*(分钟|分|min|m)/),
          jt = ve.match(/(\d+)\s*(秒|s|S)/),
          Jn = ve.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
        if (Jn) {
          const Qr = Number(Jn[1]),
            Cs = Number(Jn[2]),
            ya = Number((wt = Jn[3]) != null ? wt : 0);
          return Jn[3] ? Qr * 3600 + Cs * 60 + ya : Qr * 60 + Cs;
        }
        if (!Xe && !Mt && !jt) return null;
        const gr = Number((_r = Xe == null ? void 0 : Xe[1]) != null ? _r : 0),
          Cr = Number((ai = Mt == null ? void 0 : Mt[1]) != null ? ai : 0),
          Rr = Number((ba = jt == null ? void 0 : jt[1]) != null ? ba : 0);
        return gr * 3600 + Cr * 60 + Rr;
      },
      sn = de => {
        if (typeof de == "number") return st(de);
        if (typeof de != "string") return "";
        const ve = de.trim(),
          Xe = xt(ve);
        return Xe !== null && Xe > 0 && Xe < 60 ? "1分钟" : ve;
      },
      Gn = de => de === "custom" ? ge.value.filter(Io) : ge.value.filter(ve => !Io(ve) && !As(ve)),
      Kn = F(() => Gn(j.value)),
      {
        previewTemplate: Be,
        previewLanguage: be,
        isPreviewMode: Te,
        previewTemplateTitle: ot,
        previewContent: Bt,
        openPreview: qt,
        closePreview: pn,
        resetPreview: Je
      } = mNe(),
      fn = F(() => !!(Be.value && Io(Be.value))),
      Dn = F(() => !!(Be.value && As(Be.value))),
      Qt = F(() => {
        if (!Be.value) return null;
        if (As(Be.value)) return Be.value;
        if (!Io(Be.value)) return null;
        const de = it(Be.value),
          ve = fe.value[de] || null;
        return ve && Wi(Be.value) ? ve : null;
      }),
      _n = F(() => !fn.value && !Dn.value),
      Qe = F(() => !!Be.value && Io(Be.value) && Wi(Be.value)),
      Nt = F(() => {
        var Xe;
        const de = Qt.value;
        if (!de) return null;
        const ve = de == null ? void 0 : de.metrics;
        return {
          likes: Number((ve == null ? void 0 : ve.likes) || 0),
          dislikes: Number((ve == null ? void 0 : ve.dislikes) || 0),
          collects: Number((ve == null ? void 0 : ve.collects) || 0),
          creator: (de == null ? void 0 : de.creatorName) || (de == null ? void 0 : de.creatorNickname) || ((Xe = l.value) == null ? void 0 : Xe.nickname) || "我"
        };
      }),
      Wt = de => {
        const ve = de == null ? void 0 : de.data;
        return ic(ve && typeof ve == "object" && "data" in ve ? ve.data : ve != null ? ve : de);
      },
      mn = (de, ve) => {
        var Xe, Mt, jt;
        return ye(X(X({}, de), ve), {
          id: ve.id || de.id,
          dataId: ve.dataId || ve.id || de.dataId || de.id,
          templateName: ve.templateName || ve.name || de.templateName || de.name,
          name: ve.name || ve.templateName || de.name || de.templateName,
          iconUrl: ve.iconUrl || de.iconUrl,
          metrics: X(X({}, de.metrics || {}), ve.metrics || {}),
          liked: (Xe = ve.liked) != null ? Xe : de.liked,
          disliked: (Mt = ve.disliked) != null ? Mt : de.disliked,
          collected: (jt = ve.collected) != null ? jt : de.collected,
          creatorName: ve.creatorName || de.creatorName,
          creatorNickname: ve.creatorNickname || de.creatorNickname,
          templateSource: "COMMUNITY"
        });
      },
      Sr = (de, ve, Xe) => {
        fe.value = ye(X({}, fe.value), {
          [de]: mn(fe.value[de] || ve, ve)
        });
        const Mt = jt => it(jt) === de ? mn(jt, ve) : jt;
        Xe === "save" && ve.collected === !1 ? ae.value = ae.value.filter(jt => it(jt) !== de) : ae.value = ae.value.map(Mt), Be.value && As(Be.value) && it(Be.value) === de && (Be.value = mn(Be.value, ve));
      },
      Vr = (de, ve) => {
        const Xe = de.metrics || {},
          jt = !de[ve === "like" ? "liked" : ve === "dislike" ? "disliked" : "collected"],
          Jn = ve === "like" ? "likes" : ve === "dislike" ? "dislikes" : "collects",
          gr = ve === "like" ? "disliked" : ve === "dislike" ? "liked" : "",
          Cr = ve === "like" ? "dislikes" : ve === "dislike" ? "likes" : "";
        return X(ye(X({}, de), {
          liked: ve === "like" ? jt : ve === "dislike" && jt ? !1 : !!de.liked,
          disliked: ve === "dislike" ? jt : ve === "like" && jt ? !1 : !!de.disliked,
          collected: ve === "save" ? jt : !!de.collected,
          metrics: X(ye(X({}, Xe), {
            [Jn]: Math.max(0, Number(Xe[Jn] || 0) + (jt ? 1 : -1))
          }), gr && de[gr] && jt ? {
            [Cr]: Math.max(0, Number(Xe[Cr] || 0) - 1)
          } : {})
        }), gr && jt ? {
          [gr]: !1
        } : {});
      },
      ia = de => Re(null, null, function* () {
        const ve = Qt.value,
          Xe = (ve == null ? void 0 : ve.id) || (ve == null ? void 0 : ve.dataId) || "";
        if (!ve || !Xe) return;
        const Mt = de === "like" ? !!ve.liked : de === "dislike" ? !!ve.disliked : !!ve.collected;
        try {
          const jt = de === "like" ? yield nF(Xe, !Mt) : de === "dislike" ? yield rF(Xe, !Mt) : yield aF(Xe, !Mt);
          if (!Rs(jt)) throw new Error("操作失败，请重试");
          const Jn = Wt(jt),
            gr = Jn.id ? mn(ve, Jn) : Vr(ve, de);
          Sr(Xe, gr, de);
        } catch (jt) {
          Pt.error(jt instanceof Error ? jt.message : "操作失败，请重试");
        }
      }),
      xr = de => Re(null, null, function* () {
        var ve;
        if (!de) return null;
        try {
          const Xe = yield g2(de);
          if (!Rs(Xe)) return null;
          const Mt = Wt(Xe),
            jt = String(Mt.id || Mt.dataId || de).trim();
          return jt ? ye(X({}, Mt), {
            id: jt,
            dataId: jt,
            collected: (ve = Mt.collected) != null ? ve : !0,
            templateSource: "COMMUNITY"
          }) : null;
        } catch (Xe) {
          return null;
        }
      }),
      $a = F(() => (Te.value, "747px")),
      Ua = F(() => {
        if (j.value === "custom") return "选择总结模板";
        if (B.value) {
          const de = ne.value.find(ve => ve.categoryCode === j.value);
          return de && de.categoryCode !== "custom" ? `${de.categoryName}总结模板库` : "总结模板库";
        }
        return "选择总结模板";
      }),
      Ia = F(() => ge.value.filter(Io)),
      $o = F(() => Ia.value),
      na = F(() => !Ze.value && j.value !== "custom" && Gn(j.value).length === 0),
      Va = F(() => Te.value || I.value ? !1 : j.value === "custom" ? Ia.value.length === 0 : na.value),
      Ht = F(() => Ze.value && ae.value.length === 0),
      nn = F(() => !Te.value && j.value !== "custom" && Va.value),
      Hn = F(() => ae.value.map(de => ye(X({}, de), {
        dataId: it(de),
        name: kt(de),
        description: Gt(de),
        statusLabel: lr(de) ? "已下架" : ""
      }))),
      Wn = F(() => !0),
      Mr = F(() => v.value && Ia.value.find(de => it(de) === v.value) || null),
      va = F(() => h.value === "edit" ? "编辑模板" : "新增自定义模板"),
      Ha = F(() => h.value === "edit" ? "保存自定义模板" : "保存至自定义模板"),
      Pe = F(() => ne.value.filter(de => de.isOfficial === 1 && de.categoryCode)),
      Le = (de, ve) => {
        Ye(ve) && (ne.value = de.categories, ge.value = de.templates, ze(de.templates), De.value = de.config, J(de.config), br.value = !!de.config.voiceprintEnabled, u.value && (De.value.voiceprintEnabled = !0), j.value = de.activeCategory, he.value = de.selectedTemplateId);
      },
      Ct = (de, ve) => {
        const Xe = String(ve || "").trim();
        return Xe && de.find(Mt => it(Mt) === Xe) || null;
      },
      En = (de, ve) => {
        if (de) {
          if (ve instanceof HTMLElement) {
            ee.set(de, ve);
            return;
          }
          ee.delete(de);
        }
      },
      Yn = de => {
        if (!de) return;
        const ve = Z.value,
          Xe = ee.get(de);
        if (!ve || !Xe) return;
        const Mt = ve.getBoundingClientRect(),
          jt = Xe.getBoundingClientRect();
        (jt.top < Mt.top || jt.bottom > Mt.bottom) && Xe.scrollIntoView({
          block: "nearest",
          inline: "nearest"
        });
      };
    let Nr = !1;
    const kr = de => {
        oe.value = !1, le.value = !1;
        const ve = it(de);
        he.value = ve, De.value.templateType = Ve(de), De.value.templateId = ve, De.value.category = pe(de), De.value.setDefaultTemplate = !1;
      },
      Or = (de = j.value) => {
        he.value = "", le.value = !1, De.value.templateType = "CUSTOM", De.value.templateId = "", De.value.category = de, De.value.setDefaultTemplate = !1;
      },
      Ja = (de, ve = "preserve") => {
        if (oe.value) return;
        const Xe = M8e({
          list: de,
          selectedTemplateId: he.value,
          configTemplateId: De.value.templateId,
          mode: ve,
          getTemplateId: it,
          isTemplateDefault: Lt
        });
        Xe.kind === "template" && kr(Xe.template);
      },
      Ot = (...Mt) => Re(null, [...Mt], function* (de = j.value, ve = B.value, Xe = "preserve") {
        var gr, Cr;
        const jt = te;
        if (!Ye(jt)) return;
        const Jn = ++re;
        I.value = !0;
        try {
          if (de === "custom" && Q.value === "favorite") {
            const wt = Qh(yield Xh());
            if (!ke(Jn, de, jt)) return;
            const _r = new Set(wt.created.map(ya => String(ya.id || ya.dataId || "").trim()).filter(Boolean)),
              ai = String(((gr = l.value) == null ? void 0 : gr.userId) || ((Cr = l.value) == null ? void 0 : Cr.id) || "").trim(),
              ba = wt.saved.filter(ya => {
                const g$ = String(ya.id || ya.dataId || "").trim();
                return Kr(ya) ? !1 : !(_r.has(g$) || ai && String(ya.creatorId || "").trim() === ai);
              }),
              Qr = yield Cn(ba, jt);
            if (!ke(Jn, de, jt)) return;
            ae.value = Qr, ze(Qr);
            const Cs = ae.value.find(ya => String(ya.id || ya.dataId || "") === De.value.templateId);
            Cs && (he.value = String(Cs.id || Cs.dataId || ""), De.value.templateType = "COMMUNITY", De.value.category = "custom", le.value = Mn(Cs));
            return;
          }
          const Rr = de === "custom" ? yield Re(null, null, function* () {
            const [wt, _r] = yield Promise.allSettled([rx(d_), Xh()]);
            if (wt.status !== "fulfilled") throw wt.reason;
            const ai = _r.status === "fulfilled" ? Qh(_r.value) : {
              created: []
            };
            return fe.value = Object.fromEntries(ai.created.map(ba => [String(ba.id || ba.dataId || ""), ba]).filter(([ba]) => ba)), ax(wt.value).map(ba => {
              const Qr = fe.value[String(ba.dataId || "")];
              return ye(X(X({}, ba), Qr || {}), {
                dataId: ba.dataId,
                name: (Qr == null ? void 0 : Qr.templateName) || (Qr == null ? void 0 : Qr.name) || ba.name,
                prompt: (Qr == null ? void 0 : Qr.prompt) || ba.prompt,
                iconUrl: (Qr == null ? void 0 : Qr.iconUrl) || ba.iconUrl,
                createdAt: (Qr == null ? void 0 : Qr.createdAt) || ba.createdAt,
                templateSource: void 0
              });
            });
          }) : Bf(yield Ff(X({
            language: d_,
            categoryCode: de
          }, !ve && de === De.value.category && De.value.templateId ? {
            templateId: De.value.templateId
          } : {})));
          if (!ke(Jn, de, jt)) return;
          ge.value = Rr.length > 0 ? Rr : [], ze(ge.value), Ja(ge.value, Xe);
        } catch (Rr) {
          if (!ke(Jn, de, jt)) return;
          ge.value = [];
        } finally {
          ke(Jn, de, jt) && (I.value = !1);
        }
      }),
      Yr = de => Re(null, null, function* () {
        const ve = String(de || "").trim();
        if (!ve) return null;
        const Xe = ne.value.filter(jt => jt.isOfficial === 1 && typeof jt.categoryCode == "string" && jt.categoryCode.trim() !== "");
        return (yield Promise.all(Xe.map(jt => Re(null, null, function* () {
          var gr;
          const Jn = String((gr = jt.categoryCode) != null ? gr : "").trim();
          if (!Jn) return null;
          try {
            const Cr = yield Ff({
                language: d_,
                categoryCode: Jn
              }),
              Rr = Bf(Cr);
            return Ct(Rr, ve) ? {
              categoryCode: Jn,
              templates: Rr
            } : null;
          } catch (Cr) {
            return null;
          }
        })))).find(Boolean) || null;
      }),
      Fe = de => Re(null, null, function* () {
        if (!Ye(de) || !(j.value === "general" && ge.value.length > 0 && ge.value.every(Mt => !Io(Mt))) && (j.value = "general", yield Ot("general", B.value, "preserve"), !Ye(de))) return;
        const Xe = D8e({
          templates: ge.value,
          isCustomTemplate: Io,
          isSmartMatchTemplate: yl
        });
        if (Xe.kind === "template") {
          kr(Xe.template);
          return;
        }
        j.value = Xe.activeCategory, he.value = Xe.selectedTemplateId, De.value.templateType = Xe.configPatch.templateType, De.value.templateId = Xe.configPatch.templateId, De.value.category = Xe.configPatch.category;
      }),
      $e = de => Re(null, null, function* () {
        if (!Ye(de)) return;
        const ve = Ct(ge.value, De.value.templateId);
        if (ve) {
          kr(ve);
          return;
        }
        const Xe = k8e({
          templates: ge.value,
          configTemplateId: De.value.templateId,
          getTemplateId: it,
          isTemplateDefault: Lt
        });
        if (Xe.kind === "template") {
          kr(Xe.template);
          return;
        }
        yield Fe(de);
      }),
      _t = (de, ve) => Re(null, null, function* () {
        if (Ye(ve)) {
          I.value = !0;
          try {
            const Xe = yield cIe({
              userId: de,
              showAll: !1
            });
            if (!Ye(ve)) return;
            const Mt = uIe(Xe);
            Le(N8e(Mt), ve);
          } catch (Xe) {
            if (!Ye(ve)) return;
            ne.value = x1, ge.value = [];
          } finally {
            Ye(ve) && (I.value = !1);
          }
        }
      }),
      je = de => Re(null, null, function* () {
        const ve = ne.value.filter(Mt => Mt.categoryCode && Mt.categoryCode !== "custom");
        if (!ve.length) return [];
        const Xe = new Set();
        return yield Promise.all(ve.map(Mt => Re(null, null, function* () {
          try {
            const jt = yield Ff({
              categoryCode: Mt.categoryCode || "",
              language: d_
            });
            Bf(jt).forEach(Jn => {
              const gr = hp(Jn);
              gr && Xe.add(gr);
            });
          } catch (jt) {}
        }))), Ye(de) ? [...Xe] : [];
      }),
      Cn = (de, ve) => Re(null, null, function* () {
        const Xe = yield je(ve);
        return Ye(ve) ? de.map(Mt => {
          const jt = hp(Mt) || at(Mt, Xe);
          return jt ? ye(X({}, Mt), {
            iconUrl: jt
          }) : Mt;
        }) : de;
      }),
      ln = de => Re(null, null, function* () {
        if (Ye(de)) try {
          const ve = yield iIe();
          if (!Ye(de)) return;
          const Xe = lIe(ve);
          if (tt.value = Xe, Xe.length > 0 && !Xe.some(Mt => Mt.value === De.value.language)) {
            const Mt = Xe.find(jt => jt.selected);
            Mt && (De.value.language = Mt.value);
          }
        } catch (ve) {
          if (!Ye(de)) return;
          tt.value = [];
        }
      }),
      Pn = (de, ve, Xe = !1) => Re(null, null, function* () {
        if (!de || !ct.value || !Ye(ve)) return;
        const Mt = X(X(X({}, De.value), de), Xe ? {
          templateType: "COMMUNITY"
        } : {});
        if (De.value = Mt, u.value && (De.value.voiceprintEnabled = !0), oe.value) {
          j.value = "custom", Q.value = "favorite", ge.value = [], Or(uE), I.value = !1;
          return;
        }
        const jt = String(Mt.templateId || "").trim();
        if (jt) {
          if (Mt.templateType === "COMMUNITY") {
            if (j.value = "custom", Q.value = "favorite", De.value.category = "custom", yield Ot("custom", !1, "preserve"), !Ye(ve)) return;
            const Rr = ae.value.find(_r => String(_r.id || _r.dataId || "") === jt);
            if (Rr) {
              if (Kr(Rr)) {
                zr(), yield Fe(ve);
                return;
              }
              Ro(Rr, !0);
              return;
            }
            const wt = yield xr(jt);
            if (!Ye(ve)) return;
            if (wt) {
              if (Kr(wt)) {
                zr(), yield Fe(ve);
                return;
              }
              const [_r] = yield Cn([wt], ve);
              if (!Ye(ve)) return;
              ae.value = [_r, ...ae.value.filter(ai => String(ai.id || ai.dataId || "") !== jt)], Ro(_r, !0);
              return;
            }
            zr(), yield Fe(ve);
            return;
          }
          if (ne.value.some(Rr => Rr.categoryCode === "custom")) {
            if (j.value = "custom", De.value.category = "custom", yield Ot("custom", B.value, "preserve"), !Ye(ve)) return;
            const Rr = Ct(ge.value, jt);
            if (Rr) {
              kr(Rr);
              return;
            }
          }
          const gr = Ct(ge.value, jt);
          if (gr) {
            kr(gr);
            return;
          }
          const Cr = yield Yr(jt);
          if (!Ye(ve)) return;
          if (Cr) {
            j.value = Cr.categoryCode, De.value.category = Cr.categoryCode, ge.value = Cr.templates;
            const Rr = Ct(Cr.templates, jt);
            if (Rr) {
              kr(Rr);
              return;
            }
          }
        }
        if (Mt.templateType === "SMART_MATCH") {
          yield Fe(ve);
          return;
        }
        if (Mt.templateType === "CUSTOM") {
          if (j.value = "custom", De.value.category = "custom", yield Ot("custom", B.value, "preserve"), !Ye(ve)) return;
          const Jn = Ct(ge.value, Mt.templateId);
          if (Jn) {
            kr(Jn);
            return;
          }
        }
        yield $e(ve);
      }),
      jr = (...ve) => Re(null, [...ve], function* (de = {}) {
        var jt, Jn;
        const Xe = ++te;
        k.value = !0, O.value = de.mode || "generate", x.value = de.action || "generate", Q.value = "custom", oe.value = !1, le.value = !1;
        const Mt = !!de.communityTemplate || ((jt = de.initialConfig) == null ? void 0 : jt.templateType) === "COMMUNITY";
        if (de.action === "regenerate" && (Jn = de.initialConfig) != null && Jn.templateId && (he.value = String(de.initialConfig.templateId), Mt ? (j.value = "custom", Q.value = "favorite") : de.initialConfig.templateType === "CUSTOM" && (j.value = "custom", Q.value = "custom")), R.value = de.trackSource || "", A.value = sn(de.durationSeconds), $.value = de.mode !== "preference" && !!de.showDefaultTemplateControl, we.value = "", Ce.value = "", De.value.setDefaultTemplate = !1, Je(), B.value = !1, br.value = !1, i.value = !0, yield Promise.all([_t(de.userId, Xe), ln(Xe)]), !!Ye(Xe) && (yield Pn(de.initialConfig, Xe, Mt), !!Ye(Xe))) {
          if (!ct.value) if (De.value.templateType === "COMMUNITY") {
            if (j.value = "custom", Q.value = "favorite", yield Ot("custom", !1, "preserve"), !Ye(Xe)) return;
            const gr = ae.value.find(wt => String(wt.id || wt.dataId || "") === De.value.templateId),
              Cr = gr ? null : yield xr(String(De.value.templateId || ""));
            if (!Ye(Xe)) return;
            const Rr = gr || Cr;
            if (!Rr || Mn(Rr)) zr(), yield Fe(Xe);else {
              const [wt] = yield Cn([Rr], Xe);
              if (!Ye(Xe)) return;
              ae.value = ae.value.some(_r => String(_r.id || _r.dataId || "") === String(wt.id || wt.dataId || "")) ? ae.value : [wt, ...ae.value], Ro(wt, !0);
            }
          } else yield $e(Xe);
          Ye(Xe) && (ct.value && (De.value.voiceprintEnabled = !1), k.value = !1, yield ut(), Ye(Xe) && Yn(j.value));
        }
      }),
      Hr = () => {
        te += 1, k.value = !1, i.value = !1, x.value = "generate", R.value = "", $.value = !1, B.value = !1, oe.value = !1, le.value = !1, Je();
      },
      ri = () => {
        M.value || (At.value ? Me("Profile_Record_Preference_Close", "个人中心-录音设置（偏好设置弹窗）-关闭按钮") : dn("Meeting_Detail_Gen_Popup_Close", "会议详情页（选择生成方式弹窗）-关闭按钮"), Hr());
      },
      Si = () => {
        M.value || (Me("Profile_Record_Preference_Cancel", "个人中心-录音设置（偏好设置弹窗）-取消按钮"), Hr());
      },
      Jt = de => Re(null, null, function* () {
        de !== uE && dn("Meeting_Detail_Gen_Popup_Industry_Tab", "会议详情页（选择生成方式弹窗）-行业Tab切换", "tab"), Nr = !0, de !== j.value && (B.value = !1, Q.value = "custom"), j.value = de, yield Ot(de, B.value, "preserve");
      }),
      gn = de => Re(null, null, function* () {
        Q.value === de && j.value === "custom" || (Q.value = de, j.value = "custom", yield Ot("custom", !1, "preserve"));
      }),
      Mn = de => {
        const ve = String(de.templateAvailability || "").toLowerCase(),
          Xe = String(de.status || "").toUpperCase();
        return de.available === !1 || ["withdrawn", "off_shelf", "unpublished", "deleted", "forbidden", "not_collected"].includes(ve) || ["WITHDRAWN", "OFF_SHELF", "UNPUBLISHED", "DELETED", "FORBIDDEN"].includes(Xe) || String(de.effectiveMode || "").toUpperCase() === "INTELLIGENT";
      },
      lr = de => {
        const ve = String(de.templateAvailability || "").toLowerCase(),
          Xe = String(de.status || "").toUpperCase();
        return ["withdrawn", "off_shelf", "unpublished"].includes(ve) || ["WITHDRAWN", "OFF_SHELF", "UNPUBLISHED"].includes(Xe);
      },
      Kr = de => {
        const ve = String(de.templateAvailability || "").toLowerCase(),
          Xe = String(de.status || "").toUpperCase();
        return ["deleted", "forbidden", "not_collected"].includes(ve) || ["DELETED", "FORBIDDEN"].includes(Xe);
      },
      zr = () => {
        oe.value = !1, le.value = !1, he.value = "smart-match", De.value.templateType = "SMART_MATCH", De.value.templateId = "smart-match", De.value.category = "general", De.value.setDefaultTemplate = !1, j.value = "general", Q.value = "custom";
      },
      Ro = (de, ve = !1) => {
        const Xe = String(de.id || de.dataId || "").trim();
        if (!Xe) return !1;
        const Mt = Mn(de);
        return Mt && !ve ? (Pt.warning("该社区模版当前不可用，请选择其他模版"), !1) : (oe.value = !1, le.value = Mt, he.value = Xe, De.value.templateType = "COMMUNITY", De.value.templateId = Xe, De.value.category = "custom", De.value.setDefaultTemplate = !1, !0);
      },
      td = de => {
        Ro(de);
      },
      Cg = () => Re(null, null, function* () {
        if (De.value.templateType !== "COMMUNITY") return !0;
        const de = String(De.value.templateId || "").trim();
        if (!de) return !1;
        try {
          const ve = yield Xh();
          if (!Rs(ve)) throw new Error(Xc(ve, "社区模版状态校验失败，请稍后重试"));
          const Mt = Qh(ve).saved.find(jt => String(jt.id || jt.dataId || "") === de);
          return !Mt || Kr(Mt) ? (zr(), !0) : lr(Mt) ? ct.value ? (oe.value = !0, le.value = !0, Pt.warning("该社区模版已不可用，请选择其他模版"), !1) : (zr(), !0) : Mn(Mt) ? ct.value ? (oe.value = !0, le.value = !0, Pt.warning("该社区模版已不可用或不再收藏，请选择其他模版"), !1) : (zr(), !0) : !0;
        } catch (ve) {
          return Pt.error(ve instanceof Error ? ve.message : "社区模版状态校验失败，请稍后重试"), !1;
        }
      }),
      Bp = de => {
        kr(de);
      },
      Dc = de => {
        yl(de) ? dn("Meeting_Detail_Gen_Popup_Smart_Match", "会议详情页（选择生成方式弹窗）-智能匹配卡片") : dn("Meeting_Detail_Gen_Popup_Template_Card", "会议详情页（选择生成方式弹窗）-模板卡片选择"), Bp(de);
      };
    Ie(j, de => Re(null, null, function* () {
      if (de) {
        if (Nr) {
          Nr = !1;
          return;
        }
        yield ut(), Yn(de);
      }
    }));
    const wg = (de, ve) => {
        (de.key === "Enter" || de.key === " ") && (de.preventDefault(), Dc(ve));
      },
      P1 = de => Re(null, null, function* () {
        if (!Io(de) || !Wi(de)) return de;
        const ve = it(de);
        if (!ve) return de;
        try {
          const Xe = yield g2(ve);
          if (!Rs(Xe)) return de;
          const Mt = Wt(Xe);
          return Mt.id ? (fe.value = ye(X({}, fe.value), {
            [ve]: mn(fe.value[ve] || Mt, Mt)
          }), ye(X({}, de), {
            dataId: ve,
            name: Mt.templateName || Mt.name || de.name,
            prompt: Mt.prompt || de.prompt,
            iconUrl: Mt.iconUrl || de.iconUrl,
            templateSource: void 0
          })) : de;
        } catch (Xe) {
          return de;
        }
      }),
      Mc = de => Re(null, null, function* () {
        dn("Meeting_Detail_Gen_Popup_Template_Preview", "会议详情页（选择生成方式弹窗）-模板预览按钮");
        const ve = yield P1(de);
        qt(ve, "zh"), s("preview", ve);
      }),
      Ss = () => {
        s("openRecordingSettings");
      },
      $p = de => {
        (de.key === "Enter" || de.key === " ") && (de.preventDefault(), Ss());
      },
      L1 = de => {
        (de.key === "Enter" || de.key === " ") && (de.preventDefault(), ri());
      },
      Pc = () => Re(null, null, function* () {
        dn("Meeting_Detail_Gen_Popup_More", "会议详情页（选择生成方式弹窗）-查看更多按钮"), f.value = !0;
      }),
      F1 = () => Re(null, null, function* () {
        !i.value || j.value !== "custom" || (yield Ot("custom", !1, "preserve"));
      }),
      Tg = () => {
        dn("Meeting_Detail_Gen_Popup_Custom_Tab", "会议详情页（选择生成方式弹窗）-自定义模版创建"), h.value = "create", v.value = null, Oe.value = zd(), p.value = !0, s("customTemplate");
      },
      xg = de => {
        dn("Meeting_Detail_Gen_Popup_Custom_Edit", "会议详情页（自定义模板编辑页）-编辑按钮"), h.value = "edit", v.value = it(de), Oe.value = mF(de), p.value = !0;
      },
      B1 = () => {
        h.value === "create" && dn("Meeting_Detail_Gen_Popup_Custom_Name", "会议详情页（自定义模板新建页）-模板名称输入框", "input");
      },
      $1 = () => {
        h.value === "create" && dn("Meeting_Detail_Gen_Popup_Custom_Keyword", "会议详情页（自定义模板新建页）-提示词输入框", "input");
      },
      U1 = () => {
        h.value === "create" && dn("Meeting_Detail_Gen_Popup_Custom_Outline", "会议详情页（自定义模板新建页）-模板大纲输入框", "input");
      },
      nd = () => {
        p.value = !1, h.value = "create", v.value = null, Oe.value = zd();
      },
      Up = () => {
        y.value = !1, E.value = null, C.value = !1;
      },
      Vp = () => {
        T.value || (S.value = !1, w.value = null);
      },
      V1 = () => {
        h.value === "edit" && dn("Meeting_Detail_Gen_Popup_Custom_View_Close", "会议详情页（自定义模板预览页）-关闭按钮"), nd();
      },
      H1 = () => Re(null, null, function* () {
        h.value === "create" && dn("Meeting_Detail_Gen_Popup_Custom_Auto_Gen", "会议详情页（自定义模板新建页）-自动生成提示词按钮");
        const de = Oe.value.keywords.trim();
        if (!de) {
          Pt.warning("请先填写关键词");
          return;
        }
        U.value = !0;
        try {
          Oe.value.content = yield gF({
            keywords: de
          });
        } catch (ve) {
          Pt.error("生成示例失败，请重试");
        } finally {
          U.value = !1;
        }
      }),
      Hp = () => Re(null, null, function* () {
        if (qn.value) {
          h.value === "create" ? dn("Meeting_Detail_Gen_Popup_Custom_Save", "会议详情页（自定义模板新建页）-保存按钮") : dn("Meeting_Detail_Gen_Popup_Custom_Save_Lib", "会议详情页（自定义模板预览页）-保存至自定义按钮"), L.value = !0;
          try {
            const {
              isEditing: de,
              editingId: ve,
              savedTemplateId: Xe,
              createdTemplateSnapshot: Mt
            } = yield _2({
              customEditingId: v.value,
              form: Oe.value
            });
            yield Ot(j.value, B.value, "preserve"), j.value = "custom";
            const jt = GN({
              templates: Ia.value,
              editingId: de ? ve : Xe,
              createdTemplateSnapshot: Mt,
              getTemplateId: it
            });
            jt.kind === "template" && kr(jt.template), nd(), Pt.success(de ? "自定义模板已更新" : "自定义模板已保存");
          } catch (de) {
            Pt.error(de instanceof Error ? de.message : "保存失败，请重试");
          } finally {
            L.value = !1;
          }
        }
      }),
      zp = () => Re(null, null, function* () {
        if (!(!qn.value || L.value)) {
          L.value = !0;
          try {
            const {
              isEditing: de,
              editingId: ve,
              savedTemplateId: Xe,
              createdTemplateSnapshot: Mt
            } = yield _2({
              customEditingId: v.value,
              form: Oe.value
            });
            yield Ot("custom", !1, "preserve");
            const jt = GN({
                templates: Ia.value,
                editingId: de ? ve : Xe,
                createdTemplateSnapshot: Mt,
                getTemplateId: it
              }),
              Jn = jt.kind === "template" ? jt.template : null;
            if (!Jn || !it(Jn)) throw new Error("模版已保存，但暂未获取到可发布的模版，请稍后重试");
            _.value = Jn, nd(), g.value = !0;
          } catch (de) {
            Pt.error(de instanceof Error ? de.message : "保存模版失败，请重试");
          } finally {
            L.value = !1;
          }
        }
      }),
      z1 = () => Re(null, null, function* () {
        _.value = null, Q.value = "custom", j.value = "custom", yield Ot("custom", !1, "preserve");
      }),
      rd = de => Re(null, null, function* () {
        const ve = de != null ? de : Mr.value;
        ve && (dn("Meeting_Detail_Gen_Popup_Custom_Delete", "会议详情页（自定义模板编辑页）-删除模板按钮"), E.value = ve, y.value = !0);
      }),
      G1 = () => {
        dn("Meeting_Detail_Gen_Popup_Custom_Delete_Cancel", "会议详情页（自定义模板删除确认）-取消按钮"), Up();
      },
      Og = () => Re(null, null, function* () {
        const de = E.value;
        if (!de || C.value) return;
        dn("Meeting_Detail_Gen_Popup_Custom_Delete_Confirm", "会议详情页（自定义模板删除确认）-删除按钮"), C.value = !0;
        const ve = it(de);
        try {
          yield _F(ve);
        } catch (Xe) {
          C.value = !1, Pt.error(Xe instanceof Error ? Xe.message : "删除失败，请重试");
          return;
        }
        yield Ot(j.value, B.value, "latest-default"), v.value === ve && nd(), j.value = "custom", Up(), Pt.success("已删除自定义模板");
      }),
      q1 = de => Re(null, null, function* () {
        var Xe;
        if (ct.value) {
          De.value.voiceprintEnabled = !1;
          return;
        }
        if (u.value) {
          De.value.voiceprintEnabled = !0;
          return;
        }
        if (dn("Meeting_Detail_Gen_Popup_Voiceprint", "会议详情页（选择生成方式弹窗）-区分声纹开关"), !!!de) {
          De.value.voiceprintEnabled = !1;
          return;
        }
        if (yield K(), !z.value) {
          De.value.voiceprintEnabled = !1, (Xe = d.value) == null || Xe.openDialog();
          return;
        }
        if (!P.value) {
          De.value.voiceprintEnabled = !1, Y();
          return;
        }
        De.value.voiceprintEnabled = !0;
      }),
      Rg = () => !(u.value || ct.value),
      Gp = () => Re(null, null, function* () {
        if (yield K(), !z.value) {
          De.value.voiceprintEnabled = !1;
          return;
        }
        if (!P.value) {
          De.value.voiceprintEnabled = !1, Y();
          return;
        }
        De.value.voiceprintEnabled = !0;
      }),
      qp = () => {
        De.value.voiceprintEnabled = !1;
      },
      ad = de => {
        if (!Ft.value || _e(de) || Ce.value) return;
        const ve = it(de);
        if (!ve) {
          Pt.warning("缺少模板 ID，无法设置默认模板");
          return;
        }
        dn("Meeting_Detail_Gen_Popup_Set_Default", "会议详情页（选择生成方式弹窗）-设为默认模板开关"), Bp(de), Ce.value = ve, sIe({
          templateDataId: ve,
          isDefault: !0,
          templateType: lt(de)
        }).then(Xe => {
          if (!vp(Xe)) throw new Error(ov(Xe, "设置默认模板失败"));
          we.value = ve, ge.value = ge.value.map(Mt => ye(X({}, Mt), {
            isDefault: it(Mt) === ve ? 1 : 0
          })), ae.value = ae.value.map(Mt => ye(X({}, Mt), {
            isDefault: it(Mt) === ve ? 1 : 0
          })), De.value.setDefaultTemplate = !1, Pt.success("已设为默认模板");
        }).catch(Xe => {
          Pt.error(Xe instanceof Error ? Xe.message : "设置默认模板失败");
        }).finally(() => {
          Ce.value = "";
        });
      },
      od = de => {
        var Xe;
        const ve = String(((Xe = fe.value[it(de)]) == null ? void 0 : Xe.status) || "").toUpperCase();
        return ["WITHDRAWN", "OFF_SHELF", "UNPUBLISHED"].includes(ve) ? "已下架" : ["PUBLISHED", "PUBLISH", "ONLINE", "ON_SHELF"].includes(ve) ? "已发布" : "";
      },
      Wi = de => od(de) === "已发布",
      el = de => {
        it(de) && (w.value = de, S.value = !0);
      },
      xe = () => Re(null, null, function* () {
        const de = w.value,
          ve = de ? it(de) : "";
        if (!(!ve || T.value)) {
          T.value = !0;
          try {
            const Xe = yield oF(ve);
            if (!vp(Xe)) throw new Error(ov(Xe, "下架失败，请重试"));
            Pt.success("已下架社区模版"), yield Ot("custom", !1, "preserve"), S.value = !1, w.value = null;
          } catch (Xe) {
            Pt.error(Xe instanceof Error ? Xe.message : "下架失败，请重试");
          } finally {
            T.value = !1;
          }
        }
      }),
      et = () => {
        dn("Meeting_Detail_Gen_Popup_Language", "会议详情页（选择生成方式弹窗）-总结语言下拉", "select");
      },
      Ut = () => {
        dn("Meeting_Detail_Gen_Popup_Detail_Level", "会议详情页（选择生成方式弹窗）-详细程度下拉", "select");
      },
      an = () => Re(null, null, function* () {
        if (M.value || Dt.value || !(yield Cg())) return;
        const de = X({}, De.value);
        if (At.value && u.value && (de.voiceprintEnabled = br.value), At.value) {
          Me("Profile_Record_Preference_Save", "个人中心-录音设置（偏好设置弹窗）-保存偏好设置按钮"), s("confirm", de), Hr();
          return;
        }
        if (R.value === "meeting-detail-summary" && bF("Meeting_Detail_Summary_Generate", "button", "会议详情页-AI总结Tab-立即生成按钮"), ct.value) {
          M.value = !0, s("confirm", de, {
            close: () => {
              M.value = !1, Hr();
            },
            finish: () => {
              M.value = !1;
            }
          });
          return;
        }
        s("confirm", de), Hr();
      });
    return t({
      open: jr,
      close: Hr
    }), (de, ve) => {
      const Xe = Vt("el-icon"),
        Mt = Vt("el-option"),
        jt = Vt("el-select"),
        Jn = Vt("el-switch"),
        gr = Vt("el-button"),
        Cr = Vt("el-dialog"),
        Rr = Gu("loading");
      return D(), V(Ge, null, [W(Cr, {
        modelValue: i.value,
        "onUpdate:modelValue": ve[13] || (ve[13] = wt => i.value = wt),
        width: $a.value,
        class: G(["summary-generation-dialog", {
          "summary-generation-dialog--preview": b(Te),
          "summary-generation-dialog--empty": nn.value
        }]),
        "append-to-body": !0,
        "show-close": !1,
        "close-on-click-modal": !1
      }, {
        default: se(() => [b(Te) ? (D(), V("div", P8e, [W(fF, {
          language: b(be),
          "onUpdate:language": ve[6] || (ve[6] = wt => Wr(be) ? be.value = wt : null),
          title: b(ot),
          "preview-content": b(Bt),
          "allow-html": !Dn.value && !Qe.value,
          "show-language-switch": _n.value,
          onBack: b(pn)
        }, Bo({
          _: 2
        }, [Nt.value ? {
          name: "metadata",
          fn: se(() => {
            var wt, _r, ai, ba, Qr, Cs;
            return [N("div", L8e, [N("div", {
              role: "button",
              tabindex: "0",
              class: G(["inline-flex h-[30px] items-center justify-center gap-1 rounded-[15px] bg-[#f7f8fa] px-2.5 text-xs leading-[18px] text-[#8c8c8c] transition-colors", {
                "cursor-pointer hover:bg-[#f3f7ff] hover:text-[#165dff]": !0,
                "!bg-[#f3f7ff] !text-[#165dff]": (wt = Qt.value) == null ? void 0 : wt.liked
              }]),
              "aria-pressed": !!((_r = Qt.value) != null && _r.liked),
              onClick: ve[0] || (ve[0] = ya => ia("like")),
              onKeydown: ve[1] || (ve[1] = dt(He(ya => ia("like"), ["prevent"]), ["enter"]))
            }, [W(Id, {
              size: 16
            }), bt(" " + me(Nt.value.likes), 1)], 42, F8e), N("div", {
              role: "button",
              tabindex: "0",
              class: G(["inline-flex h-[30px] items-center justify-center gap-1 rounded-[15px] bg-[#f7f8fa] px-2.5 text-xs leading-[18px] text-[#8c8c8c] transition-colors", {
                "cursor-pointer hover:bg-[#f3f7ff] hover:text-[#165dff]": !0,
                "!bg-[#f3f7ff] !text-[#165dff]": (ai = Qt.value) == null ? void 0 : ai.disliked
              }]),
              "aria-pressed": !!((ba = Qt.value) != null && ba.disliked),
              onClick: ve[2] || (ve[2] = ya => ia("dislike")),
              onKeydown: ve[3] || (ve[3] = dt(He(ya => ia("dislike"), ["prevent"]), ["enter"]))
            }, [W(Id, {
              size: 16,
              class: "rotate-180"
            }), bt(" " + me(Nt.value.dislikes), 1)], 42, B8e), N("div", {
              role: "button",
              tabindex: "0",
              class: G(["inline-flex h-[30px] items-center justify-center gap-1 rounded-[15px] bg-[#f7f8fa] px-2.5 text-xs leading-[18px] text-[#8c8c8c] transition-colors", {
                "cursor-pointer hover:bg-[#f3f7ff] hover:text-[#165dff]": !0,
                "!bg-[#f3f7ff] !text-[#165dff]": (Qr = Qt.value) == null ? void 0 : Qr.collected
              }]),
              "aria-pressed": !!((Cs = Qt.value) != null && Cs.collected),
              onClick: ve[4] || (ve[4] = ya => ia("save")),
              onKeydown: ve[5] || (ve[5] = dt(He(ya => ia("save"), ["prevent"]), ["enter"]))
            }, [W(Xe, null, {
              default: se(() => {
                var ya;
                return [(ya = Qt.value) != null && ya.collected ? (D(), Se(b(Nm), {
                  key: 0
                })) : (D(), Se(b(i2), {
                  key: 1
                }))];
              }),
              _: 1
            }), bt(" " + me(Nt.value.collects), 1)], 42, $8e), N("span", U8e, [W(Xe, {
              size: 14,
              class: "mr-1"
            }, {
              default: se(() => [W(b(wP))]),
              _: 1
            }), bt(" " + me(Nt.value.creator), 1)])])];
          }),
          key: "0"
        } : void 0]), 1032, ["language", "title", "preview-content", "allow-html", "show-language-switch", "onBack"])])) : (D(), V("div", V8e, [N("header", H8e, [N("div", z8e, [N("h2", G8e, me(xn.value), 1), N("p", q8e, [At.value ? (D(), V(Ge, {
          key: 0
        }, [bt(me(l5e))], 64)) : ct.value ? (D(), V(Ge, {
          key: 1
        }, [bt(me(c5e))], 64)) : vn.value ? (D(), V(Ge, {
          key: 2
        }, [ve[20] || (ve[20] = N("span", {
          class: "text-[#8c8c8c]"
        }, " 本次设置仅针对该会议生效，想一直用这个风格？去 ", -1)), N("span", {
          role: "button",
          tabindex: "0",
          class: "inline cursor-pointer text-sm text-[#165dff] underline underline-offset-2 transition-colors hover:text-[#4338ca] focus:outline-none",
          onClick: Ss,
          onKeydown: $p
        }, " 「个人中心」→「自动转译总结」 ", 32), ve[21] || (ve[21] = N("span", {
          class: "text-[#8c8c8c]"
        }, "入口设置", -1))], 64)) : ce("", !0)])]), N("div", {
          role: "button",
          tabindex: "0",
          class: "absolute right-6 top-[18px] flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-0 bg-transparent p-0 hover:bg-[#f2f3f5]",
          "aria-label": "关闭",
          onClick: ri,
          onKeydown: L1
        }, [W(Aa, {
          class: "h-4 w-4 !text-[#262626]"
        })], 32)]), N("div", Y8e, [N("div", j8e, [N("section", {
          class: G(["flex w-full min-w-0 flex-row overflow-hidden", B.value ? "h-[min(584px,calc(88vh-156px))] shrink-0" : "h-[332px] shrink-0"])
        }, [N("aside", K8e, [N("div", {
          ref_key: "categoryScrollRef",
          ref: Z,
          class: "msd-category-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain"
        }, [N("div", W8e, [(D(!0), V(Ge, null, Et(Ue.value, wt => (D(), V("button", {
          key: wt.categoryCode,
          ref_for: !0,
          ref: _r => En(wt.categoryCode || "", _r),
          type: "button",
          disabled: k.value,
          class: G(["msd-category-tab-btn flex h-10 w-full cursor-pointer items-center rounded-[8px] border-0 text-left text-sm leading-6 disabled:cursor-not-allowed disabled:opacity-50", j.value === wt.categoryCode ? "bg-[#165dff0d] font-medium !text-[#165dff] hover:bg-[#165dff0d]" : "bg-transparent !text-[#262626] hover:bg-[#f2f3f5]"]),
          onClick: _r => Jt(wt.categoryCode || "")
        }, me(wt.categoryName), 11, Q8e))), 128))]), Ue.value.length > 0 && Ne.value.length > 0 ? (D(), V("div", X8e)) : ce("", !0), N("div", Z8e, [(D(!0), V(Ge, null, Et(Ne.value, wt => (D(), V("button", {
          key: wt.categoryCode,
          ref_for: !0,
          ref: _r => En(wt.categoryCode || "", _r),
          type: "button",
          disabled: k.value,
          class: G(["msd-category-tab-btn flex h-10 cursor-pointer items-center gap-2 rounded-lg border-0 text-sm leading-6 disabled:cursor-not-allowed disabled:opacity-50", j.value === wt.categoryCode ? "bg-[#165dff0d] font-semibold !text-[#165dff] hover:bg-[#165dff0d]" : "bg-transparent !text-[#262626] hover:bg-[#f2f3f5]"]),
          onClick: _r => Jt(wt.categoryCode || "")
        }, [wt.categoryCode === uE ? (D(), Se(c8e, {
          key: 0,
          selected: j.value === wt.categoryCode
        }, null, 8, ["selected"])) : (D(), Se(cF, {
          key: 1,
          selected: j.value === wt.categoryCode
        }, null, 8, ["selected"])), N("span", eke, me(wt.categoryName), 1)], 10, J8e))), 128))])], 512)]), N("div", tke, [!Va.value || j.value === "custom" || Ze.value ? (D(), V("div", nke, [N("div", rke, [N("div", ake, [N("h3", oke, me(Ua.value), 1), j.value === "custom" ? (D(), V("div", ike, [N("div", {
          role: "tab",
          tabindex: "0",
          class: G(["cursor-pointer border-b-2 pb-0.5 text-sm leading-[22px] transition-colors", Q.value === "custom" ? "border-[#165dff] text-[#165dff]" : "border-transparent text-[#8c8c8c]"]),
          onClick: ve[7] || (ve[7] = wt => gn("custom")),
          onKeydown: ve[8] || (ve[8] = dt(He(wt => gn("custom"), ["prevent"]), ["enter"]))
        }, " 自定义 ", 34), N("div", {
          role: "tab",
          tabindex: "0",
          class: G(["cursor-pointer border-b-2 pb-0.5 text-sm leading-[22px] transition-colors", Q.value === "favorite" ? "border-[#165dff] text-[#165dff]" : "border-transparent text-[#8c8c8c]"]),
          onClick: ve[9] || (ve[9] = wt => gn("favorite")),
          onKeydown: ve[10] || (ve[10] = dt(He(wt => gn("favorite"), ["prevent"]), ["enter"]))
        }, " 已收藏 ", 34)])) : ce("", !0)]), !B.value && !na.value ? (D(), V("div", {
          key: 0,
          role: "button",
          tabindex: "0",
          class: "msd-template-more-button inline-flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap border-0 bg-transparent p-0 text-sm leading-[18px] !text-[#165dff] [&_.el-icon]:!text-[#165dff]",
          onClick: Pc,
          onKeydown: [dt(He(Pc, ["prevent"]), ["enter"]), dt(He(Pc, ["prevent"]), ["space"])]
        }, [...(ve[22] || (ve[22] = [N("span", {
          class: "shrink-0"
        }, "前往社区找模版 >>", -1)]))], 40, ske)) : ce("", !0)])])) : ce("", !0), N("div", {
          class: G(["min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4", B.value || Va.value && !Ze.value ? "flex flex-1 flex-col" : "h-[268px] max-h-[268px] flex-none"])
        }, [Ze.value ? Kt((D(), V("div", lke, [Ht.value ? (D(), V("div", cke, [N("img", {
          src: b(HN),
          alt: "",
          width: "64",
          height: "64",
          class: "mb-3 size-16 shrink-0",
          decoding: "async"
        }, null, 8, uke), N("div", {
          role: "button",
          tabindex: "0",
          class: "cursor-pointer text-sm leading-[22px] text-[#165dff] transition-colors hover:text-[#0e4fe5]",
          onClick: Pc,
          onKeydown: dt(He(Pc, ["prevent"]), ["enter"])
        }, " 前往模版社区精选并收藏 ", 40, dke)])) : (D(), V("div", pke, [(D(!0), V(Ge, null, Et(Hn.value, wt => (D(), Se(zN, {
          key: it(wt),
          template: wt,
          selected: he.value === it(wt),
          "show-default-control": Ft.value,
          "is-default-template": _e(wt),
          "status-label": wt.statusLabel,
          disabled: M.value || Mn(wt),
          onPick: td,
          onPreview: Mc,
          onSetAsDefault: ad
        }, null, 8, ["template", "selected", "show-default-control", "is-default-template", "status-label", "disabled"]))), 128))]))])), [[Rr, I.value]]) : j.value === "custom" ? Kt((D(), V("div", {
          key: 1,
          class: G(Va.value ? "flex min-h-0 flex-1 flex-col" : "")
        }, [Ia.value.length === 0 ? (D(), V("div", {
          key: 0,
          class: G(["box-border flex flex-col items-center justify-center px-6 text-center gap-0.5", Va.value ? "min-h-0 flex-1 py-0" : "min-h-[268px] pb-12 pt-10"])
        }, [N("img", {
          src: b(d8e),
          alt: "",
          class: "mb-2 h-[54px] w-[54px] shrink-0"
        }, null, 8, fke), ve[24] || (ve[24] = N("h4", {
          class: "mb-2 mt-0 text-base font-medium leading-[28px] text-[#262626]"
        }, " 自定义模板 ", -1)), ve[25] || (ve[25] = N("p", {
          class: "!mb-4 mt-0 text-[12px] leading-[18px] text-[#8c8c8c]"
        }, " 您在「选择生成方式」中创建的自定义模板也可在此设为默认偏好 ", -1)), N("button", {
          type: "button",
          class: "inline-flex min-h-[32px] cursor-pointer items-center justify-center gap-2 rounded-[6px] !px-3 border border-[#00000014] bg-white px-[18px] text-sm leading-[24px] !text-[#262626] hover:border-[#d9d9d9] hover:bg-[#fafafa]",
          onClick: Tg
        }, [W(i8e, {
          size: 16
        }), ve[23] || (ve[23] = N("span", null, "去创建模板", -1))])], 2)) : (D(), V("div", mke, [B.value ? ce("", !0) : (D(), V("button", {
          key: 0,
          type: "button",
          class: "msd-card msd-card--create relative flex h-[122px] w-full flex-col items-center justify-center gap-3 !border !border-solid !border-[#ebebeb] !bg-white hover:!border-[#d9d9d9] hover:!bg-[#fafafa] [&.is-selected]:!border-[#165dff]",
          onClick: Tg
        }, [N("span", gke, [W(Xe, {
          size: 14
        }, {
          default: se(() => [W(b(CP))]),
          _: 1
        })]), ve[26] || (ve[26] = N("span", {
          class: "text-sm font-medium leading-[22px] text-[#262626]"
        }, " 新建模板 ", -1))])), (D(!0), V(Ge, null, Et($o.value, wt => (D(), V("div", {
          key: it(wt),
          role: "button",
          tabindex: "0",
          class: G(["group msd-card relative flex h-[122px] w-full flex-col items-stretch justify-start overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-[#165dff] focus-visible:ring-offset-2", {
            "is-selected": he.value === it(wt)
          }]),
          "aria-pressed": he.value === it(wt),
          onClick: _r => Dc(wt),
          onKeydown: _r => wg(_r, wt)
        }, [N("div", hke, [N("span", {
          class: "msd-custom-template-card__edit msd-card-preview--edit inline-flex size-[20px] shrink-0 cursor-pointer items-center justify-center rounded-[6px]",
          role: "button",
          tabindex: "0",
          "aria-label": Wi(wt) ? "查看模板" : "编辑模板",
          onClick: He(_r => Wi(wt) ? Mc(wt) : xg(wt), ["stop", "prevent"]),
          onKeydown: dt(He(_r => Wi(wt) ? Mc(wt) : xg(wt), ["prevent"]), ["enter"])
        }, [Wi(wt) ? (D(), Se(sv, {
          key: 0
        })) : (D(), Se(sF, {
          key: 1,
          size: 12,
          class: "msd-card-preview--edit-icon"
        }))], 40, vke), Wi(wt) ? (D(), V("span", {
          key: 0,
          class: "msd-custom-template-card__withdraw msd-card-preview--edit inline-flex size-[20px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border-0 !p-0 transition-colors",
          role: "button",
          tabindex: "0",
          "aria-label": "下架社区模板",
          title: "下架社区模板",
          onClick: He(_r => el(wt), ["stop", "prevent"]),
          onKeydown: dt(He(_r => el(wt), ["stop", "prevent"]), ["enter"])
        }, [W(lF, {
          size: 16
        })], 40, bke)) : ce("", !0), N("button", {
          type: "button",
          class: "msd-custom-template-card__delete msd-card-preview--delete inline-flex size-[20px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border-0 !p-0 transition-colors",
          "aria-label": "删除模板",
          onClick: He(_r => rd(wt), ["stop", "prevent"])
        }, [W(Xe, {
          size: 12,
          class: "msd-card-preview--delete-icon"
        }, {
          default: se(() => [W(b(SP))]),
          _: 1
        })], 8, yke)]), N("div", Eke, [N("div", Ske, [W(lv, {
          template: wt,
          "fallback-magic-stick": ""
        }, null, 8, ["template"])]), N("div", Cke, [N("div", wke, me(kt(wt)), 1), Ft.value && _e(wt) ? (D(), V("span", Tke, " 默认模板 ")) : ce("", !0)]), N("p", xke, me(b(Gt)(wt)), 1), od(wt) ? (D(), V("span", {
          key: 0,
          class: G(["mt-auto w-fit rounded-[3px] bg-[#f3f7ff] px-1.5 text-xs leading-5 text-[#165dff]", {
            "!bg-[#fff2f0] !text-[#f53f3f]": od(wt) === "已下架"
          }])
        }, me(od(wt)), 3)) : ce("", !0)]), Ft.value && !_e(wt) ? (D(), V("span", {
          key: 0,
          role: "button",
          tabindex: "0",
          class: "msd-card-default-action absolute bottom-3 left-1/2 z-[9] flex h-6 w-[84px] -translate-x-1/2 cursor-pointer items-center justify-center gap-1 rounded bg-[#165dff] text-xs leading-[18px] text-white opacity-0 transition-opacity duration-150 hover:bg-[#3975ff] group-focus-within:opacity-100 group-hover:opacity-100",
          onClick: He(_r => ad(wt), ["stop", "prevent"]),
          onKeydown: dt(He(_r => ad(wt), ["stop", "prevent"]), ["enter"])
        }, [W(Xe, {
          size: 16,
          class: "!text-white"
        }, {
          default: se(() => [W(b(Nm))]),
          _: 1
        }), ve[27] || (ve[27] = N("span", {
          class: "whitespace-nowrap"
        }, "默认模版", -1))], 40, Oke)) : ce("", !0), he.value === it(wt) ? (D(), V("span", Rke, [W(Xe, {
          size: 14,
          class: "!text-white"
        }, {
          default: se(() => [W(b(EP))]),
          _: 1
        })])) : ce("", !0)], 42, _ke))), 128))]))], 2)), [[Rr, I.value]]) : Kt((D(), V("div", {
          key: 2,
          class: G(["min-h-0", Va.value ? "flex flex-1 flex-col" : ""])
        }, [na.value ? (D(), V("div", {
          key: 0,
          class: G(["msd-preset-empty-state flex flex-col items-center justify-center", Va.value ? "min-h-0 flex-1" : "min-h-[300px]"])
        }, [N("img", {
          src: b(HN),
          alt: "",
          "aria-hidden": "true",
          class: "h-[107px] w-[100px]"
        }, null, 8, Ake), ve[28] || (ve[28] = N("p", {
          class: "mt-4 text-xs leading-[18px] text-[#8c8c8c]"
        }, " 该分类暂无模板 ", -1))], 2)) : (D(), V("div", Ike, [(D(!0), V(Ge, null, Et(Kn.value, wt => (D(), Se(zN, {
          key: it(wt),
          template: wt,
          selected: he.value === it(wt),
          "show-default-control": Ft.value,
          "is-default-template": _e(wt),
          disabled: M.value,
          onPick: Dc,
          onPreview: Mc,
          onSetAsDefault: ad
        }, null, 8, ["template", "selected", "show-default-control", "is-default-template", "disabled"]))), 128))]))], 2)), [[Rr, I.value]])], 2)])], 2), Kt(N("div", Nke, [ve[34] || (ve[34] = N("div", {
          class: "box-border flex h-[56px] shrink-0 items-center justify-center py-4"
        }, [N("span", {
          class: "w-full text-[14px] font-medium leading-[22px] text-black"
        }, " 全局设置 ")], -1)), N("section", kke, [N("h4", Dke, [N("img", {
          src: b(f8e),
          alt: "",
          width: "16",
          height: "16",
          class: "size-4 shrink-0",
          decoding: "async"
        }, null, 8, Mke), ve[29] || (ve[29] = bt(" 生成配置 ", -1))]), N("div", Pke, [N("div", Lke, [ve[30] || (ve[30] = N("span", {
          class: "shrink-0 text-[14px] leading-[24px] text-[#262626]"
        }, " 总结语言 ", -1)), W(jt, {
          modelValue: De.value.language,
          "onUpdate:modelValue": ve[11] || (ve[11] = wt => De.value.language = wt),
          class: "msd-config-select msd-config-select--language !w-[132px]",
          "suffix-icon": VN,
          placement: "top",
          "popper-class": "msd-ft-select-dropdown",
          onChange: et
        }, {
          default: se(() => [(D(!0), V(Ge, null, Et(tt.value, wt => (D(), Se(Mt, {
            key: wt.value,
            label: wt.label,
            value: wt.value
          }, null, 8, ["label", "value"]))), 128))]),
          _: 1
        }, 8, ["modelValue"])]), N("div", Fke, [ve[31] || (ve[31] = N("span", {
          class: "shrink-0 text-[14px] leading-[24px] text-[#262626]"
        }, " 详细程度 ", -1)), W(jt, {
          modelValue: De.value.detailLevel,
          "onUpdate:modelValue": ve[12] || (ve[12] = wt => De.value.detailLevel = wt),
          class: "msd-config-select msd-config-select--detail !w-[76px]",
          "suffix-icon": VN,
          placement: "top",
          "popper-class": "msd-ft-select-dropdown",
          onChange: Ut
        }, {
          default: se(() => [(D(), V(Ge, null, Et(ft, wt => W(Mt, {
            key: wt.value,
            label: wt.label,
            value: wt.value
          }, null, 8, ["label", "value"])), 64))]),
          _: 1
        }, 8, ["modelValue"])])])]), We.value ? (D(), V("section", Bke, [N("h4", $ke, [N("img", {
          src: b(p8e),
          alt: "",
          width: "16",
          height: "16",
          class: "size-4 shrink-0",
          decoding: "async"
        }, null, 8, Uke), ve[32] || (ve[32] = bt(" 音频增强 ", -1)), W(vF, {
          class: "shrink-0"
        })]), N("div", Vke, [ve[33] || (ve[33] = N("span", {
          class: "shrink-0 text-[14px] leading-[24px] text-[#262626]"
        }, " 声纹识别 ", -1)), N("div", Hke, [W(Jn, {
          class: G(["msd-ft-switch", u.value ? "msd-ft-switch--locked" : ""]),
          "model-value": De.value.voiceprintEnabled,
          "aria-disabled": u.value,
          "before-change": Rg,
          "onUpdate:modelValue": q1
        }, null, 8, ["class", "model-value", "aria-disabled"])]), u.value ? (D(), V("div", zke, " 企业版默认开启 ")) : ce("", !0)])])) : ce("", !0)], 512), [[In, Wn.value && !B.value]])])]), b(Te) ? ce("", !0) : (D(), V("footer", Gke, [N("div", {
          class: G(["flex items-center justify-end gap-3", At.value ? "" : "min-h-12"])
        }, [At.value ? (D(), Se(gr, {
          key: 0,
          class: "!h-[40px] !min-w-[80px] !rounded-[8px] !border-[#f0f0f0] !bg-[#f0f0f0] !px-5 !text-[#262626] hover:!border-[#e8e8e8] hover:!bg-[#e8e8e8] hover:!text-[#141414]",
          onClick: Si
        }, {
          default: se(() => [...(ve[35] || (ve[35] = [bt(" 取消 ", -1)]))]),
          _: 1
        })) : ce("", !0), Fn.value ? (D(), V("div", qke, [W(Xe, {
          size: 16,
          class: "text-[#8c8c8c]"
        }, {
          default: se(() => [W(b(fEe))]),
          _: 1
        }), ve[36] || (ve[36] = N("span", {
          class: "whitespace-nowrap"
        }, "预计扣除时长:", -1)), N("span", Yke, me(A.value), 1)])) : ce("", !0), N("div", jke, [W(gr, {
          type: "primary",
          class: G(At.value ? "msd-preference-primary-btn" : "msd-generate-primary-btn"),
          loading: M.value,
          disabled: Dt.value,
          onClick: an
        }, {
          default: se(() => [At.value ? (D(), V(Ge, {
            key: 1
          }, [bt(me(Sn.value), 1)], 64)) : (D(), V("span", Kke, [M.value ? ce("", !0) : (D(), Se(ix, {
            key: 0,
            size: 16
          })), N("span", Wke, me(Sn.value), 1)]))]),
          _: 1
        }, 8, ["class", "loading", "disabled"])])], 2)]))]))]),
        _: 1
      }, 8, ["modelValue", "width", "class"]), W(uF, {
        modelValue: p.value,
        "onUpdate:modelValue": ve[14] || (ve[14] = wt => p.value = wt),
        form: Oe.value,
        "onUpdate:form": ve[15] || (ve[15] = wt => Oe.value = wt),
        title: va.value,
        "generating-example": U.value,
        saving: L.value,
        "can-save": qn.value,
        "save-button-text": Ha.value,
        "show-publish": !0,
        onClose: V1,
        onGenerateExample: H1,
        onNameFocus: B1,
        onKeywordsFocus: $1,
        onContentFocus: U1,
        onSave: Hp,
        onPublish: zp
      }, null, 8, ["modelValue", "form", "title", "generating-example", "saving", "can-save", "save-button-text"]), W(iF, {
        modelValue: g.value,
        "onUpdate:modelValue": ve[16] || (ve[16] = wt => g.value = wt),
        template: _.value,
        categories: Pe.value,
        onPublished: z1
      }, null, 8, ["modelValue", "template", "categories"]), W(hF, {
        visible: f.value,
        "onUpdate:visible": ve[17] || (ve[17] = wt => f.value = wt),
        onClosed: F1
      }, null, 8, ["visible"]), W(Cr, {
        modelValue: y.value,
        "onUpdate:modelValue": ve[18] || (ve[18] = wt => y.value = wt),
        "align-center": "",
        "append-to": "#app",
        "show-close": !1,
        "destroy-on-close": "",
        "z-index": 3010,
        width: "320px",
        class: "meeting-summary-delete-template-dialog !rounded-2xl !p-0",
        onClosed: Up
      }, {
        default: se(() => [N("div", Qke, [N("div", Xke, [N("div", Zke, [N("div", Jke, [W(iv, {
          size: 24,
          color: "#FA8C16"
        })]), ve[37] || (ve[37] = N("p", {
          class: "m-0 min-w-0 flex-1 text-left text-[16px] font-medium leading-7 text-black"
        }, " 确认删除自定义模板？ ", -1))])]), N("div", e5e, [N("div", {
          class: G(["flex h-10 flex-1 cursor-pointer items-center justify-center rounded-lg bg-[#F5F5F5] px-3 text-sm leading-6 text-[#262626] transition-colors hover:bg-[#EBEBEB]", {
            "cursor-not-allowed opacity-60": C.value
          }]),
          onClick: G1
        }, " 取消 ", 2), N("div", {
          class: G(["flex h-10 flex-1 cursor-pointer items-center justify-center rounded-lg bg-[#165DFF] px-3 text-sm leading-6 text-white transition-colors hover:bg-[#0E4FE5]", {
            "cursor-not-allowed opacity-80": C.value
          }]),
          onClick: Og
        }, me(C.value ? "删除中" : "删除"), 3)])])]),
        _: 1
      }, 8, ["modelValue"]), W(Cr, {
        modelValue: S.value,
        "onUpdate:modelValue": ve[19] || (ve[19] = wt => S.value = wt),
        "align-center": "",
        "append-to": "#app",
        "show-close": !1,
        "destroy-on-close": "",
        "z-index": 3010,
        width: "320px",
        class: "meeting-summary-delete-template-dialog !rounded-2xl !p-0",
        onClosed: Vp
      }, {
        default: se(() => [N("div", t5e, [N("div", n5e, [N("div", r5e, [W(iv, {
          size: 24,
          color: "#FA8C16"
        })]), ve[38] || (ve[38] = N("div", {
          class: "min-w-0 flex-1"
        }, [N("p", {
          class: "m-0 text-left text-[16px] font-medium leading-7 text-black"
        }, " 确认下架社区模版？ "), N("p", {
          class: "mt-1 text-sm leading-5 text-[#8c8c8c]"
        }, " 下架后，其他用户将无法继续使用该模版。 ")], -1))]), N("div", a5e, [N("div", {
          role: "button",
          tabindex: "0",
          class: G(["flex h-10 flex-1 items-center justify-center rounded-lg bg-[#F5F5F5] px-3 text-sm leading-6 text-[#262626] transition-colors hover:bg-[#EBEBEB]", {
            "cursor-not-allowed opacity-60": T.value,
            "cursor-pointer": !T.value
          }]),
          onClick: Vp,
          onKeydown: dt(He(Vp, ["prevent"]), ["enter"])
        }, " 取消 ", 42, o5e), N("div", {
          role: "button",
          tabindex: "0",
          class: G(["flex h-10 flex-1 items-center justify-center rounded-lg bg-[#165DFF] px-3 text-sm leading-6 text-white transition-colors hover:bg-[#0E4FE5]", {
            "cursor-not-allowed opacity-80": T.value,
            "cursor-pointer": !T.value
          }]),
          onClick: xe,
          onKeydown: dt(He(xe, ["prevent"]), ["enter"])
        }, me(T.value ? "下架中" : "确认下架"), 43, i5e)])])]),
        _: 1
      }, 8, ["modelValue"]), W(QT, {
        ref_key: "memberRechargeDialogRef",
        ref: d,
        class: "hidden",
        onSuccess: Gp,
        onFail: qp
      }, null, 512)], 64);
    };
  }
})