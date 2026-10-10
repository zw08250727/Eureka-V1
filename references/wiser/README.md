# Authorized reference migration — 2026-10-10

User-authorized sources: the signed-in https://100wiser.com/index UI and its publicly served frontend bundle `https://100wiser.com/static/js/index--tpCNGwh.js`; changelog component `index-DXFfSAzF.js`; user-provided connector HTML.

The `.js` files in this directory are exact component initializer extracts (Babel formatting only), retained for implementation review, not executed or published. Vue render functions were ported into React to fit EurekaMind's existing shell and visual rules. Original public SVG paths were extracted to `public/integrations/icons`. API auth and production payment calls were not copied.

| Source | Adaptation |
| --- | --- |
| PointsTaskDialog / PointsRechargeDialog / PointsRulesDialog | account/experience.tsx, rewards.ts: task tabs, reward values, quotas, SKU quantities/prices; USD local checkout |
| AccountSettingDialog | account/settings.tsx, personal/settings.tsx: four tabs, original field/flow structure |
| MemberFaqDialog / MemberOrderListDialog | account/experience.tsx: FAQ topics, filter/order/invoice flow; existing Eureka plan rules retained |
| MeetingSummaryTemplate / PresetTemplateCard / TemplateCommunityContent | meetings/template-picker.tsx: pick/preview/default/community/favorite/custom flows, source SVG icons |
| UpdateLog component and rendered product articles | account/pages.tsx and updates.json: 27 version records, filter/timeline/gallery; original screenshots transcoded to WebP for delivery |
| Provided connector tab | public/integrations/connectors.html: original tab DOM, CSS, SVG, functions; added scoped persistence, text escaping, keyboard trap and permission checks |

No live account balance, order IDs, notification contents, credentials, signed URLs or private task history are included. Community templates, notifications and account profiles are synthetic. The reference changelog is public product history; its dates/features are reference content, not claims about EurekaMind's release history. Connector auth, checkout and invoice submission are local demonstrations.
