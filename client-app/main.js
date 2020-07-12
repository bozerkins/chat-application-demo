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

function inputEnterEvent(input)
{
    const message = input.val();
    if (!message) {
        return;
    }
    renderMessage(getUsername(), true, message);
    input.val('');
}

function initUsername()
{
    $('#username').text(getUsername());
    $('#usernameControlDisplay').text('@' + getUsername());
    $('#usernameInput').val(getUsername());
    $('#usernameSave').click(function() {
        const usernameError = $('#usernameError');
        const usernameInputValue = $('#usernameInput').val();
        if (!usernameInputValue) {
            usernameError.text('Username should not be empty');
            usernameError.show();
        } else {
            setUsername(usernameInputValue);
            usernameError.hide();
            $('#usernameModal').modal('hide');
            
            $('#username').text(getUsername());
            $('#usernameControlDisplay').text('@' + getUsername());
        }
    });
    if (hasUsername() === false) {
        $('#usernameModal').modal('show');
    }
}

function getUsername() {
    let username = window.localStorage.getItem('username');
    if (!username) {
        return 'Anonymous';
    }
    return username;
}

function hasUsername() {
    return getUsername() !== 'Anonymous';
}

function setUsername(username) {
    window.localStorage.setItem('username', username);
}

function clearUsername() {
    window.localStorage.clear();
}

function loadMessages()
{
    return $.get('./messages.json');
}

function initControls()
{
    const input = $('#chat-message-input');
    input.focus();
    input.keyup(function(e) {
        if(e.keyCode == 13) // Enter
        {
            inputEnterEvent(input);
        }
    });
}

function init()
{
    initUsername();
    loadMessages().then((messages) => {
        messages.forEach((message) => {
            renderMessage(message.author, message.me, message.message)
        });
        initControls();
    });
}

init();
