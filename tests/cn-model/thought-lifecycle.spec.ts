import { test, expect } from '@playwright/test';
import './market-context';
import { createActions, createThoughts } from '../../src/features/personal/store';
import { createWorkspaceStore, M } from '../../src/features/spaces/model/store';
import { recordingMode } from '../../src/features/meetings/recording-mode';
import { captureAudioSource } from '../../src/features/personal/capture-audio-source';
import { creationSourceLabel } from '../../src/features/personal/creation-source';

const now = () => new Date('2026-10-19T04:00:00Z');
function memory() {
  const values = new Map<string, string>();
  return { getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => { values.set(k, v); },
    removeItem: (k: string) => { values.delete(k); } } as Storage;
}
test.beforeEach(() => Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent() {} } }));
test.afterEach(() => Reflect.deleteProperty(globalThis, 'window'));

test('deleting actions persists, rejects stale edits and preserves unrelated records', () => {
  const storage = memory(), repo = createActions(storage, now);
  expect(repo).toHaveProperty('remove');
  const original = repo.read().records[0], other = repo.read().records[1];
  repo.remove(original);
  const reopened = createActions(storage, now);
  expect(reopened.read().records.some(r => r.id === original.id)).toBe(false);
  expect(reopened.read().records.find(r => r.id === other.id)).toEqual(other);
  expect(() => reopened.save(original)).toThrow('已删除');
});

test('thought deletion supports device records and prevents shared members deleting or expired-team writes', () => {
  const storage = memory();
  const ws = createWorkspaceStore(storage, now);
  ws.change(s => { const w = M.get(s, 'team-eureka');
    w.members.find(m => m.id === 'lin')!.role = 'member';
    M.addThought(w, { title: '待删除设备闪念', detail: '原始内容' }, 'zhang');
    w.thoughtSharing = { zhang: { inspiration: ['lin'] } };
  });
  const repo = createThoughts(storage, now, 'zhang', 'team-eureka');
  expect(repo).toHaveProperty('remove');
  const record = repo.read().records.find(r => r.title === '待删除设备闪念')!;
  expect(() => createThoughts(storage, now, 'lin', 'team-eureka').remove(record)).toThrow();
  const current = createWorkspaceStore(storage, now);
  current.change(s => { M.get(s, 'team-eureka').status = 'expired'; });
  expect(() => createThoughts(storage, now, 'zhang', 'team-eureka').remove(record)).toThrow();
  current.change(s => { M.get(s, 'team-eureka').status = 'active'; });
  createThoughts(storage, now, 'zhang', 'team-eureka').remove(record);
  expect(createThoughts(storage, now, 'zhang', 'team-eureka').read().records.some(r => r.id === record.id)).toBe(false);
});

test('deletion rejects stale snapshots and failed storage writes without losing records', () => {
  const storage = memory(), repo = createThoughts(storage, now);
  const old = repo.read().records[0];
  repo.save({...old, title:'已更新'});
  expect(() => createThoughts(storage, now).remove(old)).toThrow('已更新');
  const current = createThoughts(storage, now).read().records.find(r => r.id === old.id)!;
  const failing = Object.create(storage) as Storage;
  failing.setItem = () => { throw Error('quota'); };
  expect(() => createThoughts(failing, now).remove(current)).toThrow('保存失败');
  expect(createThoughts(storage, now).read().records.find(r => r.id === old.id)?.title).toBe('已更新');
});

test('call mode requires a supported device and explicit mode or bounded fixture', () => {
  for (const source of ['W1','W2','M1']) {
    expect(recordingMode({source,recordingMode:'call'})).toBe('call');
    expect(recordingMode({source})).toBe('environment');
  }
  for (const source of ['网页录音','合并录音','文件上传','W-PEN','unknown'])
    expect(recordingMode({source,recordingMode:'call'})).toBe('environment');
  expect(recordingMode({id:'meeting-3',source:'M1'})).toBe('call');
  expect(recordingMode({id:'meeting-3',source:'M1',recordingMode:'environment'})).toBe('environment');
});

test('capture audio never substitutes fixture for missing or unsafe real resources; source labels keep Agent distinct', () => {
  expect(captureAudioSource({id:'idea-1',source:'capture'})).toMatch(/meeting-demo\.wav$/);
  expect(captureAudioSource({id:'unknown-capture',source:'capture'})).toBe('');
  expect(captureAudioSource({id:'idea-1',source:'capture',captureAudioUrl:'javascript:alert(1)'})).toBe('');
  expect(captureAudioSource({id:'idea-1',source:'capture',captureAudioUrl:''})).toBe('');
  expect(captureAudioSource({id:'real',captureAudioUrl:'/original.wav'})).toBe('/original.wav');
  expect(creationSourceLabel('agent')).toBe('Agent 创建');
  expect(creationSourceLabel('unknown')).toBe('其他来源');
});
