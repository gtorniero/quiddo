// Server-only connection check. Synthetic data can only enter Meta's test channel.
import {BRANDS,hash,payload} from './meta-capi.mjs';
export async function probeMeta(env,brand,fetcher=fetch){
 if(!BRANDS[brand]||env.META_CAPI_ENABLED!=='true'||!env.META_CAPI_TOKEN||!/^v\d+\.\d+$/.test(env.META_GRAPH_VERSION||'')||!/^TEST[0-9]{1,20}$/.test(env.META_CAPI_TEST_CODE||''))return;
 try{
 const db=env.DB,now=Date.now(),id=await hash(brand+':test:'+env.META_CAPI_TEST_CODE);
 await db.prepare("CREATE TABLE IF NOT EXISTS btw_meta_probe (id TEXT PRIMARY KEY,brand TEXT NOT NULL,created INTEGER NOT NULL,checked INTEGER,lease INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL DEFAULT 'pending',http_status INTEGER,events_received INTEGER,error_code INTEGER)").run();
 await db.prepare('INSERT OR IGNORE INTO btw_meta_probe(id,brand,created) VALUES (?,?,?)').bind(id,brand,now).run();
 const row=await db.prepare('SELECT * FROM btw_meta_probe WHERE id=?').bind(id).first();
 if(row.state!=='pending'||row.lease>=now)return;
 if(now-row.created>86400000){await db.prepare("UPDATE btw_meta_probe SET state='expired' WHERE id=?").bind(id).run();return}
 const lock=await db.prepare("UPDATE btw_meta_probe SET lease=? WHERE id=? AND state='pending' AND lease<?").bind(now+60000,id,now).run();if(!lock.meta?.changes)return;
 const event=await payload(brand,{id:'capi-test:'+id,paid:true,live:true,cents:1,paidAt:row.created,email:'capi-test@example.invalid',emailMatching:true},{subject:'00000000-0000-4000-8000-000000000001',marketing:true,version:1,at:row.created});
 try{
 const response=await fetcher(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/${BRANDS[brand].pixel}/events`,{method:'POST',headers:{Authorization:'Bearer '+env.META_CAPI_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({data:[event],test_event_code:env.META_CAPI_TEST_CODE}),signal:AbortSignal.timeout(10000)});
 const result=await response.json().catch(()=>null),received=Number.isInteger(result?.events_received)?result.events_received:0;
 const terminal=response.status>=400&&response.status<500&&![408,429].includes(response.status);
 await db.prepare('UPDATE btw_meta_probe SET checked=?,lease=0,state=?,http_status=?,events_received=?,error_code=? WHERE id=?').bind(Date.now(),response.ok&&received===1?'accepted':terminal?'rejected':'pending',response.status,received,Number.isInteger(result?.error?.code)?result.error.code:null,id).run();
 }catch{await db.prepare('UPDATE btw_meta_probe SET checked=?,lease=0 WHERE id=?').bind(Date.now(),id).run()}
 }catch{console.warn('meta_connection_check_failed')}
}
