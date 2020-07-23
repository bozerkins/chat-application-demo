export class ChatRoom
{
    constructor(user)
    {
        this.user = user;
        this.autoscroll = true;
    }
    
    render()
    {
        $('#username').text(this.user['cognito:username']);
        $('#usernameControlDisplay').text('@' + this.user['cognito:username']);
        $('#logoutButton').click(() => {
            document.cookie = "id_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.reload();
        });
        
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

        $('.chat-message-container').scroll(function() {
            let atTheBottom = ($(this).prop("scrollHeight") - Math.floor($(this).scrollTop() + $(this).outerHeight())) === 0;
            if (atTheBottom === false) {
                this.autoscroll = false;
            } else {
                this.autoscroll = true;
            }
        });
    }

    renderMessage(message)
    {
        const name = `${message.author} (${message.sub})`;
        const isThisMe = message.sub ===  this.user.sub;

        const messageColor = isThisMe ? 'alert-info' : 'alert-secondary';
        const messageFloat = isThisMe ? 'float-right' : 'float-left';
        const authorFloat = isThisMe ? 'chat-author-me' : 'chat-author-not-me';
        const rendered = `
            <div class="chat-message w-100 p-1 clearfix">
                <span class="alert ${messageColor} ${messageFloat} m-0">
                    ${message.message}
                </span>
                <span class="chat-message-author ${authorFloat}">${name}</span>
            </div>
        `;
        $('.chat-message-container').first().append(rendered);
        
        // scroll to bottom
        if (this.autoscroll === true) {
            const container = $('.chat-message-container');
            container.scrollTop(container.prop("scrollHeight"));
        }
    }

    renderUser(user)
    {
        const rendered = `
            <div class="p-1 clearfix">
                ${user.name}
                <span class="badge badge-light">${user.sub}</span>
            </div>
        `;
        $('.chat-username-container').first().append(rendered);
    }

    startControls(socket)
    {
        const input = $('#chat-message-input');
        input.focus();
        input.keyup(function(e) {
            if(e.keyCode == 13) // Enter
            {
                const message = input.val();
                if (!message) {
                    return;
                }
                socket.send(JSON.stringify({ message: message }));

                input.val('');
                // scroll to bottom
                const container = $('.chat-message-container');
                container.scrollTop(container.prop("scrollHeight"));
            }
        });
    }
}