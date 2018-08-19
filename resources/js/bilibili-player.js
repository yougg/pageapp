function getParameterByName(name, url) {
	if (!url) {
		url = window.location.href;
	}
	name = name.replace(/[\[\]]/g, "\\$&");
	var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
	results = regex.exec(url);
	if (!results) {
		return null;
	}
	if (!results[2]) {
		return '';
	}
	return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function initLoad() {
	var aid = getParameterByName('aid')
	if (aid) {
		document.getElementById('AID').value = aid;
		loadVideo();
	}
}

function loadVideo() {
	var idValue = document.getElementById('AID').value;
	aid = idValue.replace(/\s+|[a-zA-Z]/g,'');
	if (aid == '') {
		alert('请输入视频ID');
		return;
	}
	//var player = document.getElementById('bplayer');
	//player.setAttribute('flashvars', "aid="+aid);

	var player = document.createElement('embed');
	player.setAttribute('id', 'bplayer');
	player.setAttribute('allowfullscreen', 'true');
	player.setAttribute('type', "application/x-shockwave-flash");
	player.setAttribute('src', "https://static.hdslb.com/miniloader.swf");
	player.setAttribute('quality', 'high');
	player.setAttribute('height', '95%');
	player.setAttribute('width', '100%');
	player.setAttribute('flashvars', 'aid='+aid);

	var playframe = document.getElementById('playframe');
	//playframe.src = playframe.src;
	if (playframe.contentDocument){
		// FF Chrome
		doc = playframe.contentDocument;
	}
	else if (playframe.contentWindow) {
		// IE
		doc = playframe.contentWindow.document;
	}
	doc.body.innerHTML = '';
	doc.body.appendChild(player);
	resetLocation(aid);
}

function resetLocation(aid) {
	if (!aid) {
		return;
	}
	var href = window.location.href;
	var tail = href.indexOf('?');
	var url = href.substring(0, tail);
	url += '?aid='+aid;
	window.history.pushState('BilibiliPlayer', 'Bilibili Player', url)
}
