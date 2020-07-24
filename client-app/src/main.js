import { getUser } from './utils.js';
import { ChatRoom } from './ChatRoom.js';
import { Overlay } from './Overlay.js';
import { Socket } from './Socket.js';

(function() {
    // check authentication
    const user = getUser();
    if (user === null) {
        window.location.href = 'http://localhost:8001/login';
        return;
    }    

    //create the chat room
    let chatRoom = new ChatRoom(user);
    let overlay = new Overlay();
    let socket = new Socket("ws://localhost:8000/join?room=RandomChatRoom");
    socket.bindOpen((event) => {
        overlay.hide();
        chatRoom.render();
        chatRoom.startControls(socket);
    });
    socket.bindError((event) => {
        overlay.error();
        console.log(event);
    });
    socket.bindMessage((event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === 'msg') {
            chatRoom.renderMessage(payload.payload);
        }
        if (payload.type === 'usr') {
            chatRoom.renderUser(payload.payload);
        }
        if (payload.type === 'out') {
            chatRoom.removeUser(payload.payload);
        }
        if (payload.type === 'chat') {
            chatRoom.renderChatRoomName(payload.payload);
        }
    });
    
    overlay.bindRetry((event) => {
        overlay.loading();
        socket.connect();
    });
    overlay.bindClose((event) => {
        window.location.href = 'index.html';
    });
    
    overlay.loading();
    socket.connect();
})();