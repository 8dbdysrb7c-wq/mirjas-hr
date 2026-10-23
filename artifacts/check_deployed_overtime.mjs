const html = await (await fetch('https://mirjaswork.web.app')).text();
const asset = html.match(/src="([^"]+\.js)"/)[1];
const js = await (await fetch(new URL(asset,'https://mirjaswork.web.app'))).text();
const index = js.indexOf('تعذر تحميل الحضور');
console.log(asset);
console.log(js.slice(index-2700,index+300));
