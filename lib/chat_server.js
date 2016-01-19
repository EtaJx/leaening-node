var socketio = require('socket.io');
var io;
var guestNumer = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function (server){
    io = socketio.listen( server );//启动socket.io服务器，允许它搭载在已有的http服务器上
    io.set('log level',1);
    io.sockets.on('connection',function(socket){ //定义每个用户的链接的处理逻辑

        guestNumer = assignGuestName(socket,guestNumer,nickNames,namesUsed);//

        joinRoom(socket,'Lobby');//在用户链接上来时把他放入聊天室Lobby里面

        handleMessageBroadcasting(socket,nickNames,namesUsed);//处理用户的消息，更名，以及聊天室的创建和变更

        handleNameChangeAttempts(socket,nickNames,namesUsed);

        handleRoomJoining( socket );
        socket.on('rooms',function(){//当用户发出请求时，向其提供已经被占用的聊天室
            socket.emit('rooms',io.sockets.manager.rooms);
        });
        handleClientDisconnection(socket,nickNames,namesUsed);//定义用户断开连接后的清楚逻辑
    });
}

function assignGuestName( socket, guestNumber,nickNames,namesUsed ){//给用户分配默认的昵称
    var name = 'Guest'+guestNumber;//生成默认昵称
    nickNames[socket.id] = name;//让用户昵称跟客户端连接ID关联上
    socket.emit('nameResult',{//让用户知道他们自己的昵称
        success:true,
        name:name
    });
    namesUsed.push( name );//存放已经被占用的昵称
    return guestNumber+1;//增加用来生成昵称的计数器

}

/*
* 进入聊天室
* */
function joinRoom(socket, room){
    socket.join( room );//让用户进入房间
    currentRoom[socket.id] = room;//记录当前的房间
    socket.emit('joinResult',{room:room});//让用户知道他们进入了房间
    socket.broadcast.to(room).emit('message',{text:nickNames[socket.id]+ ' has joined ' + room + '.'} );//让房间其他用户知道有新用户进入了房间
    var usersInRoom = io.sockets.client( room );// 确定哪些用户在房间里面
    if ( usersInRoom.length > 1) {//如果不止一个用户在这个房间里面，汇总下都是谁
        var usersInRoomSummary = 'Users currently in '+ room + ':';
        for ( var index in usersInRoom ) {
            var userSocketId = usersInRoom[index].id;
            if( userSocketId != socket.id ) {
                if( index > 0){
                    usersInRoomSummary += ",";
                }
                usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary += ".";
        socket.emit('message',{text:usersInRoomSummary});//将房间其他用户的汇总发送给这个用户
    }
}

/*
* 更名请求的处逻辑
* */
function handleNameChangeAttemps(socket, nickNames,namesUsed){
    socket.on('nameAttempt',function(name){//添加attempt事件
        if(name.indexOf('Guest') == 0){//昵称不能以Guest开头
            socket.emit('nameResult',{
                sucess:false,
                message:'Names cannot begin width Guest'
            });
        } else {
            if ( namesUsed.indexOf(name) == -1 ){// 如果昵称还没存在
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf( previousName );
                namesUsed.push( name );
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex];//删除之前用的昵称，让其他用户可用
                socket.emit('nameResult',{
                    success:true,
                    name:name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message',{
                    text:previousName + 'is now known as '+name + '.'
                });
            } else {
                socket.emit('nameResult',{//如果昵称已经被占用，给客户端发送错误消息
                    success:false,
                    message:'that name is already in use.'
                });
            }
        }
    })
}

/*
* 发送聊天消息
* */
function handleMessageBroadcasting( socket ){
    socket.on('message',function( message ) {
        socket.broadcast.to(message.room).emit('message',{//socketIO的broadcast用来转发消息
            text:nickNames[socket.id] + ':'+message.text
        });
    });
}

/*
* 切换聊天室
* */
function handleRoomJoining( socket ){
    socket.on('join',function(room){
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket,room.newRoom);
    });
}

/*
* 移除用户信息
* */
function handleClientDisconnection( socket ){
    socket.on('disconnect',function(){
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    })
}