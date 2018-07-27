(function () {
    var Ext = window.Ext4 || window.Ext;

Ext.define('Rally.app.RadialDensity.app', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    config: {
        defaultSettings: {
            includeStories: true,
            usePreliminaryEstimate: true,
            hideArchived: false,
            sizeStoriesByPlanEstimate: false,
            sortSize: false,
            showLabels: true,
            validateData: false,
            flashDeps: false,
            colourScheme: 'RdPu'
        }
    },

    autoScroll: true,
    itemId: 'rallyApp',
    NODE_CIRCLE_SIZE: 8,
    MIN_CARD_WIDTH: 150,        //Looks silly on less than this
    CARD_BORDER_WIDTH: 5,
    MIN_ROW_WIDTH: 160,
    MIN_CARD_HEIGHT:    150,
    MIN_ROW_HEIGHT: 30 ,         //Bit more than the text
    LOAD_STORE_MAX_RECORDS: 100, //Can blow up the Rally.data.wsapi.filter.Or
    WARN_STORE_MAX_RECORDS: 300, //Can be slow if you fetch too many
    LEFT_MARGIN_SIZE: 20,               //Leave space for "World view" text or colour box
    MIN_COLUMN_WIDTH: 200,
    TITLE_NAME_LENGTH: 80,
    STORE_FETCH_FIELD_LIST:
    [
        'Name',
        'FormattedID',
        'Parent',
        'DragAndDropRank',
        'Children',
        'ObjectID',
        'Project',
        'DisplayColor',
        'Owner',
        'Blocked',
        'BlockedReason',
        'Ready',
        'Tags',
        'Workspace',
        'RevisionHistory',
        'CreationDate',
        'PercentDoneByStoryCount',
        'PercentDoneByStoryPlanEstimate',
        'PredecessorsAndSuccessors',
        'State',
        'ScheduleState',
        'PreliminaryEstimate',
        'PlanEstimate',
        'Description',
        'Notes',
        'Predecessors',
        'Successors',
        'OrderIndex',   //Used to get the State field order index
        'PortfolioItemType',
        'Ordinal',
        'Release',
        'Iteration',
        'Milestones',
        //Customer specific after here. Delete as appropriate
//        'c_ProjectIDOBN',
//        'c_QRWP',
        'c_ProgressUpdate',
        'c_RAIDSeverityCriticality',
        'c_RISKProbabilityLevel',
        'c_RAIDRequestStatus'   
    ],
CARD_DISPLAY_FIELD_LIST:
    [
        'Name',
        'Owner',
        'PreliminaryEstimate',
        'Parent',
        'Project',
        'PercentDoneByStoryCount',
        'PercentDoneByStoryPlanEstimate',
        'PredecessorsAndSuccessors',
        'State',
        'Milestones',
        //Customer specific after here. Delete as appropriate
//        'c_ProjectIDOBN',
//        'c_QRWP'

    ],


    items: [
        {
            xtype: 'container',
            itemId: 'rootSurface',
            margin: '5 5 5 5',
            layout: 'auto',
            autoEl: {
                tag: 'svg'
            },
            listeners: {
                afterrender:  function() {  gApp = this.up('#rallyApp'); gApp._onElementValid(this);},
            }
        }
    ],

    onSettingsUpdate: function() {
        gApp._redrawTree();
    },

    getSettingsFields: function() {
        var returned = [
            {
                name: 'hideArchived',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Do not show archived',
                labelALign: 'middle'
            },
            {
                name: 'includeStories',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Include User Stories',
                labelALign: 'middle'
            },
            {
                name: 'validateData',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Check Data Sanity',
                labelALign: 'middle'
            },
            {
                name: 'showLabels',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show IDs',
                labelALign: 'middle'
            },
            {
                name: 'flashDeps',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Flash with Dependencies',
                labelALign: 'middle'
            },
            {
                name: 'sizeStoriesByPlanEstimate',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Size Stories by Plan Estimate',
                labelALign: 'middle'
            },
            {
                name: 'sortSize',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Artefacts sorted by size',
                labelALign: 'middle'
            },
            {
                name: 'usePreliminaryEstimate',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Use Preliminary Estimate Size',
                labelALign: 'middle'
            }
            
        ];
        return returned;
    },

    timer: null,

    launch: function() {
        this.on('redrawTree', this._resetTimer);
        // this.on('drawChildren', this._drawChildren);
        this.timer = setTimeout(this._redrawTree, 1000);
        this.exporter = Ext.create("TreeExporter");

    },

    _resetTimer: function() {
        if ( gApp.timer) clearTimeout(gApp.timer);
        gApp.timer = setTimeout(gApp._redrawTree, 1000);
    },
    
    _redrawTree: function() {
        if (gApp.down('#loadingBox')) gApp.down('#loadingBox').destroy();
        clearTimeout(gApp.timer);
        if (gApp._nodeTree) {
            _.each(gApp._nodeTree.descendants(),
                function(d) { 
                    if (d.card) 
                        d.card.destroy();
                }
            );
            d3.select("#tree").remove();
            d3.select("#depsOverlay").remove();
            gApp._nodeTree = null;
        }
        gApp._enterMainApp();
    },

    _enterMainApp: function() {

        //Timer can fire before we retrieve anything
        if (!gApp._nodes.length) return;

       //Get all the nodes and the "Unknown" parent virtual nodes
       var nodetree = gApp._createTree(gApp._nodes);
       gApp._nodeTree = nodetree;
        var viewBoxSize = [ 1200,800 ];
        gApp._setViewBox(viewBoxSize);

        //Add a group for the tree of artefacts
        var t = d3.select('svg').append('g')
            .attr('id','tree')
            //Transform to the centre of the screen
            .attr("transform","translate(" + viewBoxSize[0]/2 + "," + viewBoxSize[1]/2 + ")");

        //Add in an overlay if the user wants to see dependencies
        d3.select('svg').append('g')
            .attr('id','depsOverlay')
            .attr("visibility", "hidden")
            //Transform to the centre of the screen
            .attr("transform","translate(" + viewBoxSize[0]/2 + "," + viewBoxSize[1]/2 + ")");
        
        gApp._refreshTree(viewBoxSize);    //Need to redraw if things are added
    },

    _typeSizeStore: null,
    _typeSizeMax: 0,
    _storyStates: [],

    //Entry point after creation of render box
    _onElementValid: function(rs) {

        gApp._typeSizeStore = Ext.create('Rally.data.wsapi.Store',        
            {
                itemId: 'typeSizeStore',
                autoLoad: true,
                model: 'PreliminaryEstimate',
                fetch: ['Name', 'Value'],
                listeners: {
                    load: function(store, data, success) {
                        if (success) {
                            _.each(data, function(v) {
                                gApp._typeSizeStore[v.get('Name')] = v.get('Value');
                                if (v.get('Value') > gApp._typeSizeMax) gApp._typeSizeMax = v.get('Value');
                            });
                        }
                    }
                }
            });
        Rally.data.ModelFactory.getModel({
            type: 'UserStory',
            success: function(model) {
                _.each(model.getField('ScheduleState').attributeDefinition.AllowedValues, function(value,idx) {
                    gApp._storyStates.push( { name: value.StringValue, value : idx});
                });
            }
        });
        //Add any useful selectors into this container ( which is inserted before the rootSurface )
        //Choose a point when all are 'ready' to jump off into the rest of the app
        var hdrBox = this.insert (0,{
            xtype: 'container',
            itemId: 'headerBox',
            layout: 'hbox',
            items: [
                {
                    xtype: 'container',
                    itemId: 'filterBox'
                },
                {
                    xtype:  'rallyportfolioitemtypecombobox',
                    itemId: 'piType',
                    fieldLabel: 'Choose Portfolio Type :',
                    labelWidth: 100,
                    margin: '5 0 5 20',
                    defaultSelectionPosition: 'first',
                    storeConfig: {
                        fetch: ['DisplayName', 'ElementName','Ordinal','Name','TypePath', 'Attributes']
                    },
                    listeners: {
                        select: function() { gApp._kickOff();},    //Jump off here to add portfolio size selector
                        ready: function() { gApp._addColourHelper(); }
                    }
                },
            ]
        });
    },

    _nodes: [],
    numStates: [],

    _kickOff: function() {
        var ptype = gApp.down('#piType');
        var hdrBox = gApp.down('#headerBox');
        gApp._typeStore = ptype.store;
        var selector = gApp.down('#itemSelector');
        if ( selector) {
            selector.destroy();
        }
        hdrBox.insert(2,{
            xtype: 'rallyartifactsearchcombobox',
            fieldLabel: 'Choose Start Item :',
            stateful: true,
            stateId: this.getContext().getScopedStateId('RadialDensityPI'),
            multiSelect: true,

            itemId: 'itemSelector',
            labelWidth: 100,
            queryMode: 'remote',
            pageSize: 25,
            width: 600,
            margin: '10 0 5 20',
            storeConfig: {
                models: [ 'portfolioitem/' + ptype.rawValue ],
                fetch: gApp.STORE_FETCH_FIELD_LIST,
                context: gApp.getContext().getDataContext(),
                autoLoad: true,
                listeners: {
                    load: function(selector,store) {
                        gApp.add( {
                            xtype: 'container',
                            itemId: 'loadingBox',
                            cls: 'info--box',
                            html: '<p> Loading... </p>'
                        });
                        if ( gApp._nodes) gApp._nodes = [
                            {
                                Name: 'World View',
                                dependencies: [],
                                local: false,
                                record: {
                                    data: {
                                        _ref: 'root'
                                    }
                                }
                            }
                        ];
                        gApp._getArtifacts(store);
                    }
                }
            },
            listeners: {
                select: function(selector,store) {
                    gApp.add( {
                        xtype: 'container',
                        itemId: 'loadingBox',
                        cls: 'info--box',
                        html: '<p> Loading... </p>'
                    });
                    if ( gApp._nodes) gApp._nodes = [
                        {
                            Name: 'World View',
                            dependencies: [],
                            local: false,
                            record: {
                                data: {
                                    _ref: 'root'
                                }
                            }
                        }
                    ];
                    gApp._getArtifacts(store);
                },
            }
        });

        var button1Txt = "Colour Codes";
        if (!gApp.down('#colourButton')){
            hdrBox.add({
                xtype: 'rallybutton',
                itemId: 'colourButton',
                margin: '10 0 5 20',
                ticked: false,
                text: button1Txt,
                handler: function() {
                    if (this.ticked === false) {
                        this.setText('Return');
                        this.ticked = true;
                        d3.select("#colourLegend").attr("visibility","visible");
                        d3.select("#tree").attr("visibility", "hidden");
                        d3.select("#depsOverlay").attr("visibility", "hidden");
                    } else {
                        this.setText(button1Txt);
                        this.ticked = false;
                        d3.select("#colourLegend").attr("visibility","hidden");
                        d3.select("#tree").attr("visibility", "visible");
                        d3.select("#depsOverlay").attr("visibility", "visible");
                    }
                }
            });
        }
        var button2Txt = "Show Dependencies";
        if (!gApp.down('#depsButton')){
            hdrBox.add({
                xtype: 'rallybutton',
                itemId: 'depsButton',
                margin: '10 0 5 20',
                ticked: false,
                text: button2Txt,
                handler: function() {
                    if (this.ticked === false) {
                        this.setText('Hide Dependencies');
                        this.ticked = true;
                        d3.select("#colourLegend").attr("visibility","hidden");
                        d3.select("#depsOverlay").attr("visibility","visible");
                        d3.select("#tree").attr("visibility", "visible");
                    } else {
                        this.setText(button2Txt);
                        this.ticked = false;
                        d3.select("#depsOverlay").attr("visibility","hidden");
                    }
                }
            });
        }
        var button3Txt = "Export CSV";
        if (!gApp.down('#csvButton')){
            hdrBox.add({
                xtype: 'rallybutton',
                itemId: 'csvButton',
                margin: '10 0 5 20',
                text: button3Txt,
                handler: function() {
                    gApp.exporter.exportCSV(gApp._nodeTree);
                }
            });
        }
    },

    _fetchPredecessors: function(d) {

        d.data.record.getCollection('Predecessors').load(
            {
                fetch: true,
                callback: function (records, operation, success) {
                    if (success) {
                        var i = gApp._findNodeByRef(d.data.record.data._ref);
                        var start = gApp.inoid(i);
                        var end = [0,0];    //If record is not found, draw a line to the centre.

                        _.each(records, function(record){
                            var j = gApp._findNodeByRef(record.data._ref);
                            if ( j ) {  // Record is in those selected
                                end = gApp.inoid(j);
                            }
                            var inbetween = [(end[0] + start[0])/4,(end[1] + start[1])/4]
                            var dOvl = d3.select("#depsOverlay");
                            dOvl.append('path')
                                .attr("d","M" + start + "Q" + inbetween + " "  + end + "Q" + inbetween + " " + start)
                                .attr("class", "dependency");
                                dOvl.append('circle')
                                .attr("r",4)
                                .attr("cx", start[0])
                                .attr("cy", start[1])
                                .attr("class", "dependency");
                                dOvl.append('circle')
                                .attr("r",4)
                                .attr("cx", end[0])
                                .attr("cy", end[1])
                                .attr("class", "dependency");
                        });
                    }
                }
            }
        );
    },
    
    _fetchSuccessors: function(d) {

    },
    
    _processPredecessors: function(d) {

    },
    
    _processSuccessors: function(d) {

    },
    
    _getArtifacts: function(data) {
        //On re-entry send an event to redraw

        gApp._nodes = gApp._nodes.concat( gApp._createNodes(data));    //Add what we started with to the node list

        this.fireEvent('redrawTree');
        //Starting with highest selected by the combobox, go down

        _.each(data, function(parent) {
            //Limit this to portfolio items down to just above feature level and not beyond.
            //The lowest level portfolio item type has 'UserStories' not 'Children'
            if (parent.hasField('Children') && (!parent.data._ref.includes('hierarchicalrequirement'))){      
                collectionConfig = {
                    sorters: [{
                        property: 'DragAndDropRank',
                        direction: 'ASC'
                    }],
                    fetch: gApp.STORE_FETCH_FIELD_LIST,
                    callback: function(records, operation, success) {
                        //Start the recursive trawl down through the levels
                        if (records.length)  gApp._getArtifacts(records);
                    }
                };
                if (gApp.getSetting('hideArchived')) {
                    collectionConfig.filters = [{
                        property: 'Archived',
                        operator: '=',
                        value: false
                    }];
                }
                parent.getCollection( 'Children').load( collectionConfig );
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
                        if (s) {
                            if (records && records.length) {

                                //At this point, we need to decide whether we are adding nodes to the main tree
                                if (gApp.getSetting('includeStories')){
                                    gApp._nodes = gApp._nodes.concat( gApp._createNodes(records));
                                    gApp.fireEvent('redrawTree');
                                } 
                            }
                        }
                    }
                };
                //If we are lowest level PI, then we need to fetch User Stories
                if (parent.hasField('UserStories')) {  
                    collectionConfig.fetch.push(gApp._getModelFromOrd(0).split("/").pop()); //Add the lowest level field on User Stories
                    parent.getCollection( 'UserStories').load( collectionConfig );
                } 
                // //If we are userstories, then we need to fetch tasks
                // else if (parent.hasField('Tasks') && (gApp.getSetting('includeStories'))){
                //     parent.getCollection( 'Tasks').load( collectionConfig );                    
                // }
            }
        });
    },

    //Set the SVG area to the surface we have provided
    _setSVGSize: function(surface) {
        var svg = d3.select('svg');
        svg.attr('width', surface.getEl().dom.clientWidth);
        svg.attr('height',surface.getEl().dom.clientHeight);
    },
    _nodeTree: null,
    //Continuation point after selectors ready/changed

    _setViewBox: function(viewBoxSize) {
       var svg = d3.select('svg');
        var rs = this.down('#rootSurface');
        rs.getEl().setWidth(viewBoxSize[0]);
        rs.getEl().setHeight(viewBoxSize[1]);
        //Set the svg area to the surface
       this._setSVGSize(rs);
        svg.attr('class', 'rootSurface');
        svg.attr('preserveAspectRatio', 'none');
        svg.attr('viewBox', '0 0 ' + viewBoxSize[0] + ' ' + viewBoxSize[1]);
    },

    inoid: function(d) { 
        var r = d.y0 + ((d.y1 - d.y0) / 10),
            a = (d.x0 + d.x1) / 2 - Math.PI / 2;
        return [Math.cos(a) * r, Math.sin(a) * r];
    },

    _refreshTree: function(viewBoxSize){
        var width = viewBoxSize[0], height = viewBoxSize[1], radius = Math.min(width, height)/2;
        var partition = d3.partition()
            .size([2 * Math.PI, radius]);

        //Define a global for this as we can access from anywhere.
        arc = d3.arc()
            .startAngle(function(d) { return d.x0; })
            .endAngle(function(d) { return d.x1; })
            .innerRadius(function(d) { return d.y0; })
            .outerRadius(function(d) { return d.y1; });

        //Might want to change this...
        gApp._nodeTree.sum( function(d) {
            var retval = 0;
            if (d.record.data.FormattedID) {
                if (d.record.isPortfolioItem()){
                    if ( gApp.getSetting('usePreliminaryEstimate')){
                        retval = d.record.get('PreliminaryEstimateValue');
                    } else {
                        retval = d.record.get('LeafStoryCount'); 
                    }
                }else {
                        //We are a User Story here
                        if ( gApp.getSetting('sizeStoriesByPlanEstimate')){
                            retval = d.record.get('PlanEstimate');
                        }else {
                            retval = d.record.get('DirectChildrenCount'); 
                        }
                    }
                }
            return retval ? retval : 1;
        });

        if ( gApp.getSetting('sortSize') ){
            gApp._nodeTree.sort(function(a,b) { return b.value - a.value; });
        }

        var nodetree = partition(gApp._nodeTree)
;
        var tree = d3.select('#tree');

        var nodes = tree.selectAll("node")
                .data(nodetree.descendants())
                .enter();

        nodes.append("path")
            .attr("d", arc)
            .attr("display", function(d) { return d.depth ? null : "none"; }) // hide inner ring
            .attr("class", function (d) {   //Work out the individual dot colour
                var lClass = ['dotOutline']; // Might want to use outline to indicate something later
                if (d.data.record.data.ObjectID){

                    if (!gApp._dataCheckForItem(d)) {
                        lClass.push( "error--node");    
                    }else {                    
                        if (d.data.record.isUserStory()) { 
                            lClass.push(gApp.settings.colourScheme  + (_.find (gApp._storyStates, { 'name' : d.data.record.get('ScheduleState') })).value + '-' + gApp._storyStates.length);
                            lClass.push(d.data.record.get('Blocked')? "blockedOutline": d.data.record.get('Ready')?"readyOutline":"");
                        }
                        else if (d.data.record.isPortfolioItem()) {
                            //Predecessors take precedence
                            if (d.data.record.get('State')){
                                lClass.push( gApp.settings.colourScheme + ((d.data.record.get('State').OrderIndex-1) + '-' + gApp.numStates[gApp._getOrdFromModel(d.data.record.get('_type'))]));
                            } else {
                                lClass.push('error--node');
                            }
                        }
                        if (d.data.record.get('Predecessors').Count > 0) {
                          if (gApp.getSetting('flashDeps')) lClass.push("gotPredecessors");
                            gApp._fetchPredecessors(d);
                        }
                        else if (d.data.record.get('Successors').Count > 0) {
                            if (gApp.getSetting('flashDeps')) lClass.push("gotSuccessors");
                            gApp._fetchSuccessors(d);
                        }                            
                    }
                }
                return lClass.join(' ');

            })
            .on("mouseover", function(node, index, array) { gApp._nodeMouseOver(node,index,array);})
            .on("mouseout", function(node, index, array) { gApp._nodeMouseOut(node,index,array);})
            .on("click", function(node, index, array) { gApp._nodeClick(node,index,array);})
            .each(gApp.stash); //Save for animations.... TODO!

        if ( gApp.getSetting('showLabels')){
            nodes.append('text')
                .attr("display", function(d) { return d.depth ? null : "none"; }) // hide inner ring
                .attr("class", 'arctext')
                .attr("text-anchor", "middle")
                .attr("transform", function(d) {  
                    var angle = d.x0 + ((d.x1 - d.x0)/2); 
                    return "translate(" + arc.centroid(d) + ") rotate(" + (angle < Math.PI ? angle - Math.PI / 2 : angle + Math.PI / 2) * 180 / Math.PI + ")"; })
                .text(function(d) { return d.data.Name; });
        }

        d3.selectAll("input").on("change", function change() {
            var value = this.value === "count" ?
                 function() { return 1; } :
                 function(d) { return d.value; };

            path
                .data(partition.value(value).nodes)
            .transition()
                .duration(1500)
                .attr("d", gApp.arcTween);

        });

        // Stash the old values for transition.
    },

    stash: function (d) {
        //debugger;   //TODO: Get info and apply dependency links?
        d.x0s = d.x0;
        d.y0s = d.y0;
        d.x1s = d.x1;
        d.y1s = d.y1;
    },

    arcTween: function (a) {
        var i = d3.interpolate({x: a.x0, dx: a.dx0}, a);
        return function(t) {
            var b = i(t);
            a.x0 = b.x;
            a.dx0 = b.dx;
            return arc(b);
        };
    },
    
    _nodeMouseOut: function(node, index,array){
        if (node.card) node.card.hide();
    },

    _nodeMouseOver: function(node,index,array) {
        if (!(node.data.record.data.ObjectID)) {
            //Only exists on real items, so do something for the 'unknown' item
            return;
        } else {

            if ( !node.card) {
                var card = Ext.create('Rally.ui.cardboard.Card', {
                    'record': node.data.record,
                    fields: gApp.CARD_DISPLAY_FIELD_LIST,
                    constrain: false,
                    width: gApp.MIN_COLUMN_WIDTH,
                    height: 'auto',
                    floating: true, //Allows us to control via the 'show' event
                    shadow: false,
                    showAge: true,
                    resizable: true,
                    listeners: {
                        show: function(card){
                            //Move card to the centre of the screen
                            var pos = arc.centroid(node);
                            var xpos = array[index].getScreenCTM().e + pos[0];
                            var ypos = array[index].getScreenCTM().f + pos[1];
                            card.el.setLeftTop( (xpos - gApp.MIN_CARD_WIDTH) < 0 ? xpos + gApp.MIN_CARD_WIDTH + gApp.MIN_COLUMN_WIDTH : xpos - gApp.MIN_CARD_WIDTH, 
                                (ypos + this.getSize().height)> gApp.getSize().height ? gApp.getSize().height - (this.getSize().height+20) : ypos);  //Tree is rotated
                        }
                    }
                });
                node.card = card;
            }
            node.card.show();
        }
    },

    _nodePopup: function(node, index, array) {
        var popover = Ext.create('Rally.ui.popover.DependenciesPopover',
            {
                record: node.data.record,
                target: node.card.el,
                //Can't use chevron.autoShow.false here due to code in sdk
            }
        );
        var pos = arc.centroid(node);
        popover.el.setLeftTop(array[index].getScreenCTM().e + pos[0], array[index].getScreenCTM().f + pos[1]);
        popover.chevron.hide(); //Get rid of the floating arrow.
    },

    _nodeClick: function (node,index,array) {
        if (!(node.data.record.data.ObjectID)) return; //Only exists on real items
        //Get ordinal (or something ) to indicate we are the lowest level, then use "UserStories" instead of "Children"
        if (event.shiftKey) { 
            gApp._nodePopup(node,index,array); 
        }  else {
            gApp._dataPanel(node,index,array);
        }
    },

    _dataPanel: function(node, index, array) {        
        var childField = node.data.record.hasField('Children')? 'Children' : 'UserStories';
        var model = node.data.record.hasField('Children')? node.data.record.data.Children._type : 'UserStory';

        Ext.create('Rally.ui.dialog.Dialog', {
            autoShow: true,
            draggable: true,
            closable: true,
            width: 1200,
            height: 800,
            style: {
                border: "thick solid #000000"
            },
            overflowY: 'scroll',
            overflowX: 'none',
            record: node.data.record,
            disableScroll: false,
            model: model,
            childField: childField,
            title: 'Information for ' + node.data.record.get('FormattedID') + ': ' + node.data.record.get('Name'),
            layout: 'hbox',
            items: [
                {
                    xtype: 'container',
                    itemId: 'leftCol',
                    width: 500,
                },
                {
                    xtype: 'container',
                    itemId: 'rightCol',
                    width: 700  //Leave 20 for scroll bar
                }
            ],
            listeners: {
                afterrender: function() {
                    this.down('#leftCol').add(
                        {
                                xtype: 'rallycard',
                                record: this.record,
                                fields: gApp.CARD_DISPLAY_FIELD_LIST,
                                showAge: true,
                                resizable: true
                        }
                    );

                    if ( this.record.get('c_ProgressUpdate')){
                        this.down('#leftCol').insert(1,
                            {
                                xtype: 'component',
                                width: '100%',
                                autoScroll: true,
                                html: this.record.get('c_ProgressUpdate')
                            }
                        );
                        this.down('#leftCol').insert(1,
                            {
                                xtype: 'text',
                                text: 'Progress Update: ',
                                style: {
                                    fontSize: '13px',
                                    textTransform: 'uppercase',
                                    fontFamily: 'ProximaNova,Helvetica,Arial',
                                    fontWeight: 'bold'
                                },
                                margin: '0 0 10 0'
                            }
                        );
                    }
                    //This is specific to customer. Features are used as RAIDs as well.
                    if ((this.record.self.ordinal === 1) && this.record.hasField('c_RAIDType')){
                        var me = this;
                        var rai = this.down('#leftCol').add(
                            {
                                xtype: 'rallypopoverchilditemslistview',
                                target: array[index],
                                record: this.record,
                                childField: this.childField,
                                addNewConfig: null,
                                gridConfig: {
                                    title: '<b>Risks and Issues:</b>',
                                    enableEditing: false,
                                    enableRanking: false,
                                    enableBulkEdit: false,
                                    showRowActionsColumn: false,
                                    storeConfig: this.RAIDStoreConfig(),
                                    columnCfgs : [
                                        'FormattedID',
                                        'Name',
                                        {
                                            text: 'RAID Type',
                                            dataIndex: 'c_RAIDType',
                                            minWidth: 80
                                        },
                                        {
                                            text: 'RAG Status',
                                            dataIndex: 'Release',  //Just so that a sorter gets called on column ordering
                                            width: 60,
                                            renderer: function (value, metaData, record, rowIdx, colIdx, store) {
                                                var setColour = (record.get('c_RAIDType') === 'Risk') ?
                                                        me.RISKColour : me.AIDColour;
                                                
                                                    return '<div ' + 
                                                        'class="' + setColour(
                                                                        record.get('c_RAIDSeverityCriticality'),
                                                                        record.get('c_RISKProbabilityLevel'),
                                                                        record.get('c_RAIDRequestStatus')   
                                                                    ) + 
                                                        '"' +
                                                        '>&nbsp</div>';
                                            },
                                            listeners: {
                                                mouseover: function(gridView,cell,rowIdx,cellIdx,event,record) { 
                                                    Ext.create('Rally.ui.tooltip.ToolTip' , {
                                                            target: cell,
                                                            html:   
                                                            '<p>' + '   Severity: ' + record.get('c_RAIDSeverityCriticality') + '</p>' +
                                                            '<p>' + 'Probability: ' + record.get('c_RISKProbabilityLevel') + '</p>' +
                                                            '<p>' + '     Status: ' + record.get('c_RAIDRequestStatus') + '</p>' 
                                                        });
                                                    
                                                    return true;    //Continue processing for popover
                                                }
                                            }
                                        },
                                        'ScheduleState'
                                    ]
                                },
                                model: this.model
                            }
                        );
                        rai.down('#header').destroy();
                   }
                    var children = this.down('#rightCol').add(
                        {
                            xtype: 'rallypopoverchilditemslistview',
                            target: array[index],
                            record: this.record,
                            width: '95%',
                            childField: this.childField,
                            addNewConfig: null,
                            gridConfig: {
                                title: '<b>Children:</b>',
                                enableEditing: false,
                                enableRanking: false,
                                enableBulkEdit: false,
                                showRowActionsColumn: false,
                                storeConfig: this.nonRAIDStoreConfig(),
                                columnCfgs : [
                                    'FormattedID',
                                    'Name',
                                    {
                                        text: '% By Count',
                                        dataIndex: 'PercentDoneByStoryCount'
                                    },
                                    {
                                        text: '% By Est',
                                        dataIndex: 'PercentDoneByStoryPlanEstimate'
                                    },
                                    {
                                        text: 'Timebox',
                                        dataIndex: 'Project',  //Just so that the renderer gets called
                                        minWidth: 80,
                                        renderer: function (value, metaData, record, rowIdx, colIdx, store) {
                                            var retval = '';
                                                if (record.hasField('Iteration')) {
                                                    retval = record.get('Iteration')?record.get('Iteration').Name:'NOT PLANNED';
                                                } else if (record.hasField('Release')) {
                                                    retval = record.get('Release')?record.get('Release').Name:'NOT PLANNED';
                                                } else if (record.hasField('PlannedStartDate')){
                                                    retval = Ext.Date.format(record.get('PlannedStartDate'), 'd/M/Y') + ' - ' + Ext.Date.format(record.get('PlannedEndDate'), 'd/M/Y');
                                                }
                                            return (retval);
                                        }
                                    },
                                    'State',
                                    'PredecessorsAndSuccessors',
                                    'ScheduleState'
                                ]
                            },
                            model: this.model
                        }
                    );
                    children.down('#header').destroy();

                    var cfd = Ext.create('Rally.apps.CFDChart', {
                        record: this.record,
                        width: '95%',
                        container: this.down('#rightCol')
                    });
                    cfd.generateChart();

                }
            },

            //This is specific to customer. Features are used as RAIDs as well.
            nonRAIDStoreConfig: function() {
                if (this.record.hasField('c_RAIDType') ){
                    switch (this.record.self.ordinal) {
                        case 1:
                            return  {
                                filters: {
                                    property: 'c_RAIDType',
                                    operator: '=',
                                    value: ''
                                },
                                fetch: gApp.STORE_FETCH_FIELD_LIST,
                                pageSize: 50
                            };
                        default:
                            return {
                                fetch: gApp.STORE_FETCH_FIELD_LIST,
                                pageSize: 50
                            };
                    }
                }
                else return {
                    fetch: gApp.STORE_FETCH_FIELD_LIST,
                    pageSize: 50                                                    
                };
            },

            //This is specific to customer. Features are used as RAIDs as well.
            RAIDStoreConfig: function() {
                var retval = {};

                if (this.record.hasField('c_RAIDType')){
                            return {
                                filters: [{
                                    property: 'c_RAIDType',
                                    operator: '!=',
                                    value: ''
                                }],
                                fetch: gApp.STORE_FETCH_FIELD_LIST,
                                pageSize: 50
                            };
                    }
                else return {
                    fetch: gApp.STORE_FETCH_FIELD_LIST,
                    pageSize: 50
                };
            },

            RISKColour: function(severity, probability, state) {
                if ( state === 'Closed' || state === 'Cancelled') {
                    return 'RAID-blue';
                }

                if (severity === 'Exceptional') {
                    return 'RAID-red textBlink';
                }

                if (severity ==='High' && (probability === 'Likely' || probability === 'Certain'))
                {
                    return 'RAID-red';
                }

                if (
                    (severity ==='High' && (probability === 'Unlikely' || probability === 'Possible')) ||
                    (severity ==='Moderate' && (probability === 'Likely' || probability === 'Certain'))
                ){
                    return 'RAID-amber';
                }
                if (
                    (severity ==='Moderate' && (probability === 'Unlikely' || probability === 'Possible')) ||
                    (severity ==='Low')
                ){
                    return 'RAID-green';
                }
                
                var lClass = 'RAID-missing';
                if (!severity) lClass += '-severity';
                if (!probability) lClass += '-probability';

                return lClass;
            },

            AIDColour: function(severity, probability, state) {
                if ( state === 'Closed' || state === 'Cancelled') {
                    return 'RAID-blue';
                }

                if (severity === 'Exceptional') 
                {
                    return 'RAID-red';
                }

                if (severity === 'High') 
                {
                    return 'RAID-amber';
                }

                if ((severity === 'Moderate') ||
                    (severity === 'Low')
                ){
                    return 'RAID-green';                    
                }
                return 'RAID-missing-severity-probability'; //Mark as unknown
            }
        });
    },

    //Return truey for OK
    _dataCheckForItem: function(d){
        if (!gApp.getSetting('validateData')) return true;
        if (d.data.record.isPortfolioItem()) {
            if (!d.data.record.get('State') ||
                !d.data.record.get('PreliminaryEstimate')
            ){
                return false;
            }
        } else if (d.data.record.isUserStory()){
            if (!d.data.record.get('PlanEstimate')){
                return false;
            }
        }                          
        return true;
    },

    _createNodes: function(data) {
        //These need to be sorted into a hierarchy based on what we have. We are going to add 'other' nodes later
        var nodes = [];
        //Push them into an array we can reconfigure
        _.each(data, function(record) {
            var localNode = (gApp.getContext().getProjectRef() === record.get('Project')._ref);
            nodes.push({'Name': record.get('FormattedID'), 'record': record, 'local': localNode, 'dependencies': []});
        });
        return nodes;
    },

    _findNodeByRef: function(ref) {
        var found = d3.selectAll('path').filter(function(d) { 
            return d && (d.data.record.data._ref === ref);
        });
        return found.empty() ? 0 : found.data()[0];    //Hope to god there is only one found....
    },

    _findParentType: function(record) {
        //The only source of truth for the hierachy of types is the typeStore using 'Ordinal'
        var ord = null;
        for ( var i = 0;  i < gApp._typeStore.totalCount; i++ )
        {
            if (record.data._type === gApp._typeStore.data.items[i].get('TypePath').toLowerCase()) {
                ord = gApp._typeStore.data.items[i].get('Ordinal');
                break;
            }
        }
        ord += 1;   //We want the next one up, if beyond the list, set type to root
        //If we fail this, then this code is wrong!
        if ( i >= gApp._typeStore.totalCount) {
            return null;
        }
        var typeRecord =  _.find(  gApp._typeStore.data.items, function(type) { return type.get('Ordinal') === ord;});
        return (typeRecord && typeRecord.get('TypePath').toLowerCase());
    },
    _findNodeById: function(nodes, id) {
        return _.find(nodes, function(node) {
            return node.record.data._ref === id;
        });
    },
        //Routines to manipulate the types

    _getSelectedOrdinal: function() {
        return gApp.down('#piType').lastSelection[0].get('Ordinal');
    },

     _getTypeList: function(highestOrdinal) {
        var piModels = [];
        _.each(gApp._typeStore.data.items, function(type) {
            //Only push types below that selected
            if (type.data.Ordinal <= (highestOrdinal ? highestOrdinal: 0) )
                piModels.push({ 'type': type.data.TypePath.toLowerCase(), 'Name': type.data.Name, 'ref': type.data._ref, 'Ordinal': type.data.Ordinal});
        });
        return piModels;
    },

    _highestOrdinal: function() {
        return _.max(gApp._typeStore.data.items, function(type) { return type.get('Ordinal'); }).get('Ordinal');
    },
    _getModelFromOrd: function(number){
        var model = null;
        _.each(gApp._typeStore.data.items, function(type) { if (number == type.get('Ordinal')) { model = type; } });
        return model && model.get('TypePath');
    },

    _getOrdFromModel: function(modelName){
        var model = null;
        _.each(gApp._typeStore.data.items, function(type) {
            if (modelName == type.get('TypePath').toLowerCase()) {
                model = type.get('Ordinal');
            }
        });
        return model;
    },

    _findParentNode: function(nodes, child){
        var record = child.record;
        if (record.data._ref === 'root') return null;

        //Nicely inconsistent in that the 'field' representing a parent of a user story has the name the same as the type
        // of the first level of the type hierarchy.
        var parentField = gApp._getModelFromOrd(0).split("/").pop();
        var parent = record.hasField('WorkProduct')? record.data.WorkProduct : record.hasField('Tasks')?record.data[parentField]:record.data.Parent;
        var pParent = null;
        if (parent ){
            //Check if parent already in the node list. If so, make this one a child of that one
            //Will return a parent, or null if not found
            pParent = gApp._findNodeById(nodes, parent._ref);
        }
        else {
            //Here, there is no parent set, so attach to the 'null' parent.
            var pt = gApp._findParentType(record);
            //If we are at the top, we will allow d3 to make a root node by returning null
            //If we have a parent type, we will try to return the null parent for this type.
            if (pt) {
                var parentName = '/' + pt + '/null';
                pParent = gApp._findNodeById(nodes, parentName);
            }
        }
        //If the record is a type at the top level, then we must return something to indicate 'root'
        return pParent?pParent: gApp._findNodeById(nodes, 'root');
    },

    _createTree: function (nodes) {
        //Try to use d3.stratify to create nodet
        var nodetree = d3.stratify()
                    .id( function(d) {
                        var retval = (d.record && d.record.data._ref) || null; //No record is an error in the code, try to barf somewhere if that is the case
                        return retval;
                    })
                    .parentId( function(d) {
                        var pParent = gApp._findParentNode(nodes, d);
                        return (pParent && pParent.record && pParent.record.data._ref); })
                    (nodes);
        return nodetree;
    },

    _addColourHelper: function() {
        var hdrBox = gApp.down('#headerBox');
        var numTypes = gApp._highestOrdinal() + 2;  //Leave spac efor user stories if needed
        var modelList = gApp._getTypeList(numTypes);  //Doesn't matter if we are one over here.

        //Get the SVG surface and add a new group
        var svg = d3.select('svg');
        //Set a size big enough to hold the colour palette (which may get bigger later)
        gApp.colourBoxSize = [gApp.MIN_COLUMN_WIDTH*numTypes, 20 * gApp.MIN_ROW_HEIGHT];   //Guess at a maximum of 20 states per type

        //Make surface the size available in the viewport (minus the selectors and margins)
        var rs = this.down('#rootSurface');
        rs.getEl().setWidth(gApp.colourBoxSize[0]);
        rs.getEl().setHeight(gApp.colourBoxSize[1]);
        //Set the svg area to the surface
        this._setSVGSize(rs);
        // Set the view dimensions in svg to match
        svg.attr('class', 'rootSurface');
        svg.attr('preserveAspectRatio', 'none');
        svg.attr('viewBox', '0 0 ' + gApp.colourBoxSize[0] + ' ' + (gApp.colourBoxSize[1]+ gApp.NODE_CIRCLE_SIZE));
        var colours = svg.append("g")    //New group for colours
            .attr("id", "colourLegend")
            .attr("transform","translate(" + gApp.LEFT_MARGIN_SIZE + ",10)");
        //Add some legend specific sprites here

        if ( gApp.getSetting('includeStories')) {
            var usc = colours.append("g")
                .attr("id", "storyColourLegend")
                .attr("transform", "translate(0,10)");

            usc.append("text")
                .attr("dx", -gApp.NODE_CIRCLE_SIZE )
                .attr("dy", -(gApp.NODE_CIRCLE_SIZE+2))
                .attr("x",  0)
                .attr("y", 0)
                .style("text-anchor",  'start')
                .text("User Story");

            _.each(gApp._storyStates, function(state,idx){
                usc.append("circle")
                    .attr("cx", 0)
                    .attr("cy", (idx+1) * gApp.MIN_ROW_HEIGHT)    //Leave space for text of name
                    .attr("r", gApp.NODE_CIRCLE_SIZE)
                    .attr("class", gApp.settings.colourScheme  + state.value + '-' + gApp._storyStates.length);
                usc.append("text")
                    .attr("dx", gApp.NODE_CIRCLE_SIZE+2)
                    .attr("dy", gApp.NODE_CIRCLE_SIZE/2)
                    .attr("x",0)
                    .attr("y",(idx+1) * gApp.MIN_ROW_HEIGHT)
                    .attr("text-anchor", 'start')
                    .text(state.name);
            });
        }

        _.each(modelList, function(modeltype) {
            gApp._addColourBox(modeltype);
        });

    },

    _addColourBox: function(modeltype) {
        
        var colours = d3.select('#colourLegend');
        var indent = 0;

        if ( gApp.getSetting('includeStories')) {
            indent = 1;
        }
        var colourBox = colours.append("g")
            .attr("id", "colourLegend" + modeltype.Ordinal)
            .attr("transform","translate(" + (gApp.MIN_COLUMN_WIDTH*(modeltype.Ordinal+indent)) + ",10)");

            var lCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            colourBox.append("text")
                .attr("dx", -gApp.NODE_CIRCLE_SIZE )
                .attr("dy", -(gApp.NODE_CIRCLE_SIZE+2))
                .attr("x",  0)
                .attr("y", 0)
                .style("text-anchor",  'start')
                .text(modeltype.Name);

            //Now fetch all the values for the State field
            //And then add the colours
            var typeStore = Ext.create('Rally.data.wsapi.Store',
                {
                    model: 'State',
                    filters: [{
                        property: 'TypeDef',
                        value: modeltype.ref
                    },
                    {
                        property: 'Enabled',
                        value: true
                    }],
                    context: gApp.getContext().getDataContext(),
                    fetch: true
                }
            );
            typeStore.load().then({ 
                success: function(records){
                    gApp.numStates[modeltype.Ordinal] = records.length;
                    _.each(records, function(state){
                        var idx = state.get('OrderIndex');
                        colourBox.append("circle")
                            .attr("cx", 0)
                            .attr("cy", idx * gApp.MIN_ROW_HEIGHT)    //Leave space for text of name
                            .attr("r", gApp.NODE_CIRCLE_SIZE)
                            .attr("class", gApp.settings.colourScheme  + (state.get('OrderIndex')-1) + '-' + records.length);
                        colourBox.append("text")
                            .attr("dx", gApp.NODE_CIRCLE_SIZE+2)
                            .attr("dy", gApp.NODE_CIRCLE_SIZE/2)
                            .attr("x",0)
                            .attr("y",idx * gApp.MIN_ROW_HEIGHT)
                            .attr("text-anchor", 'start')
                            .text(state.get('Name'));
                    });
                },
                failure: function(error) {
                    console.log ('Oh no!');
                }
            });
        
        colours.attr("visibility","hidden");    //Render, but mask it. Use "visible" to show again
    },

    initComponent: function() {
        this.callParent(arguments);
        this.addEvents('redrawTree');
    }
});
}());