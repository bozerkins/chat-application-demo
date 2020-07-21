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
    $('.chat-message-container').first().append(rendered);
}

function inputEnterEvent(input, server)
{
    const message = input.val();
    if (!message) {
        return;
    }
    let resp = server.send(JSON.stringify(
        { message: message }
    ));
    console.log(resp);
    input.val('');
    // scroll to bottom
    const container = $('.chat-message-container');
    container.scrollTop(container.prop("scrollHeight"));
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

function createPicker()
{
    const button = document.querySelector('#emoji-button');
    const picker = new EmojiButton({
        autoFocusSearch: false,
        showSearch: false,
        autoHide: false
    });
   
    picker.on('emoji', emoji => {
        const input = $('#chat-message-input');
        input.val(input.val() + emoji);
        input.focus();
    });
   
    button.addEventListener('click', () => {
      picker.togglePicker(button);
    });
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
    
    createPicker();

    let autoscroll = true;
    $('.chat-message-container').scroll(function() {
        let atTheBottom = ($(this).prop("scrollHeight") - Math.floor($(this).scrollTop() + $(this).outerHeight())) === 0;
        if (atTheBottom === false) {
            autoscroll = false;
        } else {
            autoscroll = true;
        }
    });

    const server = new WebSocket("ws://localhost:8000/");
    initControls(server);

    server.onmessage = function(event) {
        console.log(event.data);

        const message = JSON.parse(event.data);
        message.me = message.sub ===  getUser().sub;

        renderMessage(`${message.author} (${message.sub})`, message.me, message.message)

        // scroll to bottom
        if (autoscroll === true) {
            const container = $('.chat-message-container');
            container.scrollTop(container.prop("scrollHeight"));
        }
    };

    server.onerror = function(error) {
        console.log(error);
    };
}

init();
