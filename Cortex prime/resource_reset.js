on('chat:message', function (msg_orig) {
	var msg = _.clone(msg_orig);
	if (msg.type == "api" && msg.content.indexOf("!resource_reset") === 0 && playerIsGM(msg.playerid)) {
	    var params = msg.content.split(",");
	    if (params.length != 3) {
	        sendChat(msg.who,"Error in reset, insufficient parameters.");
	    }
	    else
	    {
	        findObjs({type:'attribute',name:'controller_' + params[2] + 'a',characterid:params[1]})[0].set("current", "active");
	        findObjs({type:'attribute',name:'controller_' + params[2] + 'b',characterid:params[1]})[0].set("current", "active");
	    }
	}
});