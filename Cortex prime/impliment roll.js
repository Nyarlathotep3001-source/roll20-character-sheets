// JavaScript Document
var DefaultAttributes = DefaultAttributes || (function () {
    'use strict';

    // Attributes all characters should have
    var attributeHash = {
            "controller_resource1a": {
                "current": "active",
            },
            "controller_resource1b": {
                "current": "active",
            },
            "controller_resource2a": {
                "current": "active",
            },
            "controller_resource2b": {
                "current": "active",
            },
            "controller_resource3a": {
                "current": "active",
            },
            "controller_resource3b": {
                "current": "active",
            },
            "controller_resource4a": {
                "current": "active",
            },
            "controller_resource4b": {
                "current": "active",
            }
        },

        // Function which adds missing attributes to a character
    addAttributes = function(characterID, attributeHash) {
        for (var key in attributeHash) {
            if (attributeHash.hasOwnProperty(key)) {
                var foundAttribute = findObjs({
                    _characterid: characterID,
                    name: key
                })[0];
                    
                if (!foundAttribute) {
                    log("Attribute " + key + " not found for character ID " + characterID + " Creating.");
                    createObj("attribute", {
                        name: key,
                        current: attributeHash[key]["current"],
                        characterid: characterID
                    });
                }
            }
        }
    },

    // Add all missing attributes to a character
    initCharacterAttributes = function(char){
        addAttributes(char.id, attributeHash);
    },
        
    // Manually add missing attributes to all existing characters
    handleInput = function(msg) {
        if(msg.type == "api" && msg.content == "!initattributes") {
            log("Initializing attributes for all existing characters.");
            var allCharacters = findObjs({
                _type: "character"
            });
            _.each(allCharacters, function(char) {
                initCharacterAttributes(char);
            });
        }
    },

    // Event triggers
    registerEventHandlers = function() {    
        on("add:character", initCharacterAttributes);
        on("chat:message", handleInput);
    };

    return {
        RegisterEventHandlers: registerEventHandlers
    };    
    
})();

on("ready", function() {
    'use strict';
    
    DefaultAttributes.RegisterEventHandlers();    
});

on("ready", function() {
    'use strict';
    
    DefaultAttributes.RegisterEventHandlers();    
});

on('chat:message', function (msg_orig) {
	var msg = _.clone(msg_orig);
	
	if (msg.type == "api" && msg.content.indexOf("!cortex_custom_roll") !== -1) {
		cWho = findObjs({type: 'character',controlledby: msg.playerid})[0];
		character_name= cWho.get("name");
		character_id = cWho.id;

    	let return_values = {};
    	let params = {};
    
    	params.complications = 0;
    	params.add_plot_point = 0;
	
        params.dice_pool = JSON.parse(getAttrByName(character_id, 'main_dice'));
        
        params.plot_points = getAttrByName(character_id, 'plot_points_spent');
    	var total_plot_points = Number.parseInt(getAttrByName(character_id, 'plot_points'));
        if (params.plot_points > total_plot_points) {
            params.plot_points = total_plot_points;
        }
        
        return_values.main_dice = sorted_rolls(params).sort_roll;
    	 
    	stress_type = JSON.parse(getAttrByName(character_id, 'stress_dice')).stress;
    	
    	for (key of Object.keys(stress_type)) {
    	    stress_type_str = key + "(" + stress_type[key] + ")";
    	}
    	
    	return_values.stress_type = stress_type_str;
    	
    	let get_res = {}
    	get_res.character = character_id;
      
    	params.dice_pool = JSON.parse(getAttrByName(character_id, 'resource_dice'));

        return_values.resource_dice = sorted_rolls(params).sort_roll;
        if (return_values.resource_dice.length+return_values.main_dice.length < params.plot_points) {
            params.plot_points = return_values.resource_dice.length+return_values.main_dice.length
        }
        return_values.plot_points_spent = params.plot_points;
        var plot_points = params.plot_points;
        
        process_resources(get_res);
      
        main_kept = [];
        main_unkept=[];
        resource_kept=[];
        resource_unkept=[];
        return_values.overall_result = 0;
      
		for (var x=1;x<3;x++) {
      	    if (return_values.main_dice.length > 0) {
        	    return_values.overall_result = return_values.overall_result + return_values.main_dice[0][1];
      		    main_kept.push(return_values.main_dice.shift());
            }
        }
      
        if (return_values.resource_dice.length > 0) {
            return_values.overall_result = return_values.overall_result + return_values.resource_dice[0][1];
        	resource_kept.push(return_values.resource_dice.shift());
        }
      
        var max_result = compare_diceset(return_values.resource_dice, return_values.main_dice);
      
        while (max_result.source != 'None' && plot_points > 0) {
      	    if (max_result.source === 'Main') {
        	    main_kept.push(return_values.main_dice.shift());
            } else {
        	    resource_kept.push(return_values.resource_dice.shift());
            }
            return_values.overall_result = return_values.overall_result + max_result.value;
            plot_points--;
            max_result = compare_diceset(return_values.resource_dice, return_values.main_dice);
        }
      
        return_values.main_kept_dice = main_kept.join(" ").replace(/,/g,": ");
        return_values.main_unkept_dice = return_values.main_dice.join(" ").replace(/,/g,": ");
        return_values.resource_kept_dice = resource_kept.join(" ").replace(/,/g,": ");
        return_values.resource_unkept_dice = return_values.resource_dice.join(" ").replace(/,/g,": ");

        return_values.complications = params.complications;
        return_values.nett_plot_points = return_values.plot_points_spent * -1 + params.add_plot_point;
        
        var complications= "";
        if (return_values.complications > 0) {
            complications = return_values.complications;
        }

        findObjs({type:'attribute',name:'plot_points_spent',characterid:character_id})[0].set("current", 0);
        findObjs({type:'attribute',name:'plot_points',characterid:character_id})[0].set("current", total_plot_points + return_values.nett_plot_points);
    	sendChat(character_name, "&{template:cortex_roll} {{kept_main_dice="+ return_values.main_kept_dice +"}} {{unkept_main_dice=" + return_values.main_unkept_dice + "}} {{kept_resource_dice=" + return_values.resource_kept_dice+"}} {{unkept_resource_dice=" + return_values.resource_unkept_dice +"}} {{total=" + return_values.overall_result + "}} {{complications=" + complications + "}} {{stress_type=" + return_values.stress_type +"}}");
	}
});

