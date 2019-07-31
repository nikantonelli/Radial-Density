var id = 0;
var context = 0;
var currentState = 'Initiate';

onmessage = function(ev) {
    debugger;
    console.log('Worker received: ',ev);
    if (ev.data.msg === 'wake') {
        defaultReply();
    } else if (ev.data.msg === 'create') {
        console.log('Worker received ', ev.data);
        this.context = ev.data.context;
        this.id = ev.data.id;
    } else {
        this.console.log('Unknown message received by: ', this);
    }
};

function defaultReply() {
    postMessage({
        response: 'Alive',
        state: this.currentState,
        id: this.id
    })
}