// Làm rối code trang dashboard claude.ai trước khi ghi vào files/*: node tools/shopee/obfuscate.js <thư mục bản đọc được> <thư mục ra>  (npm i javascript-obfuscator@4.1.1 html-minifier-terser@7.2.0)
const O=require('javascript-obfuscator'),fs=require('fs'),{minify}=require('html-minifier-terser');
(async()=>{
 for(const f of ['app.js','brand.js']){
  const r=O.obfuscate(fs.readFileSync(process.argv[2]+'/'+f,'utf8'),{compact:true,controlFlowFlattening:true,controlFlowFlatteningThreshold:0.4,deadCodeInjection:false,stringArray:true,stringArrayEncoding:['base64'],stringArrayThreshold:0.8,stringArrayRotate:true,stringArrayShuffle:true,splitStrings:false,identifierNamesGenerator:'hexadecimal',renameGlobals:false,selfDefending:false,transformObjectKeys:false,unicodeEscapeSequence:false,target:'browser'});
  fs.writeFileSync(process.argv[3]+'/'+f,r.getObfuscatedCode());
 }
 const h=await minify(fs.readFileSync('src/index.html','utf8'),{collapseWhitespace:true,removeComments:true,minifyCSS:true,conservativeCollapse:true});
 fs.writeFileSync('out/index.html',h);
 for(const f of ['app.js','brand.js','index.html'])console.log(f,fs.statSync(process.argv[2]+'/'+f).size,'->',fs.statSync(process.argv[3]+'/'+f).size);
})();
