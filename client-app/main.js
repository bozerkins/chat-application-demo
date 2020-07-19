function renderMessage(name, isThisMe, message)
{
    const messageColor = isThisMe ? 'alert-info' : 'alert-secondary';
    const messageFloat = isThisMe ? 'float-right' : 'float-left';
    const authorFloat = isThisMe ? 'chat-author-me' : 'chat-author-not-me';
    const rendered = `
        <div class="chat-message w-100 p-1 clearfix">
            <span class="alert ${messageColor} ${messageFloat} m-0">
                ${message}
            </span>
            <span class="chat-message-author ${authorFloat}">${name}</span>
        </div>
    `;
    $('.chat-message-cotnainer').first().append(rendered);
}

function inputEnterEvent(input, server)
{
    const message = input.val();
    if (!message) {
        return;
    }
    server.send(JSON.stringify(
        { message: message, me: true, author: getUser()['cognito:username'] }
    )); 
    input.val('');
}

function initControls(server)
{
    const input = $('#chat-message-input');
    input.focus();
    input.keyup(function(e) {
        if(e.keyCode == 13) // Enter
        {
            inputEnterEvent(input, server);
        }
    });
}

function getCookie(cname) 
{
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
        c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
        }
    }
    return "";
}

function getUser()
{
    const idToken = getCookie('id_token');
    if (!idToken) {
        return null;
    }
    const decoded = jwt_decode(idToken);
    if (!decoded) {
        return null;
    }
    return decoded;
}

function init()
{
    const user = getUser();
    if (user === null) {
        window.location.href = 'http://localhost:8001/login';
        return;
    }

    $('#username').text(user['cognito:username']);
    $('#usernameControlDisplay').text('@' + user['cognito:username']);
    $('#logoutButton').click(() => {
        document.cookie = "id_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.reload();
    });

    const server = new WebSocket("ws://localhost:8000/");
    let firstReceive = false;
    server.onmessage = function(event) {
        console.log(event.data);
        // parse the payload
        const payload = JSON.parse(event.data);
        const username = getUser()['cognito:username'];
        let messages = payload.messages.map((message) => {
            message.me = message.author === username;
            return message;
        });
        // init message
        messages.sort(function(a, b) {
            return a.ts - b.ts;
        });
        messages.forEach((message) => {
            renderMessage(message.author, message.me, message.message)
        });
        if (firstReceive === false) {
            firstReceive = true;
            initControls(server);
        }
        console.log(payload);
    };
}

init();
