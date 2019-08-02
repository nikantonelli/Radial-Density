var id = 0;
var currentState = 'Initiate';
var timeout = 120000;


onmessage = function(ev) {
    console.log('Worker ' + this.id + ' received: ',ev.data);

    switch(ev.data.command){
        case 'wake' : {
            defaultReply();
            break;
        } 
        case 'initialise': {
//            console.log('Worker received ', ev.data);
            this.id = ev.data.id;
            this.currentState = 'Asleep';
            defaultReply();
            break;
        } 
        case 'readchildren' : {
            _actionFetchChildren(ev.data);
            break;
        }
        default: {
            this.console.log('Unknown message received by thread: ', this.id);
            break;
        }
    }
};

function _actionFetchChildren(msg) {
    if (
        ((msg.hasChildren !== null) && _getFromURL(msg.hasChildren)) +
        ((msg.hasStories !== null) && _getFromURL(msg.hasStories)) +
        ((msg.hasDefects !== null) && _getFromURL(msg.hasDefects)) +
        ((msg.hasTasks !== null) && _getFromURL(msg.hasTasks)) +
        ((msg.hasTestCases !== null) && _getFromURL(msg.hasTestCases)) ) {
            return;

    } else {
        defaultReply();
    }
}

function _getFromURL(url) {
    var getReq = new XMLHttpRequest();
    getReq.onreadystatechange = _successHandler;
    getReq.withCredentials = true;
    this.currentState = 'Reading';
    getReq.open("GET", url, true);
    getReq.send(null);
    return true;
}

function _successHandler(event) {
    if ((this.readyState === 4) && (this.status === 200)){
        _dataReply(JSON.parse(this.responseText).QueryResult.Results);
        this.currentState = 'Asleep';
    }
}

function _dataReply(data) {
    postMessage( {
        response: 'Alive',
        reply: 'Data',
        records: data,
        id: this.id
    });
}

function defaultReply() {
    postMessage({
        response: 'Alive',
        reply: this.currentState,
        id: this.id
    });
}