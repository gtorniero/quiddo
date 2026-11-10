import {describe,it,expect} from 'vitest';
import {gameMeasurement} from '../src/lib/game-measurement';
import {gamePath,measurementHost,safeReferrer,campaignQuery,publicPath,productUsageAllowed,needsUsageChoice} from '../src/lib/measurement-policy';

describe('aquisição agregada sem dados privados',()=>{
 it('não amplia um aceite anterior para acompanhar o uso nas partidas',()=>{
  const old={version:1 as const,analytics:true,marketing:true,at:Date.now()};
  expect(productUsageAllowed(old)).toBe(false);expect(needsUsageChoice(old)).toBe(true);
  expect(productUsageAllowed({...old,productUsageMeasurement:true})).toBe(true);
  expect(productUsageAllowed({...old,productUsageMeasurement:false})).toBe(false);
 });
 it('preserva origem de busca sem enviar pesquisa, credenciais ou URL privada',()=>{
  expect(safeReferrer('https://www.google.com/search?q=pessoa%40exemplo.com')).toBe('https://www.google.com/');
  expect(safeReferrer('https://instagram.com/private/person?token=secret')).toBe('https://instagram.com/');
  expect(safeReferrer('https://www.quiddo.com.br/host/ABCD?token=secret')).toBe('https://www.quiddo.com.br/');
  expect(safeReferrer('https://www.quiddo.com.br/criar?email=secret')).toBe('https://www.quiddo.com.br/criar');
  for(const value of ['javascript:alert(1)','https://user:pass@example.com/path','https://localhost/','http://127.0.0.1/']) expect(safeReferrer(value)).toBe('');
 });
 it('não envia IDs publicitários sem marketing nem confunde login com entrada de jogo',()=>{
  expect(campaignQuery('?utm_source=google&gclid=secret&fbclid=secret',false)).toBe('?utm_source=google');
  expect(campaignQuery('?utm_source=11975976215')).toBe('');
  expect(publicPath('/entrar')).toBe('/entrar');
  expect(gamePath('/host/ABCD')).toBe('/partida/anfitriao');
  expect(gamePath('/ABCD')).toBe('/partida/jogador');
  expect(gamePath('/conta')).toBeNull();
  for(const host of ['localhost','quiddo-premium-pdf-stage-20261107.guitorniero.workers.dev','fake.quiddo.com.br']) expect(measurementHost(host)).toBe(false);
 });
});
describe('uso confirmado pelo servidor, sem respostas nem duplicação de reconexão',()=>{
 it('conta entrada, início, resposta confirmada e término uma vez',()=>{
  const events:any[]=[];const observe=gameMeasurement('player',(event,params)=>events.push({event,params}));
  observe({phase:'lobby',qIndex:0});observe({phase:'lobby',qIndex:0});
  observe({phase:'question',qIndex:0});observe({phase:'question',qIndex:0,answered:true});
  observe({phase:'reveal',qIndex:0,answered:true});observe({phase:'final',qIndex:0,answered:true});observe({phase:'final',qIndex:0,answered:true});
  expect(events.map(x=>x.event)).toEqual(['join_room','game_start','answer_recorded','game_complete']);
  expect(events.every(x=>Object.keys(x.params).join()==='role')).toBe(true);
 });
 it('abrir um pódio antigo não vira jogo concluído',()=>{
  const events:string[]=[];const observe=gameMeasurement('host',event=>events.push(event));
  observe({phase:'final',qIndex:4});observe({phase:'final',qIndex:4});expect(events).toEqual([]);
 });
});