function sorted_rolls(params){	
	params.sort_roll = [];
	for (var value of Object.values(params.dice_pool)){
		for (var key of Object.keys(value)) {
      var roll = parseInt(Math.floor(Math.random() * value[key].substr(1))+1);
			/*var roll = randomInteger(value[key].substr(1));*/
			params.sort_roll.push([key,roll]);
			if (value[key]==="d4") {
				params.add_plot_point = 1;
			}
			if (roll === 1) {
				params.complications++;
			}
		}   
	}
	params.sort_roll.sort(function(a, b) { return b[1] -a[1];});

	return params;
}

function compare_diceset(resource, main) {
	main_value = 0;
  resource_value = 0;
  result = {};
  if (main.length > 0) {
  	main_value = main[0][1]; 
  }
  
  if (resource.length > 0) {
  	resource_value = resource[0][1];
  }
  
  result.value = Math.max(main_value,resource_value);
  if (result.value===0) {
  	result.source = 'None'
    return result
  }
  if (result.value==main_value) {
  	result.source = 'Main';
  } else {
  	result.source = 'Resource';
  }
  return result;
}

function process_resources(parameters) {
  
  //store resource_dice
  var resource_dicepool = findObjs({type:'attribute',name:'resource_dice',characterid:parameters.character})[0];
  parameters.resource_dice = resource_dicepool.get('current');
  let all_attrs = findObjs({type:'attribute',characterid:parameters.character});
  //reset selected dice
  const regex = new RegExp('^resource[0-9]+[a-b]+$');

  var target_list = all_attrs.filter(function (item) {
  var attr_name = item.get("name");
  if (regex.test(attr_name)) {
      //sendChat(parameters.character," name:controller_" + attr_name + " matched");    
      var attr_current = item.get("current");
      if (attr_current != 0) {
        //suppress visibility of dice
        //sendChat(parameters.character," name:controller_" + attr_name + " set");
        findObjs({type:'attribute',name:"controller_" + attr_name, characterid:parameters.character})[0].set("current","inactive"); 
        return true;
	  }
	  else {
	    return false;
	  }   
    } 
  });
  
  for (var attr of target_list) {
      attr.set("current", 0);
  }
  
  //erase resouce dice selected box
  const regex3 = new RegExp('^resource_d[0-9]+_[0-9]+$');
  target_list = all_attrs.filter(function (item) {
	var attr_name = item.get("name");
    return regex3.test(attr_name );
  });
  
  for (var attr of target_list) {
    attr.set("current","one");
  }
  
  //erase resource_dice attribute
  const regex4 = new RegExp('^resource_diceroll$');
  target_list = all_attrs.filter(function (item) {
	var attr_name  = item.get("name");
    return regex4.test(attr_name);
  });
 
  for (var attr of target_list) {
    attr.set("current","{}");
  }
  
  //erase resource_dicepool attribute
  resource_dicepool.set("current","{}")
}
