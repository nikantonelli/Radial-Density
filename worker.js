var id = 0;
var currentState = 'Initiate';

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
            defaultReply();
            break;
        }
        default: {
            this.console.log('Unknown message received by thread: ', this.id);
            break;
        }
    }
};


function _fetchTheData(data) {
    console.log('Loading ', data.length, ' artefacts');
    gApp.setLoading("Loading artefacts..");
debugger;
    if (gApp.getSetting('fetchAttachments') === true) {
        gApp._getAttachments(data);
    }
    //On re-entry send an event to redraw
    gApp._nodes = gApp._nodes.concat( gApp._createNodes(data));    //Add what we started with to the node list
    this.fireEvent('redrawTree');
    //Starting with highest selected by the combobox, go down

    _.each(data, function(parent) {
        console.log("processing item: " + parent.get('FormattedID'));
        //Limit this to portfolio items down to just above feature level and not beyond.
        //The lowest level portfolio item type has 'UserStories' not 'Children'
        if (parent.hasField('Children') && 
            (parent.get('Children').Count > 0) && 
            (!parent.data._ref.includes('hierarchicalrequirement'))){      

            collectionConfig = {
                sorters: [{
                    property: 'DragAndDropRank',
                    direction: 'ASC'
                }],
                fetch: gApp.STORE_FETCH_FIELD_LIST,
                callback: function(records, operation, success) {
                    //Start the recursive trawl down through the levels
                    if (success && records.length)  {
                        gApp._getArtifacts(records);
                    }
                }
            };
            if (gApp.getSetting('hideArchived')) {
                collectionConfig.filters = [{
                    property: 'Archived',
                    operator: '=',
                    value: false
                }];
            }
            parent.getCollection( 'Children').load( Ext.clone(collectionConfig) );
        }
        else {
            //We are features or UserStories when we come here
            collectionConfig = {
                sorters: [{
                    property: 'DragAndDropRank',
                    direction: 'ASC'  
                }],
                fetch: gApp.STORE_FETCH_FIELD_LIST,
                callback: function(records, operation, s) {
                    if (s && records && records.length) {
                        gApp._getArtifacts(records);
                        gApp.fireEvent('redrawTree');  
                    }
                }
            };
            //If we are lowest level PI, then we need to fetch User Stories
            if (gApp.getSetting('includeStories') && parent.hasField('UserStories') &&
                (parent.get('UserStories').Count > 0) ) {  
                collectionConfig.fetch.push(gApp._getModelFromOrd(0).split("/").pop()); //Add the lowest level field on User Stories
                parent.getCollection( 'UserStories').load( Ext.clone(collectionConfig) );
            } 
            //If we are storeis, then we need to fetch Defects
            if (gApp.getSetting('includeDefects') && parent.hasField('Defects') &&
                (parent.get('Defects').Count > 0) ) {  
                collectionConfig.fetch.push('Requirement'); //Add the User Story not the Test Case
                parent.getCollection( 'Defects').load( Ext.clone(collectionConfig) );
            } 
            //If we are defects or storeis, then we need to fetch Tasks
            
            if (gApp.getSetting('includeTasks') && parent.hasField('Tasks') &&
                    (parent.get('Tasks').Count > 0) ) {  
                collectionConfig.fetch.push('WorkProduct'); //Add the User Story not the Test Case
                parent.getCollection( 'Tasks').load( Ext.clone(collectionConfig) );
            } 
            if (gApp.getSetting('includeTestCases') && parent.hasField('TestCases')  &&
                    (parent.get('TestCases').Count > 0) ) {  
                collectionConfig.fetch.push('WorkProduct'); //Add the User Story not the Test Case
                parent.getCollection( 'TestCases').load( Ext.clone(collectionConfig) );
            } 
            // //If we are userstories, then we need to fetch tasks
            // else if (parent.hasField('Tasks') && (gApp.getSetting('includeStories'))){
            //     parent.getCollection( 'Tasks').load( collectionConfig );                    
            // }
        }
    });
}

function defaultReply() {
    postMessage({
        response: 'Alive',
        state: this.currentState,
        id: this.id
    });
}