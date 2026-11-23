import test from 'node:test';
import assert from 'node:assert/strict';
import {slotKeys} from '../src/slots.js';
const start=new Date('2026-12-01T05:30:00.000Z');
test('overlapping appointments share occupancy keys',()=>{
 const a=slotKeys({staffId:'A',patientId:'P',start,durationMinutes:60});
 const b=slotKeys({staffId:'A',patientId:'Q',start:new Date(start.getTime()+30*60000),durationMinutes:30});
 assert.ok(a.some(x=>b.includes(x)));
});
test('different clinicians still cannot double-book a patient',()=>{
 const a=slotKeys({staffId:'A',patientId:'P',start,durationMinutes:30});
 const b=slotKeys({staffId:'B',patientId:'P',start,durationMinutes:30});
 assert.ok(a.some(x=>b.includes(x)));
});
test('back-to-back appointments do not overlap',()=>{
 const a=slotKeys({staffId:'A',patientId:'P',start,durationMinutes:30});
 const b=slotKeys({staffId:'A',patientId:'Q',start:new Date(start.getTime()+30*60000),durationMinutes:30});
 assert.ok(!a.some(x=>b.includes(x)));
});
test('misaligned start is rejected',()=>{
 assert.throws(()=>slotKeys({staffId:'A',patientId:'P',start:new Date(start.getTime()+60000),durationMinutes:30}));
});
test('partial five-minute duration reserves ceiling cells',()=>{
 assert.equal(slotKeys({staffId:'A',patientId:'P',start,durationMinutes:6}).length,4);
});
