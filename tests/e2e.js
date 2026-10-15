const puppeteer=require('puppeteer-core');
(async()=>{
 const log=(...a)=>console.log(...a);
 const b=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,userDataDir:require('path').join(require('os').tmpdir(),'e2e-chrome-'+Date.now())});
 const p=await b.newPage(); p.on('console',async m=>{if(['error','warning'].includes(m.type())){const parts=await Promise.all(m.args().map(a=>a.evaluate(v=>v instanceof Error?v.message:String(v)).catch(()=>'?')));log('CONSOLE',m.type(),(parts.join(' ')||m.text()).slice(0,200))}}); p.on('response',r=>{if(r.status()>=400)log('HTTP',r.status(),r.request().method(),r.url().replace('http://localhost:5173',''))}); p.on('pageerror',e=>log('PAGEERROR',e.message.slice(0,200)));
 p.setDefaultTimeout(5000);
 const t=id=>`[data-testid="${id}"]`;
 const step=async(name,fn)=>{try{await fn();log('PASS',name)}catch(e){log('FAIL',name,'->',e.message.split('\n')[0].slice(0,200));log('  PAGE TEXT:',(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(0,400));await b.close();process.exit(0)}};
 const count=async id=>(await p.$$(t(id))).length;
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 await p.goto('http://localhost:5173/',{waitUntil:'networkidle0'});
 await step('register',async()=>{await p.click(t('nav-login'));await p.waitForSelector(t('auth-email'));await p.click(t('auth-toggle'));await p.waitForSelector(t('auth-name'));await p.type(t('auth-name'),'مالك');await p.type(t('auth-email'),'e2e'+Date.now()+'@test.com');await p.type(t('auth-password'),'password123');await p.click(t('auth-submit'));await p.waitForSelector(t('user-name'))});
 const store='E2E متجر '+Date.now()%10000;
 await step('create store',async()=>{await p.type(t('new-store-name'),store);await p.click(t('create-store'));await p.waitForFunction(s=>[...document.querySelectorAll('[data-testid="store-item"]')].some(e=>e.textContent.includes(s)),{},store)});
 await step('reload keeps login',async()=>{await p.reload({waitUntil:'networkidle0'});await p.waitForSelector(t('store-item'),{timeout:8000})});
 await step('open store',async()=>{const items=await p.$$(t('store-item'));for(const i of items){if((await i.evaluate(e=>e.textContent)).includes(store)){await i.click();break}}await p.waitForSelector(t('new-product-name'))});
 await step('create product',async()=>{await p.type(t('new-product-name'),'قهوة');await p.type(t('new-product-price'),'25');await p.click(t('create-product'));await p.waitForSelector(t('product-item'))});
 await step('upload product image',async()=>{const inp=await p.$(t('product-image-input'));await inp.uploadFile(require('path').join(__dirname,'test.png'));if(await count('upload-image'))await p.click(t('upload-image'));await p.waitForFunction(()=>{const i=document.querySelector('[data-testid="product-image"]');return i&&i.complete&&i.naturalWidth>0},{timeout:8000})});
 await step('add to cart x2',async()=>{await p.click(t('add-to-cart'));await sleep(500);await p.click(t('add-to-cart'));await p.waitForFunction(()=>{const e=document.querySelector('[data-testid="cart-total"]');return e&&e.textContent.includes('50')})});
 await step('cart shows item',async()=>{await p.waitForSelector(t('cart-item'));log('  cart-total text:',await p.$eval(t('cart-total'),e=>e.textContent))});
 await step('create order',async()=>{await p.type(t('customer-name'),'علي');await p.type(t('customer-phone'),'0500000000');await p.type(t('customer-address'),'الرياض');await p.click(t('create-order'));await p.waitForSelector(t('card-number'))});
 await step('declined card',async()=>{await p.type(t('card-number'),'4111111111110000');await p.click(t('pay'));await p.waitForFunction(()=>{const e=document.querySelector('[data-testid="payment-result"],[data-testid="error-message"]');return e&&e.textContent.includes('مرفوض')})});
 await step('paid card',async()=>{await p.$eval(t('card-number'),e=>{e.value=''});await p.click(t('card-number'),{clickCount:3});await p.keyboard.press('Backspace');await p.type(t('card-number'),'4111111111111111');await p.click(t('pay'));await p.waitForFunction(()=>{const e=document.querySelector('[data-testid="payment-result"]');return e&&e.textContent.includes('تم الدفع')})});
await step('dashboard shows order, revenue, ship it',async()=>{await p.click(t('nav-dashboard'));await p.waitForSelector(t('dash-order'));await p.waitForFunction(()=>document.querySelector('[data-testid="stat-revenue"]').textContent.includes('50'));await p.click(t('ship-order'));await p.waitForFunction(()=>[...document.querySelectorAll('[data-testid="dash-order"]')].some(e=>/تم الشحن|shipped/.test(e.textContent)))});
 await step('logout hides create-store',async()=>{if(await count('back'))await p.click(t('back'));await p.click(t('logout'));await p.waitForSelector(t('nav-login'));if((await p.$$(t('create-store'))).length)throw new Error('create-store visible after logout')});
 await step('other user sees no product controls',async()=>{await p.click(t('nav-login'));await p.waitForSelector(t('auth-email'));await p.click(t('auth-toggle'));await p.waitForSelector(t('auth-name'));await p.type(t('auth-name'),'زائر');await p.type(t('auth-email'),'o'+Date.now()+'@test.com');await p.type(t('auth-password'),'password123');await p.click(t('auth-submit'));await p.waitForSelector(t('user-name'));const items=await p.$$(t('store-item'));for(const i of items){if((await i.evaluate(e=>e.textContent)).includes(store)){await i.click();break}}await p.waitForSelector(t('product-item'));if(await count('create-product')||await count('delete-product')||await count('product-image-input'))throw new Error('non-owner sees product controls')});
 await p.screenshot({path:require('path').join(__dirname,'salla-e2e.png'),fullPage:true});
 log('ALL PASSED');await b.close();
})();








