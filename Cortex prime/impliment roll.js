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
    
    	params.dice_pool= JSON.parse(getAttrByName(character_id, 'main_dice'));
    	params.complications = 0;
    	params.add_plot_point = 0;
    	params.plot_points = getAttrByName(character_id, 'plot_points_spent');
    	var total_plot_points = Number.parseInt(getAttrByName(character_id, 'plot_points'));
        if (params.plot_points > total_plot_points) {
            params.plot_points = total_plot_points;
        }
    	sorted_rolls(params);
    	return_values.main_kept_dice = params.kept_dice;
    	return_values.main_unkept_dice = params.unkept_dice;
    	return_values.main_result = params.total;
    	return_values.complications = params.complications;
    	return_values.plot_points_spent = params.plot_points;
    	stress_type = JSON.parse(getAttrByName(character_id, 'stress_dice')).stress;
    	for (key of Object.keys(stress_type)) {
    	    stress_type_str = key + "(" + stress_type[key] + ")";
    	}
    	return_values.stress_type = stress_type_str;
    	
    	let get_res = {}
    	get_res.character = character_id;
    	
    	//params.dice_pool= JSON.parse(process_resources(get_res).resource_dice);
    	params.dice_pool= JSON.parse(getAttrByName(character_id, 'resource_dice'));
    	
    	process_resources(get_res);
    	params.plot_points = -1;
    	sorted_rolls(params);
        
    	return_values.resource_kept_dice = params.kept_dice;
    	return_values.resource_unkept_dice = params.unkept_dice;
    
    	return_values.nett_plot_points = return_values.plot_points_spent * -1 + params.add_plot_point;
    	return_values.resource_result = params.total;
    	return_values.overall_result = return_values.main_result + return_values.resource_result;
        
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
			var roll = randomInteger(value[key].substr(1));
			params.sort_roll.push([key,roll]);
			if (value[key]==="d4") {
				params.add_plot_point = 1;
			}
			if (roll === 1) {
				params.complications = params.complications + 1
			}
		}   
	}
	params.sort_roll.sort(function(a, b) { return b[1] -a[1];});
	var kept_dice = params.sort_roll.slice(0,  params.plot_points+2);
	params.total = 0;
	for (var value of Object.values(kept_dice)) {
		params.total = params.total + parseInt(value[1]);
	}
	params.kept_dice = kept_dice.join(" ").replace(/,/g,": ");

	var unkept_dice = params.sort_roll.slice(params.plot_points+2);
	params.unkept_dice = unkept_dice.join(" ").replace(/,/g,": ");

	return params;
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
      sendChat(parameters.character," name:controller_" + attr_name + " matched");    
      var attr_current = item.get("current");
      if (attr_current != 0) {
        //suppress visibility of dice
        sendChat(parameters.character," name:controller_" + attr_name + " set");
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
