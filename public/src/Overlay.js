export class Overlay
{
    constructor(retry, close) 
    {
        this.overlay = $('#chat-overlay');
    }

    loading()
    {
        this.overlay.children().hide();
        this.overlay.show();
        this.overlay.find('#loading-screen').show();
    }

    error()
    {
        this.overlay.children().hide();
        this.overlay.show();
        this.overlay.find('#error-screen').show();
    }

    hide()
    {
        this.overlay.hide();
    }

    bindRetry(onRetry) 
    {
        this.overlay.on('click', '#chat-retry', onRetry);
    }

    bindClose(onClose)
    {
        this.overlay.on('click', '#chat-close', onClose);
    }
}