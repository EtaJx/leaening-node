var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var chatServer = require('./lib/chat_server');
var cache = {};//cache缓存

/*
* 启动socket.iod服务器
* */
chatServer.listen(server);

/*
* reponse 404
* */
function notFound( response ){
    response.writeHead(404,{'Content-Type':'text/plain'});
    response.write('Error 404:resource not found');
    response.end();
}

/*
* 文件数据服务
* */
function sendFile(response, filePath, fileContents ) {
    response.writeHead(200,{"content-type":mime.lookup( path.basename(filePath) )});
    response.end( fileContents );
}

/*
* 提供静态文件服务
* */
function serverStatic(response, cache, absPath){
    if ( cache[absPath] ){//检测文件是否存在内存中
        sendFile( response, absPath, cache[absPath]);//  从内存中返回文件
    } else {
        fs.exists( absPath, function ( exsits ) {
            if(exsits){
                fs.readFile(absPath,function(err,data){//从硬盘读取文件
                    if(err){
                        notFound(response);
                    }else{
                        cache[absPath] = data;
                        sendFile(response,absPath,data);//从硬盘读取文件并返回
                    }
                });
            } else {
                notFound( response );//发送404响应
            }
        });
    }
}

/*
* 创建http服务器
* */
var server = http.createServer(function(request,response){
    var filePath = false;
    if(request.url == "/"){
        filePath = "public/index.html";//确定返回的默认HTML文件
    } else {
        filePath = 'public'+request.url;//将URL路径转换为文件的相对路劲
    }
    var absPath = './'+filePath;
    serverStatic(response,cache,absPath);//返回静态文件
});

server.listen(3000,function(){
    console.log("server listening on port 3000.");
})