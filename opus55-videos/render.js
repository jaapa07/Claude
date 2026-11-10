// Renders an HTML animation deterministically: the page exposes window.DURATION and
// window.renderFrame(t) (t in seconds). Each frame is screenshotted and piped to ffmpeg.
// Usage: node render.js src/01-motion.html out/01-motion.mp4 [fps]
const {chromium}=require('playwright');const {spawn}=require('child_process');const path=require('path');
(async()=>{
  const [,,src,out,fpsArg]=process.argv;const fps=+fpsArg||30;
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  p.on('pageerror',e=>console.error('PAGEERR',e.message));
  await p.goto('file://'+path.resolve(src));await p.waitForFunction(()=>window.renderFrame&&window.READY!==false);
  const dur=await p.evaluate(()=>window.DURATION);const n=Math.round(dur*fps);
  const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',''+fps,'-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','20','-preset','medium','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
  for(let i=0;i<n;i++){await p.evaluate(t=>window.renderFrame(t),i/fps);ff.stdin.write(await p.screenshot({type:'jpeg',quality:92}));if(i%60==0)process.stdout.write(`${src} ${i}/${n}\r`)}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('\ndone',out,n,'frames');
})();
