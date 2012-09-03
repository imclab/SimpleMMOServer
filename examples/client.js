var SimpleMMOServer	= function(humanName){
	var socket	= io.connect();
	//var socket = io.connect('http://jetienne.tquery-multiplayerserver.jit.su:80/');
	this._socket	= socket;
	//////////////////////////////////////////////////////////////////////////
	//		userInfo						//
	//////////////////////////////////////////////////////////////////////////
	humanName	= humanName	|| "user"+Math.floor(Math.random()*100000);
	var userInfo	= {
		humanName	: humanName
	};
	// emit initial userInfo
	socket.emit('userInfo', userInfo);

	var usersInfo	= {};
	this._usersInfo	= usersInfo;
	// listen on user info
	socket.on('userInfo', function(data){
		console.log('received userInfo', JSON.stringify(data, null, '\t'))
		// test if it is a new user
		var newUser	= usersInfo[data.sourceId] === undefined ? true : false;
		// update usersInfo
		usersInfo[data.sourceId]	= data.userInfo;
		// notify event
		if( newUser )	this.dispatchEvent('userJoin', data);
	}.bind(this));
	// listen on bye
	// - TODO rename that 'userLeft'
	socket.on('bye', function(data){
		console.log('received bye ', JSON.stringify(data, null, '\t'));

		this.dispatchEvent('userLeft', usersInfo[data.sourceId]);

		delete usersInfo[data.sourceId]
	}.bind(this));
	// listen on 'userList'
	socket.on('userlist', function(data){
		console.log('received userList ', JSON.stringify(data, null, '\t'), this);
		usersInfo	= data;
		this.dispatchEvent('usersInfoChange', usersInfo);
	}.bind(this));

	//////////////////////////////////////////////////////////////////////////
	//		Ping							//
	//////////////////////////////////////////////////////////////////////////

	// ping server every seconds
	this._latency	= null;
	setInterval(function(){
		socket.emit('ping', { time	: Date.now() });
	}, 1000)
	socket.on('pong', function(data){
		var rtt		= Date.now() - data.time;
		var smoother	= 0.3;
		this._latency	= this._latency === null ? rtt : this._latency;
		this._latency	= (1-smoother)*this._latency  + smoother * rtt;
		//console.log('received pong. rtt ', rtt, 'ms.', 'Smoothed Latency:', this._latency);
		this.dispatchEvent('pong', data)
	}.bind(this));


	//////////////////////////////////////////////////////////////////////////
	//		Chat							//
	//////////////////////////////////////////////////////////////////////////

	socket.on('clientEcho', function(data){
		this.dispatchEvent('clientEcho', data)
	}.bind(this));
}


SimpleMMOServer.prototype.clientEcho	= function(data){
	this._socket.emit('clientEcho', data)
}

SimpleMMOServer.prototype.latency	= function(){
	return this._latency;
}

SimpleMMOServer.prototype.usersInfo	= function(){
	return this._usersInfo;
}
//////////////////////////////////////////////////////////////////////////////////
//		SimpleMMOServer microevent					//
//////////////////////////////////////////////////////////////////////////////////

SimpleMMOServer.MicroeventMixin	= function(destObj){
	destObj.addEventListener	= function(event, fct){
		if(this._events === undefined) 	this._events	= {};
		this._events[event] = this._events[event]	|| [];
		this._events[event].push(fct);
		return fct;
	};
	destObj.removeEventListener	= function(event, fct){
		if(this._events === undefined) 	this._events	= {};
		if( event in this._events === false  )	return;
		this._events[event].splice(this._events[event].indexOf(fct), 1);
	};
	destObj.dispatchEvent		= function(event /* , args... */){
		if(this._events === undefined) 	this._events	= {};
		if( this._events[event] === undefined )	return;
		var tmpArray	= this._events[event].slice(); 
		for(var i = 0; i < tmpArray.length; i++){
			tmpArray[i].apply(this, Array.prototype.slice.call(arguments, 1))
		}
	};
};

SimpleMMOServer.MicroeventMixin(SimpleMMOServer.prototype);


