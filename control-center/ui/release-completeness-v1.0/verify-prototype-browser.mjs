async (page) => {
  if(!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(page.url()))throw new Error('请先通过 CC_PROTOTYPE_URL 指向的 127.0.0.1 静态测试地址打开 prototype.html；不得连接业务服务。');
  await page.setViewportSize({width:1440,height:1000});
  await page.waitForLoadState('load');
  const baseHref=page.url().split(/[?#]/)[0];
  const cases=[];
  const check=async(name,fn)=>{
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(baseHref);
    await page.waitForLoadState('load');
    await fn();
    cases.push(name);
  };
  const expect=(condition,message)=>{if(!condition)throw new Error(message);};

  await check('统一信息架构与当前未就绪无伪标记',async()=>{
    expect(await page.locator('nav [data-primary-group]').count()===6,'一级导航不是6组');
    expect(await page.locator('nav [data-index]').count()===12,'目的页不是12个');
    expect(await page.locator('#chart-mark').isDisabled(),'当前未就绪仍可点击虚构标记');
    expect((await page.locator('#interactive-chart').innerText()).includes('不绘制图表标记'),'当前未就绪缺无标记说明');
  });

  await check('十二目的页索引、H1、真相和数据模式逐页一致',async()=>{
    const expected=[
      ['总览','当前事实 · 数据未就绪','current_unavailable'],['项目与阶段','目标态演示数据 · 非当前运行事实','target_demo'],
      ['项目证据详情','目标态演示数据 · 非当前运行事实','target_demo'],['固定角色协作','目标态演示数据 · 非当前运行事实','target_demo'],
      ['审批与待审','目标态演示 · 查询成功，确实为空','evidenced_empty'],['产物与哈希','目标态演示数据 · 非当前运行事实','target_demo'],
      ['事件审计','目标态演示数据 · 非当前运行事实','target_demo'],['问题、Bug 与复测','目标态演示数据 · 非当前运行事实','target_demo'],
      ['迭代与发布','目标态演示数据 · 非当前运行事实','target_demo'],['来源、覆盖与新鲜度','目标态演示 · 来源失败与陈旧状态','stale_snapshot'],
      ['成熟度与治理','目标态演示数据 · 证据不足不计算','target_demo'],['系统状态与恢复','目标态演示 · 同一陈旧真相态配对','stale_snapshot']
    ];
    for(let index=0;index<expected.length;index+=1){
      await page.locator(`nav [data-index="${index}"]`).click();
      const state=await page.evaluate(()=>({page:new URL(location.href).searchParams.get('page'),title:document.querySelector('h1#page-title')?.textContent,truth:document.querySelector('#truth-copy')?.textContent,index:document.body.dataset.pageIndex,mode:document.body.dataset.dataMode,current:document.querySelector('nav [aria-current="page"]')?.dataset.index}));
      expect(state.page===String(index)&&state.index===String(index)&&state.current===String(index),`页面 ${index} URL/body/aria-current 索引错配`);
      expect(state.title===expected[index][0]&&state.truth===expected[index][1]&&state.mode===expected[index][2],`页面 ${index} H1/真相/dataMode 错配`);
    }
  });

  await check('审批成功空态来源证据与查询范围哈希分离且范围锁定',async()=>{
    await page.locator('nav [data-index="4"]').click();
    expect(await page.locator('#chart-mark').isDisabled(),'审批空态仍可点击虚构标记');
    for(const selector of ['#project-filter','#time-filter','#iteration-filter','#source-filter','#search-input','#search-submit','#clear-filter'])expect(await page.locator(selector).isDisabled(),`审批证据范围未锁定 ${selector}`);
    await page.locator('#export').click();
    await page.waitForFunction(()=>/^[0-9a-f]{64}$/.test(document.querySelector('#export-hash')?.textContent??'')&&/^[0-9a-f]{64}$/.test(document.querySelector('#export-scope-hash')?.textContent??''));
    const hashes=await page.evaluate(()=>({source:document.querySelector('#export-hash')?.textContent,scope:document.querySelector('#export-scope-hash')?.textContent,sourceCopy:document.querySelector('#export-source')?.textContent,scopeCopy:document.querySelector('#query-scope')?.textContent}));
    expect(hashes.source!==hashes.scope,'来源SHA与查询范围SHA被混用');
    expect(hashes.sourceCopy.includes('CC-审批登记-只读快照-001')&&hashes.sourceCopy.includes('观测'),'审批空态缺来源身份或观测时间');
    expect(hashes.scopeCopy.includes('范围已锁定')&&hashes.scopeCopy.includes(hashes.source),'审批空态页头未展示独立来源证据');
  });

  await check('目标态事件与问题复测真实可筛选',async()=>{
    await page.locator('nav [data-index="6"]').click();
    expect(await page.locator('#chart-mark').isEnabled(),'目标态有标记页被错误禁用');
    expect((await page.locator('#result-list').innerText()).includes('目标态审计事件'),'事件页无同真相态目标记录');
    await page.locator('#chart-mark').click();
    expect((await page.locator('#interactive-table-body').innerText()).includes('事件'),'事件页主标记没有使用事件上下文');
    await page.keyboard.press('Escape');
    await page.locator('#issue-retest').click();
    expect(await page.locator('#drawer').getAttribute('data-open')==='true','问题到复测未打开证据');
    expect((await page.locator('#interactive-table-body').innerText()).includes('问题'),'问题交叉筛选未联动等价表');
  });

  await check('产物与哈希页标记使用同真相态产物且排除历史',async()=>{
    await page.locator('nav [data-index="5"]').click();
    expect(await page.locator('#chart-mark').isEnabled(),'产物页有同真相态产物却未开放标记');
    const resultText=await page.locator('#result-list').innerText();
    expect(resultText.includes('目标态发布完整性设计产物'),'产物页缺同真相态目标产物');
    expect(!resultText.includes('历史视觉母版'),'产物页混入历史真相产物');
    await page.locator('#chart-mark').click();
    const tableText=await page.locator('#interactive-table-body').innerText();
    expect(tableText.includes('产物')&&tableText.includes('目标态发布完整性设计产物'),'产物标记未联动动态图或完整等价表');
    expect(!tableText.includes('历史视觉母版'),'产物标记下钻混入历史记录');
  });

  await check('陈旧来源保留错误且清除筛选恢复静态回退',async()=>{
    await page.locator('nav [data-index="9"]').click();
    await page.locator('#clear-filter').click();
    expect(await page.locator('#source-filter').inputValue()==='静态回退','清除筛选未恢复陈旧页默认来源');
    await page.locator('#export').click();
    const errorText=await page.locator('#export-error').innerText();
    expect(errorText.includes('来源解析失败')||errorText.includes('连接器未接通'),'陈旧导出丢失来源错误');
  });

  await check('固定角色搜索按类型分组并显示更新时间',async()=>{
    await page.locator('nav [data-index="3"]').click();
    await page.locator('#search-input').fill('00 包工头');
    await page.locator('#filters').evaluate((form)=>form.requestSubmit());
    const resultText=await page.locator('#result-list').innerText();
    expect(resultText.includes('固定角色（1）')&&resultText.includes('更新'),'固定角色搜索分组或更新时间缺失');
  });

  await check('抽屉Escape关闭并返回焦点',async()=>{
    await page.locator('#clear-filter').click();
    await page.locator('#detail').click();
    await page.keyboard.press('Escape');
    expect(await page.locator('#drawer').getAttribute('data-open')==='false','Escape未关闭抽屉');
    expect(await page.evaluate(()=>document.activeElement?.id==='detail'),'关闭后未返回触发控件');
  });

  await check('URL保存页签与筛选并可恢复',async()=>{
    await page.locator('nav [data-index="2"]').click();
    await page.locator('#time-filter').selectOption({label:'过去 24 小时'});
    await page.locator('#iteration-filter').selectOption({label:'当前迭代'});
    expect(await page.evaluate(()=>location.search.includes('page=2')&&location.search.includes('time=')&&location.search.includes('iteration=')),'URL未保存页签与筛选');
    const savedUrl=page.url();
    await page.locator('#time-filter').selectOption({label:'全部时间'});
    await page.goto(savedUrl);
    await page.waitForLoadState('load');
    expect(await page.locator('nav [data-index="2"]').getAttribute('aria-current')==='page','页签未恢复');
    expect(await page.locator('#time-filter').inputValue()==='过去 24 小时','时间筛选未恢复');
    await page.locator('nav [data-index="3"]').click();
    await page.goBack();
    await page.waitForFunction(()=>new URL(location.href).searchParams.get('page')==='2');
    expect(await page.locator('h1#page-title').innerText()==='项目证据详情','浏览器后退未恢复页签H1');
    await page.goForward();
    await page.waitForFunction(()=>new URL(location.href).searchParams.get('page')==='3');
    expect(await page.locator('h1#page-title').innerText()==='固定角色协作','浏览器前进未恢复页签H1');
  });

  await check('移动底栏按十二目的页分组显示当前项',async()=>{
    await page.setViewportSize({width:320,height:720});
    const expected=['总览','项目','项目','项目','项目','项目','项目','质量','更多','更多','更多','更多'];
    for(let index=0;index<expected.length;index+=1){
      await page.locator(`nav [data-index="${index}"]`).click();
      const current=page.locator('#mobile-bottom-nav [aria-current="page"]:visible');
      expect(await current.count()===1,`移动底栏页面 ${index} 当前项数量不是1`);
      expect((await current.innerText()).trim()===expected[index],`移动底栏页面 ${index} 当前项映射错误`);
    }
  });

  await check('焦点2px、移动资产与机器值换行契约',async()=>{
    await page.locator('#detail').focus();
    expect(await page.locator('#detail').evaluate((element)=>getComputedStyle(element).outlineWidth)==='2px','焦点环不是2px');
    await page.setViewportSize({width:320,height:720});
    expect((await page.locator('#screen-320').getAttribute('srcset')).includes('31-mobile-320-'),'320资产未随页签映射');
    const headerText=await page.locator('header').innerText();
    expect(headerText.includes('设计评审工具栏')&&headerText.includes('不属于产品导航'),'原型存在双重产品壳');
    expect(await page.locator('#mobile-bottom-nav').isVisible(),'390/320 移动底栏不可见');
    expect((await page.locator('#mobile-bottom-nav').innerText()).replaceAll('\n','/').includes('总览/项目/质量/更多'),'移动底栏四项不完整');
    await page.locator('#mobile-more-toggle').click();
    expect(await page.locator('#mobile-more-menu').isVisible(),'更多菜单不可见');
    expect(await page.locator('#mobile-more-menu [data-mobile-page]').count()===12,'更多菜单未覆盖12目的页');
    await page.locator('#mobile-more-menu [data-mobile-page="10"]').click();
    expect(await page.evaluate(()=>document.activeElement?.id==='page-title'),'更多菜单选择目的页后焦点未返回新H1');
    await page.locator('#mobile-more-toggle').click();
    await page.locator('#mobile-more-toggle').click();
    expect(await page.evaluate(()=>document.activeElement?.id==='mobile-more-toggle'),'关闭更多菜单后焦点未返回toggle');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'320原型存在页面级横向溢出');
  });

  return {status:'passed',cases};
}
