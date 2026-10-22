import http from 'node:http';
import app from '../worker/index.js';
http.createServer(async(req,res)=>{try{const result=await app.fetch(new Request('http://localhost:4173'+req.url),{},{waitUntil:p=>p.catch(()=>{})});res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()))}catch(e){res.writeHead(500);res.end(e.message)}}).listen(4173,'0.0.0.0');
