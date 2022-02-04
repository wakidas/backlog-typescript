import fetch from 'node-fetch';

function callApi() {
  fetch('https://api.github.com/users/github')
	.then(res => res.json())
	.then(json => console.log(json));
  }

callApi();
