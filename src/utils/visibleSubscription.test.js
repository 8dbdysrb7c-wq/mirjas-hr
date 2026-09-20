import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subscribeWhileVisible } from './visibleSubscription.js';

function fixture(initial='visible') {
 let listener; const calls=[]; let stops=0; const values=[]; const errors=[];
 const page={visibilityState:initial,addEventListener:(_,fn)=>{listener=fn;},removeEventListener:()=>{listener=null;}};
 const dispose=subscribeWhileVisible(page,(next,error)=>{calls.push({next,error});return ()=>{stops++;};},value=>values.push(value),error=>errors.push(error));
 return {calls,values,errors,dispose,get stops(){return stops;}, change(state){page.visibilityState=state;listener?.();}};
}
test('hidden page makes no subscription; returning starts one',()=>{
 const h=fixture('hidden');assert.equal(h.calls.length,0);h.change('visible');h.change('visible');assert.equal(h.calls.length,1);h.calls[0].next(['alert']);assert.deepEqual(h.values,[['alert']]);h.dispose();
});
test('hiding unsubscribes and ignores late snapshots; returning refreshes',()=>{
 const h=fixture();h.change('hidden');assert.equal(h.stops,1);h.calls[0].next(['stale']);assert.equal(h.values.length,0);h.change('visible');assert.equal(h.calls.length,2);h.calls[1].next([]);assert.deepEqual(h.values,[[]]);h.dispose();assert.equal(h.stops,2);
});
test('cleanup prevents updates from previous employee session',()=>{
 const h=fixture();h.dispose();h.calls[0].next(['other employee']);h.calls[0].error(new Error('late'));h.change('visible');assert.equal(h.calls.length,1);assert.equal(h.values.length,0);assert.equal(h.errors.length,0);
});
test('errors are reported without a repeated retry loop',()=>{
 const h=fixture();h.calls[0].error('quota');assert.deepEqual(h.errors,['quota']);h.change('visible');assert.equal(h.calls.length,1);h.dispose();
});
