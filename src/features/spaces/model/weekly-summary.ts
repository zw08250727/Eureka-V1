export interface SummaryWeek { key: string; start: Date; end: Date; label: string }
export interface WeeklyMeetingRecord {
  id: string; title: string; created: string; creator?: string; creatorId?: string;
  source: string; summary?: string; transcript?: string; deleted?: boolean; tags?: string[];
  detail?: Record<string, unknown>;
}
export interface WeeklyMeetingSource {
  id: string; title: string; created: string; creator: string; source: string;
  summary: string; transcript: string;
  observations: { text: string; status?: string; kind?: string }[];
}
export interface WeeklyMeetingGroup { id: string; title: string; description: string; sources: WeeklyMeetingSource[] }
export interface WeeklyMeetingSummary { week:SummaryWeek; groups:WeeklyMeetingGroup[]; sources:WeeklyMeetingSource[]; creators:number }
export interface WeeklySummaryTopicOutput { title:string; summary:string; sourceIds:string[] }
export interface WeeklySummaryGenerationRequest {
  week:{key:string;label:string;start:string;end:string};
  sourceIds:string[];
  prompt:string;
  instructions:string;
  outputSchema:{
    type:"object";additionalProperties:false;required:["topics"];
    properties:{topics:{type:"array";items:{
      type:"object";additionalProperties:false;required:["title","summary","sourceIds"];
      properties:{title:{type:"string";minLength:1;maxLength:100};summary:{type:"string";minLength:1;maxLength:1200};sourceIds:{type:"array";minItems:1;uniqueItems:true;items:{type:"string"}}};
    }}};
  };
}

