const fs = require('fs');
const code = fs.readFileSync('./apps/main/public/vendor/qrcode.min.js','utf8');
// 库最后一句是: return qrcode (闭包返回)
// 然后 'function(t){...}(function(){return qrcode})' 是 UMD wrapper
// 浏览器 var qrcode=function(){...} 把 qrcode 暴露到全局
// 在 Node 里要 eval 后从某个全局空间拿

// 模拟浏览器全局 eval
const vm = require('vm');
const ctx = vm.createContext({ window: {}, self: {} });
vm.runInContext(code, ctx);
const qrcode = ctx.qrcode || ctx.window.qrcode;
console.log('typeof qrcode:', typeof qrcode);
if (typeof qrcode === 'function') {
  for (const ec of [0, 1, 2, 3]) {
    try {
      const q = qrcode(0, ec);
      q.addData('https://jsonversal.com');
      q.make();
      console.log('ec=' + ec, 'modules=', q.getModuleCount());
    } catch (e) {
      console.log('ec=' + ec, 'err:', e);
    }
  }
}
