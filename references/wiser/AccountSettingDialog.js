o9e = ie({
  name: "AccountSettingDialog",
  __name: "index",
  props: {
    userId: {},
    defaultTab: {
      default: "profile"
    }
  },
  emits: ["update", "recording-settings-saved", "closed"],
  setup(e, {
    expose: t,
    emit: n
  }) {
    const r = {
      all: {
        trackId: "Home_Transcribe_Time_Popup_Tab_All",
        elementText: "首页（录音转写时长弹窗）-全部Tab"
      },
      consume: {
        trackId: "Home_Transcribe_Time_Popup_Tab_Consume",
        elementText: "首页（录音转写时长弹窗）-消费Tab"
      },
      earn: {
        trackId: "Home_Transcribe_Time_Popup_Tab_Get",
        elementText: "首页（录音转写时长弹窗）-获得Tab"
      },
      expire: {
        trackId: "Home_Transcribe_Time_Popup_Tab_Expire",
        elementText: "首页（录音转写时长弹窗）-过期Tab"
      }
    };
    function a(Pe) {
      var En;
      const Le = (En = Pe.amount) != null ? En : 0,
        Ct = Pe.type === "GRANT" || Pe.type === "REFUND" ? Le : -Math.abs(Le);
      return {
        id: Pe.transactionId,
        description: Pe.bizType === "AGENT_LOOP" ? r9e : Pe.sourceDesc || "--",
        amount: Ct,
        date: Pe.createdAt || "--"
      };
    }
    const s = e,
      c = H(!1),
      l = H(!1),
      u = H(),
      i = H(null),
      d = H({
        nickname: "",
        phone: "",
        personalSignature: "",
        email: "",
        socialIdentity: "",
        school: "",
        professionType: "",
        industryName: "",
        company: ""
      }),
      p = H(!1),
      g = H(!1),
      f = H([]),
      _ = H([]),
      h = H([]),
      v = H("profile"),
      y = H(null);
    let E = 0;
    const C = [{
        key: "profile",
        label: "个人信息",
        usesContentHeader: !1
      }, {
        key: "points",
        label: "积分明细",
        usesContentHeader: !1
      }, {
        key: "recording",
        label: "录音设置",
        usesContentHeader: !1
      }, {
        key: "recordingDuration",
        label: "录音转写时长",
        usesContentHeader: !1
      }],
      S = F(() => C.find(Pe => Pe.key === v.value)),
      w = F(() => {
        var Pe;
        return ((Pe = S.value) == null ? void 0 : Pe.label) || "";
      }),
      T = F(() => {
        var Pe, Le;
        return (Le = (Pe = S.value) == null ? void 0 : Pe.usesContentHeader) != null ? Le : !0;
      }),
      O = Pe => !!(Pe && C.some(Le => Le.key === Pe)),
      x = {
        autoTranscribeSummary: !1,
        locationCaptureEnabled: !0,
        voiceprintEnabled: !1,
        hasVoiceprintProfile: !1,
        terminologyEnabled: !1,
        summaryPreference: {
          templateMode: "SMART_MATCH",
          templateId: "smart-match",
          category: "general",
          language: "zh",
          detailLevel: "standard",
          setDefaultTemplate: !1
        }
      },
      R = H(ye(X({}, x), {
        summaryPreference: X({}, x.summaryPreference)
      })),
      A = H(!1),
      I = H(!1),
      k = H(!1),
      M = H(),
      L = H(),
      {
        availableCredits: U,
        expiringThisMonth: B,
        memberCredits: $,
        taskCredits: P,
        purchaseCredits: z,
        giftCredits: q,
        refreshPoints: Y
      } = kl(),
      K = Mp(),
      j = F(() => {
        var Pe, Le;
        return (Le = (Pe = K.userInfo) == null ? void 0 : Pe.user) != null ? Le : null;
      }),
      Q = F(() => {
        var Pe;
        return ((Pe = j.value) == null ? void 0 : Pe.userType) === "PLATFORM";
      }),
      re = F(() => {
        var Pe;
        return ((Pe = j.value) == null ? void 0 : Pe.userType) === "ENTERPRISE";
      }),
      te = F(() => {
        var Pe;
        return ((Pe = j.value) == null ? void 0 : Pe.userType) === "ENTERPRISE";
      }),
      Z = F(() => {
        var Le;
        const Pe = (Le = y.value) == null ? void 0 : Le.baseReward;
        return typeof Pe == "number" && Number.isFinite(Pe) ? Pe : null;
      }),
      ee = F(() => {
        var Pe;
        return Q.value && ((Pe = y.value) == null ? void 0 : Pe.status) !== "COMPLETED" && Z.value !== null;
      }),
      ne = F(() => te.value ? "开启后，会在录音时获取所在地理位置；企业用户默认开启，不支持关闭，且自动获取的位置不支持修改" : "开启后，会在录音时获取所在地理位置"),
      ge = F(() => te.value || k.value),
      ae = F(() => re.value ? [] : [{
        label: "会员积分",
        value: $.value,
        className: "mt-2"
      }, {
        label: "任务积分",
        value: P.value
      }, {
        label: "充值积分",
        value: z.value
      }, {
        label: "赠送积分",
        value: q.value,
        className: "mb-2"
      }]),
      fe = H("all"),
      he = H("all"),
      oe = H([]),
      le = H(1),
      we = H(!1),
      Ce = H(!1),
      Oe = H(0),
      De = H(0),
      Ue = H(null),
      Ne = H([]),
      Ze = H(!1),
      Ye = H(!1),
      ke = H([]),
      tt = H(1),
      ft = H(!1),
      it = H(!1),
      kt = H(0),
      Gt = H(null);
    let Yt = 0,
      at = 0,
      Tt = 0;
    function Lt() {
      return Re(this, null, function* () {
        const Pe = ++Tt;
        if (Gt.value = null, !!Q.value) try {
          const Le = yield AL();
          if (Pe !== Tt) return;
          const Ct = Le.memberMaxSavingAmount;
          Gt.value = typeof Ct == "number" && Number.isFinite(Ct) && Ct > 0 ? Ct : null;
        } catch (Le) {
          if (Pe !== Tt) return;
          console.error("获取会员最大优惠金额失败:", Le), Gt.value = null;
        }
      });
    }
    const _e = F(() => Ne.value.reduce((Pe, Le) => {
      var Ct;
      return Pe + Math.max((Ct = Le.remainingQuota) != null ? Ct : 0, 0);
    }, 0));
    function ze() {
      if (fe.value === "earn") return "RECEIVE";
      if (fe.value === "spend") return "EXPENDITURE";
    }
    function J(Pe) {
      return Re(this, null, function* () {
        var Ct, En, Yn;
        Pe && (oe.value = [], le.value = 1);
        const Le = le.value;
        if (!(Le > 1 && !we.value) && !Ce.value) {
          Ce.value = !0;
          try {
            const Nr = ze(),
              kr = (Yn = (En = (Ct = K.userInfo) == null ? void 0 : Ct.user) == null ? void 0 : En.userId) != null ? Yn : s.userId,
              {
                data: Or
              } = yield MTe(ye(X({}, Nr !== void 0 && {
                type: Nr
              }), {
                page: Le,
                size: dE,
                userId: kr
              })),
              Ja = Or.pagination.list.map(a);
            Pe ? oe.value = Ja : oe.value = [...oe.value, ...Ja], we.value = Or.pagination.hasNext, Or.pagination.hasNext && (le.value = Le + 1), Or.totalReceived !== void 0 && (Oe.value = Or.totalReceived), Or.totalExpenditure !== void 0 && (De.value = Or.totalExpenditure);
          } finally {
            Ce.value = !1;
          }
        }
      });
    }
    function pe(Pe) {
      const Le = Pe.target;
      if (!Le || Ce.value || !we.value) return;
      const {
        scrollTop: Ct,
        clientHeight: En,
        scrollHeight: Yn
      } = Le;
      Ct + En >= Yn - 50 && J(!1);
    }
    function Ve() {
      return he.value === "earn" ? "GRANT" : he.value === "consume" ? "CONSUME" : he.value === "expire" ? "EXPIRED" : "ALL";
    }
    function lt(Pe) {
      return Pe.amountDisplay;
    }
    function At() {
      return Re(this, null, function* () {
        const Pe = ++Yt;
        Ye.value = !0, Ne.value = [], Ze.value = !1;
        try {
          const Le = yield BL();
          if (Pe !== Yt) return;
          Ne.value = Le.records, Ze.value = !!Le.unlimited, v5(Le.records.reduce((Ct, En) => {
            var Yn;
            return Ct + Math.max((Yn = En.remainingQuota) != null ? Yn : 0, 0);
          }, 0));
        } catch (Le) {
          if (Pe !== Yt) return;
          console.error("获取剩余录音转写时长失败:", Le), Ne.value = [], Ze.value = !1;
        } finally {
          Pe === Yt && (Ye.value = !1);
        }
      });
    }
    function ct(Pe) {
      return Re(this, null, function* () {
        if (Pe) ke.value = [], tt.value = 1, ft.value = !1, kt.value = 0;else if (it.value || !ft.value) return;
        const Le = Pe ? 1 : tt.value,
          Ct = ++at;
        it.value = !0;
        try {
          const En = yield l3e({
            recordType: Ve(),
            current: Le,
            size: dE
          });
          if (Ct !== at) return;
          Pe ? ke.value = En.records : ke.value = [...ke.value, ...En.records], kt.value = En.total, ft.value = ke.value.length < kt.value, ft.value && (tt.value = Le + 1);
        } catch (En) {
          if (Ct !== at) return;
          console.error("获取录音转写明细失败:", En), ke.value = [], kt.value = 0, ft.value = !1;
        } finally {
          Ct === at && (it.value = !1);
        }
      });
    }
    function vn(Pe) {
      const Le = Pe.target;
      if (!Le || it.value || !ft.value) return;
      const {
        scrollTop: Ct,
        clientHeight: En,
        scrollHeight: Yn
      } = Le;
      Ct + En >= Yn - 50 && ct(!1);
    }
    const xn = F(() => d.value.personalSignature.length),
      Sn = F(() => {
        var Le;
        if (!d.value.socialIdentity) return !1;
        const Pe = f.value.find(Ct => Ct.value === d.value.socialIdentity);
        return ((Le = Pe == null ? void 0 : Pe.label) != null ? Le : "").includes("学生");
      }),
      Fn = F(() => {
        const Pe = d.value.socialIdentity;
        return !Pe || Sn.value ? !1 : Pe === "EMPLOYEE" || Pe === "ENTREPRENEUR";
      }),
      We = F(() => {
        var Ct, En;
        const Pe = d.value.socialIdentity;
        if (!Pe || Sn.value) return !1;
        if (Pe === "FREELANCER") return !0;
        const Le = f.value.find(Yn => Yn.value === Pe);
        return ((Ct = Le == null ? void 0 : Le.label) != null ? Ct : "").includes("自由职业") || ((En = Le == null ? void 0 : Le.label) != null ? En : "").includes("其他");
      }),
      Ft = F(() => Fn.value || We.value),
      Dt = F(() => {
        var Pe;
        return !!((Pe = i.value) != null && Pe.email);
      }),
      qn = F(() => {
        var Le, Ct, En;
        const Pe = String((En = (Ct = (Le = i.value) == null ? void 0 : Le.phone) != null ? Ct : d.value.phone) != null ? En : "").trim();
        return !(!Pe || Pe === "未设置");
      }),
      sr = () => Re(null, null, function* () {
        var Pe, Le, Ct;
        try {
          const [En, Yn, Nr] = yield Promise.all([V3("socialIdentity"), V3("occupationType"), Vbe()]);
          f.value = (Pe = En == null ? void 0 : En.data) != null ? Pe : [], _.value = (Le = Yn == null ? void 0 : Yn.data) != null ? Le : [], h.value = (Ct = Nr == null ? void 0 : Nr.data.list) != null ? Ct : [];
        } catch (En) {}
      }),
      br = () => Re(null, null, function* () {
        var Le;
        const Pe = ++E;
        if (!Q.value) {
          y.value = null;
          return;
        }
        try {
          const {
            data: Ct
          } = yield KT();
          if (Pe !== E) return;
          y.value = (Le = Array.isArray(Ct) ? Ct.find(En => En.taskCode === a9e) : null) != null ? Le : null;
        } catch (Ct) {
          if (Pe !== E) return;
          y.value = null;
        }
      }),
      dn = Pe => Re(null, null, function* () {
        c.value = !0;
        const Le = O(Pe) ? Pe : O(s.defaultTab) ? s.defaultTab : "profile";
        v.value = Le, fe.value = "all", he.value = "all", c.value = !0, yield Promise.all([Nt(), sr(), br()]), Y();
      });
    Ie([c, v], ([Pe, Le], [Ct, En]) => {
      if (!(!Pe || !(Le !== En) && Ct)) {
        if (Le === "points") {
          J(!0);
          return;
        }
        if (Le === "recording") {
          be();
          return;
        }
        Le === "recordingDuration" && Promise.all([At(), ct(!0), Lt()]);
      }
    }), Ie(fe, () => {
      c.value && v.value === "points" && J(!0);
    }), Ie(he, () => {
      c.value && v.value === "recordingDuration" && ct(!0);
    }), Ie(() => d.value.socialIdentity, () => {
      var Pe;
      (Pe = u.value) == null || Pe.clearValidate(["school", "professionType", "industryName", "company"]);
    });
    const Me = () => {
        var Pe;
        v.value === "recordingDuration" ? wn("Home_Transcribe_Time_Popup_Close", "button", "首页（录音转写时长弹窗）-关闭按钮") : wn("Home_Profile_Popup_Close", "button", "首页-个人信息弹窗-关闭按钮"), c.value = !1, Yt += 1, at += 1, Tt += 1, d.value = {
          nickname: "",
          phone: "",
          personalSignature: "",
          email: "",
          socialIdentity: "",
          school: "",
          professionType: "",
          industryName: "",
          company: ""
        }, fe.value = "all", he.value = "all", Ne.value = [], Ze.value = !1, Ye.value = !1, ke.value = [], tt.value = 1, ft.value = !1, it.value = !1, kt.value = 0, Gt.value = null, E += 1, y.value = null, (Pe = u.value) == null || Pe.clearValidate();
      },
      st = () => {
        xr("closed");
      },
      xt = Pe => ye(X(X({}, x), Pe || {}), {
        summaryPreference: X(X({}, x.summaryPreference), (Pe == null ? void 0 : Pe.summaryPreference) || {})
      }),
      sn = Pe => Pe !== !1;
    Ie(te, Pe => {
      Pe && (R.value = xt(ye(X({}, R.value), {
        locationCaptureEnabled: !0
      })));
    });
    const Gn = Pe => (Pe == null ? void 0 : Pe.code) === 0 || (Pe == null ? void 0 : Pe.code) === 200 || (Pe == null ? void 0 : Pe.code) === 1e3 || !!(Pe != null && Pe.success),
      Kn = Pe => {
        var Ct;
        const Le = (Ct = Pe == null ? void 0 : Pe.response) == null ? void 0 : Ct.data;
        return (Le == null ? void 0 : Le.message) || (Le == null ? void 0 : Le.msg) || "";
      },
      Be = Pe => Re(null, null, function* () {
        const Le = xt(R.value);
        R.value = Pe.next, I.value = !0;
        try {
          const Ct = yield Pe.request();
          return Gn(Ct) ? (xr("recording-settings-saved", R.value), Pt.success(Pe.successMessage), !0) : (R.value = Le, Pt.error(Ct.message || Ct.msg || Pe.failureMessage || "保存失败，请重试"), !1);
        } catch (Ct) {
          return R.value = Le, console.error(Pe.errorLog, Ct), Pt.error(Pe.failureMessage || "保存失败，请重试"), !1;
        } finally {
          I.value = !1;
        }
      }),
      be = () => Re(null, null, function* () {
        var Pe;
        try {
          A.value = !0;
          const Le = xt(R.value),
            [Ct, En] = yield Promise.allSettled([Fbe(s.userId), qwe()]);
          if (Ct.status === "fulfilled") {
            const Yn = Ct.value;
            Gn(Yn) && Yn.data && (Le.autoTranscribeSummary = !!Yn.data.autoTranscribeSummary);
          } else console.warn("获取自动转译总结设置失败，使用默认设置:", Ct.reason);
          if (te.value) Le.locationCaptureEnabled = !0;else if (En.status === "fulfilled") {
            const Yn = En.value;
            Gn(Yn) && (Le.locationCaptureEnabled = sn((Pe = Yn.data) == null ? void 0 : Pe.enabled));
          } else console.warn("获取地理位置开关失败，使用默认设置:", En.reason);
          R.value = xt(Le);
        } catch (Le) {
          console.warn("获取录音设置失败，使用默认设置:", Le), R.value = xt(ye(X({}, R.value), {
            locationCaptureEnabled: te.value ? !0 : R.value.locationCaptureEnabled
          }));
        } finally {
          A.value = !1;
        }
      }),
      Te = Pe => Re(null, null, function* () {
        I.value = !0;
        try {
          const Le = yield $be({
            enabled: Pe
          });
          return Gn(Le) ? (Pt.success("设置已保存"), !0) : (Pt.error(Le.message || Le.msg || "保存失败，请重试"), !1);
        } catch (Le) {
          return console.error("保存自动转译总结设置失败:", Le), Pt.error(Kn(Le) || "保存失败，请重试"), !1;
        } finally {
          I.value = !1;
        }
      }),
      ot = Pe => {
        const Le = Pe.templateType === "SMART_MATCH";
        return ye(X({
          language: Pe.language,
          intelligentTemplateEnabled: Le
        }, Le ? {} : {
          templateDataId: Pe.templateId,
          templateType: Pe.templateType === "COMMUNITY" ? 3 : Pe.templateType === "CUSTOM" ? 2 : 1
        }), {
          voiceprintEnabled: !!Pe.voiceprintEnabled,
          detailLevel: Pe.detailLevel === "detailed" ? 1 : Pe.detailLevel === "brief" ? 3 : 2
        });
      },
      Bt = Pe => Re(null, null, function* () {
        const Le = xt(ye(X({}, R.value), {
            voiceprintEnabled: !!Pe.voiceprintEnabled,
            summaryPreference: {
              templateMode: Pe.templateType === "SMART_MATCH" ? "SMART_MATCH" : "DEFAULT_TEMPLATE",
              templateId: Pe.templateId,
              category: Pe.category,
              language: Pe.language,
              detailLevel: Pe.detailLevel,
              setDefaultTemplate: !!Pe.setDefaultTemplate
            }
          })),
          Ct = ot(Pe);
        return Be({
          next: Le,
          request: () => Ube(Ct),
          successMessage: "偏好设置已保存",
          errorLog: "保存偏好设置失败:"
        });
      }),
      qt = () => {
        const Pe = !R.value.autoTranscribeSummary;
        return Ua("Profile_Record_Auto_Translate", "个人中心-录音设置-自动转译总结开关"), Te(Pe);
      },
      pn = Pe => {
        xr("recording-settings-saved", xt(ye(X({}, R.value), {
          autoTranscribeSummary: !!Pe
        })));
      },
      Je = Pe => Re(null, null, function* () {
        if (te.value) return R.value = xt(ye(X({}, R.value), {
          locationCaptureEnabled: !0
        })), !1;
        const Le = xt(R.value),
          Ct = xt(ye(X({}, R.value), {
            locationCaptureEnabled: Pe
          }));
        R.value = Ct, k.value = !0;
        try {
          const En = yield Ywe({
            enabled: Pe
          });
          return Gn(En) ? (xr("recording-settings-saved", R.value), Pt.success("设置已保存"), !0) : (R.value = Le, Pt.error(En.message || En.msg || "保存失败，请重试"), !1);
        } catch (En) {
          return R.value = Le, console.error("保存获取地理位置设置失败:", En), Pt.error("保存失败，请重试"), !1;
        } finally {
          k.value = !1;
        }
      }),
      fn = Pe => {
        Ua("Profile_Record_Location_Capture", "个人中心-录音设置-获取地理位置开关"), Je(!!Pe);
      },
      Dn = () => {
        var Pe;
        Ua("Profile_Record_Preference", "个人中心-录音设置-偏好设置入口"), (Pe = M.value) == null || Pe.open({
          mode: "preference",
          userId: s.userId
        });
      },
      Qt = () => {
        g.value = !0;
      },
      _n = Pe => Re(null, null, function* () {
        yield Bt(Pe);
      }),
      Qe = () => {
        v.value = "recording";
      },
      Nt = () => Re(null, null, function* () {
        try {
          l.value = !0;
          const Pe = yield Pbe(s.userId);
          Pe.code === 200 && Pe.success ? (i.value = Pe.data, d.value = {
            nickname: Pe.data.nickname || "",
            phone: Pe.data.phone || "",
            personalSignature: Pe.data.personalSignature || "",
            email: Pe.data.email || "",
            socialIdentity: Pe.data.socialIdentity || "",
            school: Pe.data.school || "",
            professionType: Pe.data.professionType || "",
            industryName: Pe.data.industryName || "",
            company: Pe.data.company || ""
          }) : Pt.error(Pe.message || "获取用户信息失败");
        } catch (Pe) {
          console.error("获取用户信息失败:", Pe), Pt.error("获取用户信息失败");
        } finally {
          l.value = !1;
        }
      }),
      Wt = () => Re(null, null, function* () {
        if (wn("Home_Profile_Popup_Edit", "button", "首页-个人信息弹窗-编辑按钮"), !!u.value) {
          try {
            yield u.value.validate();
          } catch (Pe) {
            Pt.error("请检查必填项是否填写完整");
            return;
          }
          try {
            l.value = !0;
            const Pe = X({
              nickname: d.value.nickname,
              personalSignature: d.value.personalSignature,
              socialIdentity: d.value.socialIdentity
            }, !Dt.value && {
              email: d.value.email
            });
            Sn.value ? Pe.school = d.value.school : (Pe.professionType = d.value.professionType, Pe.industryName = d.value.industryName, Pe.company = d.value.company);
            const Le = yield Lbe(Pe);
            if (Le.code === 200 && Le.success) {
              Uj(d.value.nickname);
              const Ct = Le.data;
              (Ct == null ? void 0 : Ct.creditsGranted) === !0 ? (y.value && (y.value = ye(X({}, y.value), {
                status: "COMPLETED"
              })), Me(), xr("update"), Hu.success({
                content: "信息已保存",
                count: T1(Ct.creditsAmount)
              }), yield Y()) : (Me(), xr("update"), Pt.success("更新成功"));
            } else Pt.error(Le.message || "更新失败");
          } catch (Pe) {
            console.error("接口请求失败:", Pe), Pt.error("网络请求失败，请稍后重试");
          } finally {
            l.value = !1;
          }
        }
      }),
      mn = (Pe, Le, Ct) => {
        if (!Le) return Ct(new Error("请输入昵称"));
        if (Le.length > 10) return Ct(new Error("昵称最多10个字符"));
        if (!/^[\u4e00-\u9fa5a-zA-Z0-9_\-.]+$/.test(Le)) return Ct(new Error("昵称只能包含中文、英文、数字、下划线、连字符和点"));
        if (/^[_\-.]|[_\-.]$/.test(Le)) return Ct(new Error("昵称不能以特殊符号开头或结尾"));
        if (/[_\-.]{2,}/.test(Le)) return Ct(new Error("特殊符号不能连续使用"));
        Ct();
      },
      Sr = (Pe, Le, Ct) => {
        if (!Le) return Ct();
        if (Le.length > 100) return Ct(new Error("个性签名最多100个字符"));
        const En = ["⚔", "🗡", "🔪", "🔫", "💣", "🧨", "💰", "💵", "💴", "💶", "💷", "💳", "💎", "🎰", "🎲", "☠", "💀", "👺", "👹", "🚫", "⛔"];
        for (const Nr of En) if (Le.includes(Nr)) return Ct(new Error("个性签名不能包含攻击性或误导性符号"));
        if (/<script|javascript:|onerror=|onclick=|<iframe|eval\(/i.test(Le)) return Ct(new Error("个性签名包含不允许的内容"));
        Ct();
      },
      Vr = (Pe, Le, Ct) => {
        if (Dt.value) return Ct();
        if (!Le) return Ct(new Error("请输入邮箱"));
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Le)) return Ct(new Error("请输入有效的邮箱地址"));
        Ct();
      },
      ia = F(() => X(ye(X({
        nickname: [{
          required: !0,
          validator: mn,
          trigger: "blur"
        }]
      }, qn.value ? {
        phone: [{
          required: !0
        }]
      } : {}), {
        email: [{
          required: !0,
          validator: Vr,
          trigger: "blur"
        }],
        socialIdentity: [{
          required: !0,
          message: "请选择社会身份",
          trigger: "change"
        }],
        personalSignature: [{
          validator: Sr,
          trigger: "blur"
        }]
      }), Sn.value ? {
        school: [{
          required: !0,
          message: "请输入所属院校",
          trigger: "blur"
        }, {
          max: 100,
          message: "最多100个字符",
          trigger: "blur"
        }]
      } : Fn.value ? {
        professionType: [{
          required: !0,
          message: "请选择职业类型"
        }],
        industryName: [{
          required: !0,
          message: "请选择所在领域",
          trigger: "change"
        }],
        company: [{
          required: !0,
          message: "请输入所属公司",
          trigger: "blur"
        }]
      } : We.value ? {
        professionType: [],
        industryName: [],
        company: [{
          required: !0,
          message: "请输入所属公司",
          trigger: "blur"
        }]
      } : {
        professionType: [],
        industryName: [],
        company: []
      })),
      xr = n,
      $a = {
        pageKey: "Profile",
        title: "个人中心"
      },
      Ua = (Pe, Le, Ct = "button") => {
        wn(Pe, Ct, Le, {
          routeInfo: $a
        });
      },
      Ia = Pe => {
        Pe.stopPropagation(), p.value = !0, wn("Profile_Popup_Avatar_Add", "button", "首页-个人信息弹窗-头像添加");
      },
      $o = Pe => {
        i.value && (i.value.avatarUrl = Pe), xr("update");
      },
      na = Pe => {
        v.value = Pe, Pe === "points" ? wn("Home_Profile_Popup_Points_Detail", "tab", "首页-个人信息弹窗-积分明细tab") : Pe === "recording" ? Ua("Profile_Record_Tab", "个人中心-录音设置Tab", "tab") : Pe === "recordingDuration" ? wn("Home_Profile_Popup_Recording_Duration_Tab", "tab", "首页-个人信息弹窗-录音转写时长tab") : wn("Home_Profile_Popup_Info_Tab", "tab", "首页-个人信息弹窗-个人信息tab");
      },
      Va = () => {
        dn();
      },
      Ht = Pe => {
        fe.value = Pe;
      },
      nn = Pe => {
        const Le = r[Pe];
        wn(Le.trackId, "tab", Le.elementText), Pe === "consume" && wn("Home_Member_Popup_History_Scroll_Show", "show", "首页（会员购买弹窗）-历史购买动态滚动条曝光"), he.value = Pe;
      },
      Hn = () => {
        var Pe;
        wn("Home_Profile_Popup_Recording_Duration_Upgrade", "button", "个人中心-录音转写时长-升级会员最高省标签"), (Pe = L.value) == null || Pe.openDialog({
          initialTab: "member"
        });
      },
      Wn = (Pe, Le) => {
        wn(`Home_Profile_Popup_${Pe}_Input`, "input", `首页-个人信息弹窗-${Le}输入框`);
      },
      Mr = Pe => zt(Pe).format("YYYY-MM-DD HH:mm:ss"),
      va = Pe => zt(Pe).format("YYYY-MM-DD HH:mm"),
      Ha = Pe => `${Pe}分钟`;
    return t({
      openDialog: dn
    }), (Pe, Le) => {
      const Ct = Vt("el-form-item"),
        En = Vt("el-form"),
        Yn = Vt("el-switch"),
        Nr = Vt("el-icon");
      return D(), V(Ge, null, [N("div", {
        class: "inline-block",
        onClick: Va
      }, [Ae(Pe.$slots, "default")]), W(b(Ei), {
        modelValue: c.value,
        "onUpdate:modelValue": Le[25] || (Le[25] = kr => c.value = kr),
        width: "700px",
        class: "account-setting-dialog !rounded-2xl !pt-0 !px-0 !pb-0",
        "append-to-body": !0,
        "show-close": !1,
        "close-on-click-modal": !1,
        "header-class": "!py-0 !px-0 h-0",
        onClosed: st
      }, {
        header: se(() => [...(Le[28] || (Le[28] = []))]),
        default: se(() => {
          var kr, Or, Ja;
          return [N("div", {
            class: G(["account-setting-header", {
              "account-setting-header-inner-title": T.value
            }])
          }, [T.value ? ce("", !0) : (D(), V("div", Y5e, [N("div", j5e, [N("span", null, me(w.value), 1), v.value === "profile" && ee.value ? (D(), V("div", K5e, [W(rIe, {
            size: 12,
            class: "shrink-0"
          }), N("span", W5e, " 首次完善信息 +" + me(Z.value) + "积分 ", 1)])) : ce("", !0), v.value === "recordingDuration" && Q.value && Gt.value != null ? (D(), V("div", {
            key: 1,
            role: "button",
            tabindex: "0",
            class: "ml-2 inline-flex h-7 w-[158px] shrink-0 cursor-pointer select-none items-center justify-center gap-1 rounded-[8px] bg-[linear-gradient(90deg,#100B06_0%,#5F3C00_100%)] px-3",
            "data-track-id": "Home_Profile_Popup_Recording_Duration_Upgrade",
            "data-custom-element-text": "个人中心-录音转写时长-升级会员最高省标签",
            onClick: He(Hn, ["stop"]),
            onKeydown: [dt(He(Hn, ["prevent", "stop"]), ["enter"]), dt(He(Hn, ["prevent", "stop"]), ["space"])]
          }, [W(f5e, {
            size: 12,
            color: "#FFE6BC",
            class: "shrink-0"
          }), N("span", X5e, " 升级会员最高省¥" + me(Gt.value), 1)], 40, Q5e)) : ce("", !0), v.value === "points" && Q.value ? (D(), Se(P5e, {
            key: 2
          }, {
            default: se(() => [W($f, {
              class: "w-3.5 h-3.5 text-[#8C8C8C] hover:text-[#262626] cursor-pointer"
            })]),
            _: 1
          })) : ce("", !0)]), N("div", {
            class: "account-setting-close w-8 h-8 flex items-center justify-center rounded-[4px] hover:bg-[#F2F3F5] cursor-pointer",
            onClick: Me
          }, [W(Aa, {
            class: "w-4 h-4 !text-[#262626]"
          })])])), N("div", Z5e, [(D(), V(Ge, null, Et(C, Ot => N("div", {
            key: Ot.key,
            "data-track-id": {
              profile: "Home_Profile_Popup_Info_Tab",
              points: "Home_Profile_Popup_Points_Detail",
              recording: "Profile_Record_Tab"
            }[Ot.key],
            "data-custom-element-text": {
              profile: "首页-个人信息弹窗-个人信息tab",
              points: "首页-个人信息弹窗-积分明细tab",
              recording: "个人中心-录音设置Tab"
            }[Ot.key],
            class: G(["account-setting-tab-item h-9 flex items-center justify-center gap-1.5 px-3 rounded-lg cursor-pointer text-[14px] leading-6", v.value === Ot.key ? "bg-white text-[#165DFF] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.06)]" : "text-[#262626] font-normal hover:bg-black/5"]),
            onClick: Yr => na(Ot.key)
          }, [N("span", null, me(Ot.label), 1)], 10, J5e)), 64))])], 2), N("div", eDe, [N("div", {
            class: G(["account-setting-content flex-1 px-6 pt-5 pb-6 relative overflow-y-auto overflow-x-hidden [scrollbar-width:none]", {
              "account-setting-content-profile": v.value === "profile",
              "account-setting-content-inner-title": T.value
            }])
          }, [v.value === "profile" ? (D(), V("div", tDe, [N("div", nDe, [N("div", rDe, [N("div", aDe, [(kr = i.value) != null && kr.avatarUrl ? (D(), V("img", {
            key: 0,
            src: i.value.avatarUrl,
            alt: "用户头像",
            class: "w-[64px] h-[64px] rounded-full object-cover"
          }, null, 8, oDe)) : (D(), V("div", iDe, [W(H5e, {
            class: "w-6 h-6"
          })])), N("div", {
            "data-track-id": "Profile_Popup_Avatar_Add",
            "data-custom-element-text": "首页-个人信息弹窗-头像添加",
            class: "absolute right-1 bottom-1 w-6 h-6 bg-[#165dff] rounded-full flex items-center justify-center border border-white cursor-pointer",
            onClick: Ia
          }, [W(b(q5e), {
            class: "w-3.5 h-3.5 text-white"
          })])])]), W(En, {
            ref_key: "formRef",
            ref: u,
            model: d.value,
            rules: ia.value,
            "validate-on-rule-change": !1,
            "label-position": "top",
            class: "account-form"
          }, {
            default: se(() => [W(Ct, {
              label: "我的昵称",
              prop: "nickname",
              class: "!mb-3 form-item"
            }, {
              default: se(() => [W(b(wa), {
                modelValue: d.value.nickname,
                "onUpdate:modelValue": Le[0] || (Le[0] = Ot => d.value.nickname = Ot),
                placeholder: "请输入昵称",
                maxlength: 10,
                class: "form-input",
                onClick: Le[1] || (Le[1] = Ot => Wn("Nickname", "我的昵称"))
              }, null, 8, ["modelValue"])]),
              _: 1
            }), qn.value ? (D(), Se(Ct, {
              key: 0,
              label: "手机号",
              prop: "phone",
              class: "!mb-3 form-item"
            }, {
              default: se(() => {
                var Ot;
                return [W(b(wa), {
                  "model-value": (Ot = i.value) == null ? void 0 : Ot.phone,
                  disabled: "",
                  class: "form-input"
                }, null, 8, ["model-value"])];
              }),
              _: 1
            })) : ce("", !0), W(Ct, {
              label: "邮箱",
              prop: "email",
              class: "!mb-3 form-item"
            }, {
              default: se(() => [W(b(wa), {
                modelValue: d.value.email,
                "onUpdate:modelValue": Le[2] || (Le[2] = Ot => d.value.email = Ot),
                disabled: Dt.value,
                placeholder: "请输入邮箱",
                class: G(["form-input", Dt.value ? "disabled-input" : ""]),
                onClick: Le[3] || (Le[3] = Ot => Wn("Email", "我的昵称"))
              }, null, 8, ["modelValue", "disabled", "class"])]),
              _: 1
            }), W(Ct, {
              label: "社会身份",
              prop: "socialIdentity",
              class: "!mb-3 form-item"
            }, {
              default: se(() => [W(b(Fs), {
                modelValue: d.value.socialIdentity,
                "onUpdate:modelValue": Le[5] || (Le[5] = Ot => d.value.socialIdentity = Ot),
                placeholder: "请选择社会身份",
                teleported: !1
              }, {
                default: se(() => [(D(!0), V(Ge, null, Et(f.value, Ot => (D(), Se(b(Eu), {
                  key: Ot.value,
                  label: Ot.label,
                  value: Ot.value,
                  onClick: Le[4] || (Le[4] = Yr => Wn("Identity", "社会身份"))
                }, null, 8, ["label", "value"]))), 128))]),
                _: 1
              }, 8, ["modelValue"])]),
              _: 1
            }), d.value.socialIdentity ? (D(), V(Ge, {
              key: 1
            }, [Sn.value ? (D(), Se(Ct, {
              key: 0,
              label: "所属院校",
              prop: "school",
              class: "!mb-3 form-item"
            }, {
              default: se(() => [W(b(wa), {
                modelValue: d.value.school,
                "onUpdate:modelValue": Le[6] || (Le[6] = Ot => d.value.school = Ot),
                placeholder: "请输入所属院校",
                maxlength: 100,
                class: "form-input",
                onClick: Le[7] || (Le[7] = Ot => Wn("School", "所属院校"))
              }, null, 8, ["modelValue"])]),
              _: 1
            })) : ce("", !0), Sn.value ? ce("", !0) : (D(), Se(Ct, {
              key: 1,
              label: "职业类型",
              prop: "professionType",
              class: "!mb-3 form-item",
              required: Fn.value
            }, {
              default: se(() => [W(b(Fs), {
                modelValue: d.value.professionType,
                "onUpdate:modelValue": Le[9] || (Le[9] = Ot => d.value.professionType = Ot),
                placeholder: "请选择职业类型",
                teleported: !1,
                "validate-event": !1
              }, {
                default: se(() => [(D(!0), V(Ge, null, Et(_.value, Ot => (D(), Se(b(Eu), {
                  key: Ot.value,
                  label: Ot.label,
                  value: Ot.value,
                  onClick: Le[8] || (Le[8] = Yr => Wn("Job", "职业类型"))
                }, null, 8, ["label", "value"]))), 128))]),
                _: 1
              }, 8, ["modelValue"])]),
              _: 1
            }, 8, ["required"])), Sn.value ? ce("", !0) : (D(), Se(Ct, {
              key: 2,
              label: "所在领域",
              prop: "industryName",
              class: "!mb-3 form-item",
              required: Fn.value
            }, {
              default: se(() => [W(b(Fs), {
                modelValue: d.value.industryName,
                "onUpdate:modelValue": Le[11] || (Le[11] = Ot => d.value.industryName = Ot),
                placeholder: "请选择所在领域",
                teleported: !1
              }, {
                default: se(() => [(D(!0), V(Ge, null, Et(h.value, Ot => (D(), Se(b(Eu), {
                  key: Ot.name,
                  label: Ot.name,
                  value: Ot.name,
                  onClick: Le[10] || (Le[10] = Yr => Wn("Space", "所在领域"))
                }, null, 8, ["label", "value"]))), 128))]),
                _: 1
              }, 8, ["modelValue"])]),
              _: 1
            }, 8, ["required"])), Sn.value ? ce("", !0) : (D(), Se(Ct, {
              key: 3,
              label: "所属公司",
              prop: "company",
              class: "!mb-3 form-item",
              required: Ft.value
            }, {
              default: se(() => [W(b(wa), {
                modelValue: d.value.company,
                "onUpdate:modelValue": Le[12] || (Le[12] = Ot => d.value.company = Ot),
                placeholder: "请输入所属公司；如无公司，请填写“无”",
                class: "form-input",
                onClick: Le[13] || (Le[13] = Ot => Wn("Company", "所属公司"))
              }, null, 8, ["modelValue"])]),
              _: 1
            }, 8, ["required"]))], 64)) : ce("", !0), W(Ct, {
              label: "个性签名",
              prop: "personalSignature",
              class: "!mb-3 form-item"
            }, {
              default: se(() => [W(b(wa), {
                modelValue: d.value.personalSignature,
                "onUpdate:modelValue": Le[14] || (Le[14] = Ot => d.value.personalSignature = Ot),
                type: "textarea",
                placeholder: "这个用户很懒，什么都没有留下",
                maxlength: 100,
                autosize: "",
                class: "form-textarea !min-h-[88px]",
                "input-class": "!min-h-[88px]",
                onClick: Le[15] || (Le[15] = Ot => Wn("Signature", "个性签名"))
              }, null, 8, ["modelValue"]), N("div", sDe, me(xn.value) + "/100 ", 1)]),
              _: 1
            })]),
            _: 1
          }, 8, ["model", "rules"])]), N("div", lDe, [W(b(ea), {
            class: "!text-[#262626] hover:!text-[#262626] hover:!border-[#000]/12 hover:!bg-[#fff]",
            onClick: Me
          }, {
            default: se(() => [...(Le[29] || (Le[29] = [bt(" 取消 ", -1)]))]),
            _: 1
          }), W(b(ea), {
            type: "primary",
            "data-track-id": "Home_Profile_Popup_Edit",
            "data-custom-element-text": "首页-个人信息弹窗-编辑按钮",
            class: "!ml-0 hover:!bg-[#3975FF] hover:!border-[#3975FF]",
            loading: l.value,
            onClick: Wt
          }, {
            default: se(() => [...(Le[30] || (Le[30] = [bt(" 确定 ", -1)]))]),
            _: 1
          }, 8, ["loading"])])])) : v.value === "recording" ? (D(), V(Ge, {
            key: 1
          }, [A.value ? (D(), V("div", cDe, " 加载中... ")) : (D(), V("div", uDe, [N("div", dDe, [N("div", pDe, [Le[31] || (Le[31] = N("div", {
            class: "text-[14px] font-medium leading-6 text-[#262626]"
          }, " 获取地理位置 ", -1)), N("div", fDe, me(ne.value), 1)]), W(Yn, {
            modelValue: R.value.locationCaptureEnabled,
            "onUpdate:modelValue": Le[16] || (Le[16] = Ot => R.value.locationCaptureEnabled = Ot),
            class: "h-6 shrink-0",
            style: {
              "--el-switch-on-color": "#165dff",
              "--el-switch-off-color": "#e5e6eb"
            },
            disabled: ge.value,
            loading: k.value,
            onChange: fn
          }, null, 8, ["modelValue", "disabled", "loading"])]), N("div", mDe, [N("div", gDe, [Le[32] || (Le[32] = N("div", {
            class: "min-w-0 flex-1"
          }, [N("div", {
            class: "text-[14px] font-medium leading-6 text-[#262626]"
          }, " 自动转译总结 "), N("div", {
            class: "mt-1 text-[12px] font-normal leading-[18px] text-[#565656]"
          }, " 开启后，将在录音完成后根据您的偏好设置自动转译并总结 ")], -1)), W(Yn, {
            modelValue: R.value.autoTranscribeSummary,
            "onUpdate:modelValue": Le[17] || (Le[17] = Ot => R.value.autoTranscribeSummary = Ot),
            class: "h-6 shrink-0",
            style: {
              "--el-switch-on-color": "#165dff",
              "--el-switch-off-color": "#e5e6eb"
            },
            loading: I.value,
            "before-change": qt,
            onChange: pn
          }, null, 8, ["modelValue", "loading"])]), R.value.autoTranscribeSummary ? (D(), V("button", {
            key: 0,
            type: "button",
            class: "my-1 mb-2 box-border flex min-h-[66px] w-full items-center justify-between rounded-[8px] border-none bg-[#f7f7fa] !px-4 py-3 text-left transition-colors hover:bg-[#f2f3f5]",
            "data-sensors-click": "",
            "data-sensors-track-id": "Profile_Record_Preference",
            "data-sensors-element-name": "个人中心-录音设置-偏好设置入口",
            onClick: Dn
          }, [Le[33] || (Le[33] = N("span", {
            class: "min-w-0 flex-1 text-left"
          }, [N("span", {
            class: "block text-[14px] font-normal leading-6 text-[#262626]"
          }, " 偏好设置 "), N("span", {
            class: "block text-[12px] leading-[18px] text-[#8C8C8C]"
          }, " 总结模板、语言及详细程度偏好 ")], -1)), W(Nr, {
            class: "ml-4 shrink-0 text-[#8c8c8c]",
            size: 16
          }, {
            default: se(() => [W(b(OI))]),
            _: 1
          })])) : ce("", !0)]), N("div", _De, [N("div", hDe, [N("div", vDe, [Le[34] || (Le[34] = N("div", {
            class: "text-[14px] font-medium leading-6 text-[#262626]"
          }, " 声纹识别 ", -1)), W(vF, {
            class: "shrink-0"
          })]), Le[35] || (Le[35] = N("div", {
            class: "mt-1 text-[12px] font-normal leading-[18px] text-[#565656]"
          }, " 目前 PC 端暂不支持声纹录入，您可在 APP 的个人中心进行设置；若已录入声纹，不会影响您在 PC 端录音的声纹应用 ", -1))])]), N("div", {
            class: "-mx-2 flex min-h-[96px] cursor-pointer items-center gap-4 rounded-[8px] border-b border-black/5 px-2 py-4 transition-colors hover:bg-[#F7F7FA]",
            role: "button",
            tabindex: "0",
            onClick: Qt,
            onKeydown: [dt(Qt, ["enter"]), dt(He(Qt, ["prevent"]), ["space"])]
          }, [Le[36] || (Le[36] = N("div", {
            class: "min-w-0 flex-1"
          }, [N("div", {
            class: "text-[14px] font-medium leading-6 text-[#262626]"
          }, " 模版社区 "), N("div", {
            class: "mt-1 text-[12px] font-normal leading-[18px] text-[#565656]"
          }, " 发现、收藏和管理社区共享模版 ")], -1)), W(Nr, {
            class: "ml-4 shrink-0 text-[#8c8c8c]",
            size: 16
          }, {
            default: se(() => [W(b(OI))]),
            _: 1
          })], 40, bDe), Le[37] || (Le[37] = N("div", {
            class: "flex min-h-[96px] items-center gap-4 border-b border-black/5 py-4"
          }, [N("div", {
            class: "min-w-0 flex-1"
          }, [N("div", {
            class: "text-[14px] font-medium leading-6 text-[#262626]"
          }, " 行业术语 "), N("div", {
            class: "mt-1 text-[12px] font-normal leading-[18px] text-[#565656]"
          }, " 目前 PC 端暂不支持行业术语设置，您可在 APP 的个人中心进行设置；若已完成设置，不会影响您在 PC 端录音的转译应用 ")])], -1))]))], 64)) : v.value === "points" ? (D(), V(Ge, {
            key: 2
          }, [N("div", yDe, [N("div", EDe, [N("div", SDe, [W(cv, {
            class: "w-3.5 h-3.5 text-[#165DFF]"
          }), Le[38] || (Le[38] = N("span", {
            class: "text-[14px] font-medium text-[#262626]"
          }, "积分", -1))]), N("span", CDe, me((Or = b(U)) != null ? Or : "--"), 1)]), Le[40] || (Le[40] = N("div", {
            class: "h-2 border-b border-black/[0.05]"
          }, null, -1)), (D(!0), V(Ge, null, Et(ae.value, Ot => {
            var Yr;
            return D(), V("div", {
              key: Ot.label,
              class: G(["h-8 flex items-center justify-between", Ot.className])
            }, [N("span", wDe, me(Ot.label), 1), N("span", TDe, me((Yr = Ot.value) != null ? Yr : "--"), 1)], 2);
          }), 128)), N("div", {
            class: G(["h-8 flex items-center justify-between mb-4 px-2 bg-[#F7F7F7] rounded-lg", ae.value.length === 0 ? "mt-2" : ""])
          }, [N("div", xDe, [W($f, {
            class: "w-3 h-3"
          }), Le[39] || (Le[39] = bt(" 本月将过期积分 ", -1))]), N("span", ODe, me((Ja = b(B)) != null ? Ja : "--"), 1)], 2)]), N("div", RDe, [Le[41] || (Le[41] = N("div", {
            class: "points-detail-title h-8 leading-[32px] text-[14px] font-medium text-[#262626] mb-2"
          }, " 积分明细 ", -1)), N("div", ADe, [N("button", {
            type: "button",
            class: G(["h-8 !px-3 rounded-[8px] text-[13px] transition-colors", fe.value === "all" ? "bg-[#262626] !text-white border-transparent" : "bg-white border border-black/8 text-[#000] hover:border-black/20"]),
            onClick: Le[18] || (Le[18] = Ot => Ht("all"))
          }, " 全部 ", 2), N("button", {
            type: "button",
            class: G(["h-8 !px-3 rounded-[8px] text-[13px] transition-colors", fe.value === "earn" ? "bg-[#262626] !text-white border-transparent" : "bg-white border border-black/8 text-[#000] hover:border-black/20"]),
            onClick: Le[19] || (Le[19] = Ot => Ht("earn"))
          }, " 获取（+" + me(Oe.value) + "） ", 3), N("button", {
            type: "button",
            class: G(["h-8 !px-3 rounded-[8px] text-[13px] transition-colors", fe.value === "spend" ? "bg-[#262626] !text-white border-transparent" : "bg-white border border-black/8 text-[#000] hover:border-black/20"]),
            onClick: Le[20] || (Le[20] = Ot => Ht("spend"))
          }, " 支出（" + me(De.value > 0 ? `-${De.value}` : De.value) + "） ", 3)]), Le[42] || (Le[42] = N("div", {
            class: "points-record-header h-[34px] leading-[34px] px-3 flex items-center text-[12px] text-[#8C8C8C] border-b border-black/[0.05]"
          }, [N("span", {
            class: "flex-1"
          }, "详情"), N("span", {
            class: "w-[111px] text-left"
          }, "变动"), N("span", {
            class: "w-[146px] text-left"
          }, "日期")], -1)), N("div", {
            ref_key: "recordsScrollRef",
            ref: Ue,
            class: "points-record-scroll max-h-[260px] overflow-y-auto br-thin-scrollbar",
            onScroll: pe
          }, [oe.value.length ? (D(!0), V(Ge, {
            key: 0
          }, Et(oe.value, Ot => (D(), V("div", {
            key: Ot.id,
            class: "points-record-row h-10 flex items-center px-3 py-2"
          }, [N("span", IDe, me(Ot.description), 1), N("span", {
            class: G(["points-record-amount w-[111px] text-left text-[14px]", Ot.amount > 0 ? "text-[#00B42A]" : "text-[#8C8C8C]"])
          }, me(Ot.amount > 0 ? "+" : "") + me(Ot.amount), 3), N("span", NDe, me(Mr(Ot.date)), 1)]))), 128)) : ce("", !0)], 544), Ce.value && !oe.value.length ? (D(), V("div", kDe, " 加载中... ")) : oe.value.length ? Ce.value ? (D(), V("div", MDe, " 加载中... ")) : ce("", !0) : (D(), V("div", DDe, " 暂无积分记录 "))])], 64)) : v.value === "recordingDuration" ? (D(), V(Ge, {
            key: 3
          }, [N("div", PDe, [N("div", LDe, [N("div", FDe, [W(cv, {
            class: "w-3 h-3 text-[#165DFF]"
          }), Le[43] || (Le[43] = N("span", {
            class: "text-[16px] font-medium leading-7 text-[#262626]"
          }, " 剩余录音转写时长 ", -1))]), N("span", BDe, me(Ye.value ? "加载中..." : Ze.value ? "无限时长" : Ha(_e.value)), 1)]), Le[44] || (Le[44] = N("div", {
            class: "h-px bg-black/[0.05] my-2"
          }, null, -1)), Ne.value.length ? (D(), V("div", $De, [(D(!0), V(Ge, null, Et(Ne.value, Ot => (D(), V("div", {
            key: `${Ot.displayName}-${Ot.cycleEnd}`,
            class: "flex items-center justify-between"
          }, [N("span", UDe, me(Ot.displayName), 1), N("div", VDe, [N("span", HDe, me(Ot.displayQuota), 1), Ot.cycleEnd ? (D(), V("span", zDe, me(Ot.cycleEnd), 1)) : ce("", !0)])]))), 128))])) : (D(), V("div", GDe, me(Ye.value ? "加载中..." : "暂无剩余时长"), 1))]), N("div", null, [Le[46] || (Le[46] = N("div", {
            class: "h-8 leading-[32px] text-[14px] font-medium text-[#262626] mb-2"
          }, " 转写明细 ", -1)), N("div", qDe, [N("button", {
            type: "button",
            class: G(["h-8 !px-3 rounded-[8px] text-[13px] transition-colors", he.value === "all" ? "bg-[#262626] !text-white border-transparent" : "bg-white border border-black/8 text-[#000] hover:border-black/20"]),
            "data-sensors-click": "",
            "data-sensors-track-id": r.all.trackId,
            "data-sensors-element-name": r.all.elementText,
            onClick: Le[21] || (Le[21] = Ot => nn("all"))
          }, " 全部 ", 10, YDe), N("button", {
            type: "button",
            class: G(["h-8 !px-3 rounded-[8px] text-[13px] transition-colors", he.value === "consume" ? "bg-[#262626] !text-white border-transparent" : "bg-white border border-black/8 text-[#000] hover:border-black/20"]),
            "data-sensors-click": "",
            "data-sensors-track-id": r.consume.trackId,
            "data-sensors-element-name": r.consume.elementText,
            onClick: Le[22] || (Le[22] = Ot => nn("consume"))
          }, " 消费 ", 10, jDe), N("button", {
            type: "button",
            class: G(["h-8 !px-3 rounded-[8px] text-[13px] transition-colors", he.value === "earn" ? "bg-[#262626] !text-white border-transparent" : "bg-white border border-black/8 text-[#000] hover:border-black/20"]),
            "data-sensors-click": "",
            "data-sensors-track-id": r.earn.trackId,
            "data-sensors-element-name": r.earn.elementText,
            onClick: Le[23] || (Le[23] = Ot => nn("earn"))
          }, " 获得 ", 10, KDe), N("button", {
            type: "button",
            class: G(["h-8 !px-3 rounded-[8px] text-[13px] transition-colors", he.value === "expire" ? "bg-[#262626] !text-white border-transparent" : "bg-white border border-black/8 text-[#000] hover:border-black/20"]),
            "data-sensors-click": "",
            "data-sensors-track-id": r.expire.trackId,
            "data-sensors-element-name": r.expire.elementText,
            onClick: Le[24] || (Le[24] = Ot => nn("expire"))
          }, " 过期 ", 10, WDe)]), N("div", QDe, [N("div", XDe, [Le[45] || (Le[45] = N("div", {
            class: "h-[34px] leading-[34px] px-3 flex items-center text-[12px] text-[#8C8C8C] border-b border-black/[0.05]"
          }, [N("span", {
            class: "min-w-0 flex-1"
          }, "详情"), N("span", {
            class: "w-[111px] text-left"
          }, "变动"), N("span", {
            class: "w-[146px] text-left"
          }, "日期")], -1)), N("div", {
            class: "max-h-[260px] overflow-x-hidden overflow-y-auto custom-scrollbar",
            onScroll: vn
          }, [ke.value.length ? (D(), V(Ge, {
            key: 0
          }, [(D(!0), V(Ge, null, Et(ke.value, Ot => (D(), V("div", {
            key: `${Ot.businessId}-${Ot.recordTime}-${Ot.amount}`,
            class: "min-h-10 flex items-center px-3 py-2"
          }, [N("span", ZDe, me(Ot.description), 1), N("span", {
            class: G(["w-[111px] text-left text-[14px] leading-6", Ot.amount > 0 ? "text-[#0DC15B]" : "text-[#8C8C8C]"])
          }, me(lt(Ot)), 3), N("span", JDe, me(va(Ot.recordTime)), 1)]))), 128)), it.value ? (D(), V("div", e9e, " 加载中... ")) : !ft.value && kt.value > dE && ke.value.length > 0 ? (D(), V("div", t9e, " 暂无更多记录 ")) : ce("", !0)], 64)) : ce("", !0)], 32)])]), ke.value.length ? ce("", !0) : (D(), V("div", n9e, me(it.value ? "加载中..." : "暂无转写记录"), 1))])], 64)) : ce("", !0)], 2)])];
        }),
        _: 1
      }, 8, ["modelValue"]), W(d5e, {
        ref_key: "preferenceDialogRef",
        ref: M,
        onConfirm: _n,
        onOpenRecordingSettings: Qe
      }, null, 512), W(hF, {
        visible: g.value,
        "onUpdate:visible": Le[26] || (Le[26] = kr => g.value = kr)
      }, null, 8, ["visible"]), W(tIe, {
        visible: p.value,
        "onUpdate:visible": Le[27] || (Le[27] = kr => p.value = kr),
        onSuccess: $o
      }, null, 8, ["visible"]), W(QT, {
        ref_key: "memberRechargeDialogRef",
        ref: L,
        class: "hidden"
      }, null, 512)], 64);
    };
  }
})