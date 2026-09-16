const http=require('http');
const fs=require('fs');
const path=require('path');

const PORT=process.env.PORT||9876;
const DIR=__dirname;
const HTML_FILE=path.join(DIR,'index.html');
const DATA_FILE=path.join(DIR,'data.json');

let memoryData=null;

function loadData(){
  try{
    if(fs.existsSync(DATA_FILE)){
      memoryData=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));
      console.log('[DATA] Loaded from data.json');
      return;
    }
  }catch(e){console.error('[DATA] Failed to read data.json:',e.message)}
  try{
    const init=JSON.parse(fs.readFileSync(path.join(DIR,'initial_data.json'),'utf8'));
    memoryData=init;
    fs.writeFileSync(DATA_FILE,JSON.stringify(init,null,2));
    console.log('[DATA] Initialized from initial_data.json');
  }catch(e){
    console.error('[DATA] No initial data found, starting empty');
    memoryData={months:{},currentMonth:"",deptMapping:[]};
  }
}

loadData();

const server=http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}

  if(req.url==='/'&&(req.method==='GET'||req.method==='HEAD')){
    try{
      const html=fs.readFileSync(HTML_FILE,'utf8');
      res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
      res.end(html);
    }catch(e){
      res.writeHead(500,{'Content-Type':'text/plain'});
      res.end('HTML file not found: '+e.message);
    }
    return
  }

  if(req.url==='/api/data'&&req.method==='GET'){
    res.writeHead(200,{'Content-Type':'application/json;charset=utf-8'});
    res.end(JSON.stringify(memoryData||{}));
    return
  }

  if(req.url==='/api/data'&&req.method==='POST'){
    let body='';
    req.on('data',chunk=>{
      body+=chunk;
      if(body.length>10*1024*1024){
        res.writeHead(413);res.end('Payload too large');
        req.destroy();
      }
    });
    req.on('end',()=>{
      try{
        const data=JSON.parse(body);
        memoryData={
          months:data.months||{},
          currentMonth:data.currentMonth||"",
          deptMapping:data.deptMapping||[]
        };
        fs.writeFile(DATA_FILE,JSON.stringify(memoryData,null,2),err=>{
          if(err)console.error('[DATA] Write failed:',err.message);
          else console.log('[DATA] Saved ('+body.length+' bytes, '+Object.keys(memoryData.months).length+' months)');
        });
        res.writeHead(200,{'Content-Type':'application/json'});
        res.end(JSON.stringify({ok:true}));
      }catch(e){
        console.error('[DATA] Parse error:',e.message);
        res.writeHead(400,{'Content-Type':'application/json'});
        res.end(JSON.stringify({error:e.message}));
      }
    });
    return
  }

  res.writeHead(404,{'Content-Type':'text/plain'});
  res.end('Not found');
});

server.listen(PORT,()=>{
  console.log(`\n========================================`);
  console.log(`  人员情况管理系统 已启动`);
  console.log(`  访问地址: http://localhost:${PORT}`);
  console.log(`  数据文件: ${DATA_FILE}`);
  console.log(`  关闭服务: 按 Ctrl+C`);
  console.log(`========================================\n`);
});