const localDate = (date:Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export function completedSummaryWeeks(now = new Date(), count = 8): SummaryWeek[] {
  const monday = new Date(now);monday.setHours(0,0,0,0);
  monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
  return Array.from({length:count},(_,i)=>{
    const end=new Date(monday);end.setDate(end.getDate()-i*7);
    const start=new Date(end);start.setDate(start.getDate()-7);
    const last=new Date(end);last.setDate(last.getDate()-1);
    return {key:localDate(start),start,end,label:`${localDate(start).replaceAll("-","/")}—${localDate(last).replaceAll("-","/")}`};
  });
}
function meetingTopic(title:string) {
  const clean=title.trim().replace(/\s+/g," ");
  const topic=clean.replace(/(?:会议纪要|例会|周会|会议|同步|沟通|讨论|评审|复盘|交流|访谈)$/u,"").trim();
  return topic.length>=2?topic:clean;
}
export function weeklySummaryExcerpt(text:string, limit=120) {
  const clean=text.split(/\n+/).map(line=>line.trim()).filter(line=>line&&!/^#{1,6}\s/.test(line)).join(" ");
  return clean ? clean.length>limit ? clean.slice(0,limit)+ "…" : clean : "暂无可用摘要，可打开会议查看现有记录。";
}
const groupDescription=(sources:WeeklyMeetingSource[])=>{
  const excerpts=[...new Set(sources.map(s=>weeklySummaryExcerpt(s.summary||s.transcript,130)).filter(s=>!s.startsWith("暂无可用摘要")))];
  return excerpts.length?weeklySummaryExcerpt(excerpts.join("；"),260):"本周会议尚无可用总结或转写，可在详情中查看会议记录。";
};
/** Builds topic headings from meeting titles and descriptions only from the selected week's saved records. */
export function buildWeeklyMeetingSummary(files: WeeklyMeetingRecord[], week: SummaryWeek, now = new Date()): WeeklyMeetingSummary {
  if (+week.end > +now || +week.start >= +week.end) throw Error("仅支持已结束的完整自然周");
  const sources:WeeklyMeetingSource[]=[];
  for(const file of new Map(files.map(f=>[f.id,f])).values()) {
    const at=Date.parse(file.created.replace(" ","T"));
    if(file.deleted || ["笔记","联系人"].includes(file.source) || !Number.isFinite(at) || at<+week.start || at>=+week.end)continue;
    const text=`${file.summary || ""}\n${file.transcript || ""}`;
    const facts = Array.isArray(file.detail?.briefFacts) ? file.detail.briefFacts as {quote?:unknown;status?:unknown;kind?:unknown}[] : [];
    sources.push({id:file.id,title:file.title,created:file.created,creator:file.creator || "未知创建人",source:file.source,
      summary:file.summary || "",transcript:file.transcript || "",
      observations:facts.filter(f=>typeof f.quote==="string"&&f.quote.trim()&&text.includes(f.quote)).map(f=>({text:String(f.quote),status:typeof f.status==="string"?f.status:undefined,kind:typeof f.kind==="string"?f.kind:undefined}))});
  }
  sources.sort((a,b)=>b.created.localeCompare(a.created)||a.id.localeCompare(b.id));
  const topics=new Map<string,WeeklyMeetingSource[]>();
  for(const source of sources) {
    const title=meetingTopic(source.title),key=title.toLocaleLowerCase();
    const group=topics.get(key)||[];group.push(source);topics.set(key,group);
  }
  const groups=[...topics.entries()].map(([id,selected])=>({
    id,title:meetingTopic(selected[0].title),description:groupDescription(selected),sources:selected,
  })).sort((a,b)=>b.sources.length-a.sources.length||b.sources[0].created.localeCompare(a.sources[0].created));
  return {week,groups,sources,creators:new Set(files.filter(f=>sources.some(s=>s.id===f.id)).map(f=>f.creatorId||f.creator||f.id)).size};
}

export function buildWeeklySummaryGenerationRequest(report:WeeklyMeetingSummary):WeeklySummaryGenerationRequest {
  const sourceIds=report.sources.map(source=>source.id);
  const outputSchema:WeeklySummaryGenerationRequest["outputSchema"]={
    type:"object",additionalProperties:false,required:["topics"],
    properties:{topics:{type:"array",items:{
      type:"object",additionalProperties:false,required:["title","summary","sourceIds"],
      properties:{title:{type:"string",minLength:1,maxLength:100},summary:{type:"string",minLength:1,maxLength:1200},sourceIds:{type:"array",minItems:1,uniqueItems:true,items:{type:"string"}}},
    }}},
  };
  const prompt=`请仅依据 ${report.week.label} 这一完整自然周的会议资料，阅读每场会议的标题、已有总结和转写，归纳本周议题，并为每个议题提炼标题和摘要。不要使用“讨论与评审”“进展与协作”“交流与复盘”等固定通用分类。

整理要求：
- 合并相同或高度相关的议题；不同标题可能属于同一议题，同一标题也要结合会议内容判断，不要只看标题后缀。
- 标题要简短具体；摘要需综合相关会议的共同事实、进展变化和未解决问题，不要简单拼接原文。
- 只陈述记录支持的信息；材料不足时标明“记录不足”或“待确认”，不要补造决策、共识、责任人、时间或跨会议结论。
- 为每个议题注明相关会议依据，只使用本周且当前账号有权访问的记录；尽量覆盖有内容的会议，忽略空白或纯处理状态记录。`;
  const instructions=`统计范围仅限 ${report.week.label} 这一完整自然周中当前账号有权访问的会议，并阅读每场会议的标题、已有总结和转写。跨会议归并实际讨论的议题，不要使用“讨论与评审”“进展与协作”“交流与复盘”等固定通用分类。

处理要求：
- 依据所有已附会议内容归并相同或高度相关议题；不同标题可能属于同一议题，同一标题也须结合内容判断，不得只按标题后缀归类。
- 每个标题简短、具体，能体现本周实际议题；摘要综合该议题下所有相关会议的共同事实、变化与未解决事项，不要简单串接原文摘要。
- 只陈述来源支持的信息；事实不足时明确写“记录不足”或“待确认”。不得补造决策、共识、责任人、时间或跨会议结论。
- 每个议题必须附上支撑它的 sourceIds；所有 sourceIds 必须来自本次提供的会议，不得引用其他周或无权访问的资料。尽量覆盖所有有内容的会议；空白或纯处理状态记录可不纳入议题。
- 使用结构化输出约束返回议题标题、摘要和 sourceIds。结构定义单独传递，不要把 JSON 样例写进用户问题。`;
  return {
    week:{key:report.week.key,label:report.week.label,start:report.week.start.toISOString(),end:report.week.end.toISOString()},
    sourceIds,
    prompt,
    instructions,
    outputSchema,
  };
}
export function applyWeeklySummaryGenerationResult(report:WeeklyMeetingSummary,result:unknown):WeeklyMeetingSummary {
  const topics=normalizeWeeklySummaryTopics(result,report.sources.map(source=>source.id));
  if(!topics.length)return report;
  const sourceById=new Map(report.sources.map(source=>[source.id,source]));
  const groups=topics.map((topic,index)=>({
    id:`generated-${index}-${topic.sourceIds.join("-")}`,
    title:topic.title,
    description:topic.summary,
    sources:topic.sourceIds.map(id=>sourceById.get(id)!).filter(Boolean),
  })).filter(group=>group.sources.length);
  return groups.length?{...report,groups}:report;
}
/** Reject malformed or cross-scope model output before it can become visible in the weekly module. */
export function normalizeWeeklySummaryTopics(value:unknown,allowedSourceIds:string[]):WeeklySummaryTopicOutput[] {
  if(!value||typeof value!=="object"||!("topics" in value)||!Array.isArray(value.topics))return [];
  const allowed=new Set(allowedSourceIds);
  return value.topics.flatMap((item):WeeklySummaryTopicOutput[]=>{
    if(!item||typeof item!=="object")return [];
    const row=item as Record<string,unknown>;
    if(typeof row.title!=="string"||typeof row.summary!=="string"||!Array.isArray(row.sourceIds))return [];
    const title=row.title.trim().slice(0,100),summary=row.summary.trim().slice(0,1200);
    const sourceIds=[...new Set(row.sourceIds.filter((id):id is string=>typeof id==="string"&&allowed.has(id)))];
    return title&&summary&&sourceIds.length?[{title,summary,sourceIds}]:[];
  });
}
