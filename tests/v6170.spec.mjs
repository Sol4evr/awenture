import {test,expect} from '@playwright/test';

test('learning progression renders one functional timeline and starts at ICAS Y2',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.aw-functional-path')).toHaveCount(1);
  const steps=page.locator('.aw-functional-path .aw-stage-step');
  await expect(steps).toHaveCount(4);
  await expect(steps.nth(0)).toContainText('ICAS Year 2');
  await expect(steps.nth(0)).toHaveClass(/current/);
  await expect(steps.nth(1)).toBeDisabled();
});

test('Parent QA cannot unlock ICAS Y3',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('oc-ready-progress-v1',JSON.stringify({attempts:Array.from({length:60},()=>({type:'parent-qa',score:100})),skillStats:Object.fromEntries(Array.from({length:10},(_,i)=>['s'+i,{a:6,c:6}]))}));
  });
  await page.goto('/');
  const model=await page.evaluate(()=>window.AW_PROGRESSION.model());
  expect(model.progress.unlocked).toEqual(['icas-y2']);
});

test('readiness gate counts authentic papers, unlocks ICAS Y3 and supports selecting it',async({page})=>{
  await page.addInitScript(()=>{
    const attempts=[...Array.from({length:40},()=>({type:'practice',score:90})),{type:'icas-original',score:90},{type:'icas-original',score:90}];
    const skillStats=Object.fromEntries(Array.from({length:10},(_,i)=>['s'+i,{a:5,c:5,guess:0,certainWrong:0}]));
    localStorage.setItem('oc-ready-progress-v1',JSON.stringify({attempts,skillStats}));
  });
  await page.goto('/');
  const y3=page.locator('.aw-stage-step[data-stage="icas-y3"]');
  await expect(y3).toBeEnabled();
  await y3.click();
  await expect(page.locator('.aw-stage-step[data-stage="icas-y3"]')).toHaveClass(/current/);
  const model=await page.evaluate(()=>window.AW_PROGRESSION.model());
  expect(model.fullPapers).toBe(2);
  expect(model.weights['icas-y2']).toBe(.7);
  expect(model.weights['icas-y3']).toBe(.3);
});

test('Daily Practice transition rebalances tagged future content without changing subject counts',async({page})=>{
  await page.addInitScript(()=>{
    const attempts=[...Array.from({length:40},()=>({type:'practice',score:90})),{type:'icas-original',score:90},{type:'icas-original',score:90}];
    const skillStats=Object.fromEntries(Array.from({length:10},(_,i)=>['s'+i,{a:5,c:5}]));
    localStorage.setItem('oc-ready-progress-v1',JSON.stringify({attempts,skillStats}));
    localStorage.setItem('awenture-learning-progression-v1',JSON.stringify({unlocked:['icas-y2','icas-y3'],current:'icas-y3'}));
  });
  await page.goto('/');
  const result=await page.evaluate(()=>{
    const subjects={English:4,Mathematics:4,Science:4,Spelling:3},selected=[],bank=[];
    for(const [subject,n] of Object.entries(subjects)){
      for(let i=0;i<n;i++){const q={id:`${subject}-y2-${i}`,subject,family:`${subject}-y2-${i}`,stage:'icas-y2'};selected.push(q);bank.push(q)}
      for(let i=0;i<n;i++)bank.push({id:`${subject}-y3-${i}`,subject,family:`${subject}-y3-${i}`,stage:'icas-y3'});
    }
    const out=window.AW_PROGRESSION.rebalanceDaily(selected,bank,[],1234);
    return {length:out.length,subjects:Object.fromEntries(Object.keys(subjects).map(s=>[s,out.filter(q=>q.subject===s).length])),y3:out.filter(q=>q.stage==='icas-y3').length};
  });
  expect(result.length).toBe(15);
  expect(result.subjects).toEqual({English:4,Mathematics:4,Science:4,Spelling:3});
  expect(result.y3).toBe(4);
});
