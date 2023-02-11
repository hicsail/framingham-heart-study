'use strict';

module.exports = (status) => {

  	if (status === 'rejected'){
  		return 'not approved';
  	}
  	else {
  		return status;
  	}  	
};
