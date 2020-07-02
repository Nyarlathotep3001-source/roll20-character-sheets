// JavaScript Document
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
    	params.plot_points = getAttrByName(character_id, 'plot_points');;
    
    	sorted_rolls(params);
    
    	return_values.main_kept_dice = params.kept_dice;
    	return_values.main_unkept_dice = params.unkept_dice;
    	return_values.main_result = params.total;
    	return_values.complications = params.complications;
    	return_values.plot_points_spent = params.plot_points;
    	params.dice_pool= JSON.parse(getAttrByName(character_id, 'resource_dice'));
    
    	return_values.resources_depleted = Object.keys(params.dice_pool);
    	for (key of Object.keys(params.dice_pool)) {
    	    log(key);
    	    //findObjs({type:'attribute',name:key,characterid:character_id})[0].setWithWorker({current: 0});
    	    //sendChat(msg.who, "setattr --charid "+ character_id + " --" + key + "_show|inactive");
    	    sendChat("API", "!setattr --charid "+ character_id + " --" + key + "|" + "\"0\"");
    	    sendChat(msg.who, "!setattr --charid "+ character_id + " --" + key + "_show|inactive");
    	}
    	
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

    	sendChat(character_name, "&{template:cortex_roll} {{kept_main_dice="+ return_values.main_kept_dice +"}} {{unkept_main_dice=" + return_values.main_unkept_dice + "}} {{kept_resource_dice=" + return_values.resource_kept_dice+"}} {{unkept_resource_dice=" + return_values.resource_unkept_dice +"}} {{total=" + return_values.overall_result + "}} {{complications=" + complications + "}}");    	
    	sendChat("API", "!modattr --charid "+ character_id + " --plot_points|" + return_values.nett_plot_points);
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