'use strict';
const User = require('../../models/user');

module.exports = (postReviewInfo, key, options) => { //Only enable a check box if all its prev checkboxes are checked 

	if (!postReviewInfo) {
		return options.fn(this);	
	}
	let disabled = false;
	const orders = ['tissueInPreparation', 
					'tissueShipped', 
					'brainDataReturned', 
					'clinicalDataTransfered'];
					
	for (let i=0; i<orders.indexOf(key);++i) {	  
	  	if (!postReviewInfo[orders[i]]) {
			disabled = true;
			break;
		}
	}	
  	if (disabled){
    	return options.fn(this);
  	}
  	return options.inverse(this);
};
