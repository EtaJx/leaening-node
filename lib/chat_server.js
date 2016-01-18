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
    socket.join( roon );//让用户进入房间
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
                    usersInRoomSummary += ".";
                    socket.emit('message',{text:usersInRoomSummary});//将房间里其他用户的汇总发送给进入房间的这个用户
                }
            }
        }

    }
}