'use strict';

module.exports = (str) => {

	if (typeof str === 'string') {
		return str.includes('../');  		
	}
	else {
		return false;
	}  
};
