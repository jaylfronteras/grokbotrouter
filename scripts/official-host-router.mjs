#!/usr/bin/env node
import http from "node:http";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const host=process.env.SAND_ROUTER_HOST||"127.0.0.1";
const port=Number(process.env.SAND_ROUTER_PORT||8788);
const base=(process.env.SAND_OPENAI_COMPATIBLE_BASE_URL||"").replace(/\/$/,"");
const model=process.env.SAND_OPENAI_COMPATIBLE_MODEL||"";
const key=process.env.SAND_OPENAI_COMPATIBLE_API_KEY||process.env.OPENAI_COMPATIBLE_API_KEY||"";
const audit=process.env.SAND_ROUTER_AUDIT_PATH||path.resolve(".grokbot-router-audit.jsonl");
if(!base||!model) throw new Error("Set SAND_OPENAI_COMPATIBLE_BASE_URL and SAND_OPENAI_COMPATIBLE_MODEL.");
const parsed=new URL(base);
if(parsed.protocol!=="https:"&&!["127.0.0.1","localhost","::1"].includes(parsed.hostname)) throw new Error("Remote inference endpoints must use HTTPS.");

const enc=(flags,obj)=>{const b=Buffer.from(JSON.stringify(obj));const h=Buffer.alloc(5);h[0]=flags;h.writeUInt32BE(b.length,1);return Buffer.concat([h,b])};
const parse=buf=>{const out=[];for(let o=0;o<buf.length;){if(o+5>buf.length)throw new Error("Incomplete Connect envelope");const f=buf[o],n=buf.readUInt32BE(o+1);if(o+5+n>buf.length)throw new Error("Incomplete Connect body");out.push({flags:f,data:buf.subarray(o+5,o+5+n)});o+=5+n}return out};
const role=r=>typeof r==="string"?r.toLowerCase().replace(/^role_/,""):({1:"user",2:"assistant",3:"system",4:"tool"}[r]||"user");
const js=v=>v?.fields?Object.fromEntries(Object.entries(v.fields).map(([k,x])=>[k,scalar(x)])):v;
const scalar=v=>v?.stringValue??v?.numberValue??v?.boolValue??v?.nullValue??(v?.structValue?js(v.structValue):v?.listValue?.values?.map(scalar)??v);
function convert(req){
 const messages=[];
 for(const m of req.messages||[]){
   if(m.toolContent?.parts){for(const p of m.toolContent.parts)messages.push({role:"tool",tool_call_id:p.toolCallId||"",content:JSON.stringify(js(p.result)??p.result??null)});continue}
   const r=role(m.role); let content=m.text??"";
   if(m.parts?.parts) content=m.parts.parts.map(p=>p.text?.text?{type:"text",text:p.text.text}:p.image?{type:"image_url",image_url:{url:p.image.url||(p.image.data?.startsWith("data:")?p.image.data:`data:${p.image.mimeType||"image/png"};base64,${p.image.data||""}`)}}:{type:"text",text:p.file?`[file: ${p.file.name||""}]`:""});
   const msg={role:r,content:r==="assistant"&&((Array.isArray(content)&&!content.length)||content==="")?null:content};
   if(r==="assistant"&&m.toolCalls?.length)msg.tool_calls=m.toolCalls.map(t=>({id:t.toolCallId||"",type:"function",function:{name:t.toolName||"",arguments:JSON.stringify(js(t.args)??t.args??{})}}));
   messages.push(msg);
 }
 const tools=(req.tools||[]).filter(t=>t.name).map(t=>({type:"function",function:{name:t.name,description:t.description||"",parameters:js(t.parameters?.jsonSchema??t.parameters)??{type:"object"}}}));
 return {model,messages,stream:true,stream_options:{include_usage:true},...(tools.length?{tools}:{}),...(req.modelConfig?.temperature!=null?{temperature:req.modelConfig.temperature}:{}),...(req.modelConfig?.topP!=null?{top_p:req.modelConfig.topP}:{})};
}
async function log(event){await mkdir(path.dirname(audit),{recursive:true});await appendFile(audit,JSON.stringify({ts:new Date().toISOString(),...event})+"\n")}
const server=http.createServer(async(req,res)=>{
 if(req.method==="GET"&&req.url==="/health"){res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({ok:true,model,baseUrl:base}));return}
 if(req.method!=="POST"||!req.url?.endsWith("/aiserver.v1.InferenceService/Stream")){res.writeHead(404);res.end();return}
 const chunks=[];for await(const c of req)chunks.push(c);
 const requestId=crypto.randomUUID();let body;
 try{
   const envs=parse(Buffer.concat(chunks));const data=envs.find(x=>x.flags===0)?.data;if(!data)throw new Error("Missing Connect data frame");
   const inbound=JSON.parse(data.toString("utf8"));body=convert(inbound);
   await log({kind:"inference_start",requestId,model,messageCount:body.messages.length,toolCount:body.tools?.length||0});
   const upstream=await fetch(base+"/chat/completions",{method:"POST",headers:{"content-type":"application/json",...(key?{authorization:`Bearer ${key}`}:{})},body:JSON.stringify(body)});
   if(!upstream.ok||!upstream.body)throw new Error(`Upstream ${upstream.status}: ${(await upstream.text()).slice(0,500)}`);
   res.writeHead(200,{"content-type":"application/connect+json","connect-protocol-version":"1"});
   const reader=upstream.body.getReader();const dec=new TextDecoder();let pending="",sentInfo=false,usage=null;const calls=new Map();
   while(true){const {done,value}=await reader.read();if(done)break;pending+=dec.decode(value,{stream:true});let cut;while((cut=pending.indexOf("\n\n"))>=0){const event=pending.slice(0,cut);pending=pending.slice(cut+2);for(const line of event.split(/\r?\n/)){if(!line.startsWith("data:"))continue;const raw=line.slice(5).trim();if(!raw||raw==="[DONE]")continue;const c=JSON.parse(raw);if(!sentInfo){res.write(enc(0,{responseInfo:{id:c.id||requestId,model:c.model||model,createdAt:String(Date.now()),messages:[]}}));sentInfo=true}
       if(c.usage)usage=c.usage;
       for(const choice of c.choices||[]){const d=choice.delta||{};if(typeof d.content==="string"&&d.content)res.write(enc(0,{textPart:{text:d.content,isFinal:false}}));
         for(const tc of d.tool_calls||[]){const idx=tc.index??0,old=calls.get(idx)||{id:"",name:"",args:""};if(tc.id)old.id=tc.id;if(tc.function?.name)old.name+=tc.function.name;if(tc.function?.arguments)old.args+=tc.function.arguments;calls.set(idx,old);res.write(enc(0,{toolCallPart:{toolCallId:old.id,toolName:old.name,args:old.args,isComplete:false}}))}
         if(choice.finish_reason){for(const v of calls.values())res.write(enc(0,{toolCallPart:{toolCallId:v.id,toolName:v.name,args:v.args,isComplete:true}}));calls.clear();res.write(enc(0,{textPart:{text:"",isFinal:true}}))}
       }
     }}}
   if(usage){res.write(enc(0,{usage:{promptTokens:usage.prompt_tokens??usage.promptTokens??0,completionTokens:usage.completion_tokens??usage.completionTokens??0,totalTokens:usage.total_tokens??usage.totalTokens}}));await log({kind:"inference_complete",requestId,model,promptTokens:usage.prompt_tokens??usage.promptTokens??0,completionTokens:usage.completion_tokens??usage.completionTokens??0})}
   else await log({kind:"inference_complete",requestId,model});
   res.end(enc(2,{}));
 }catch(e){await log({kind:"inference_error",requestId,error:e instanceof Error?e.message:String(e)});if(!res.headersSent)res.writeHead(502,{"content-type":"application/connect+json"});res.end(enc(2,{error:{code:"internal",message:e instanceof Error?e.message:String(e)}}))}
});
server.listen(port,host,()=>console.log(`GrokBot external inference router listening on http://${host}:${port}`));
