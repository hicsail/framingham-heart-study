'use strict';

module.exports = (status, prefix) => {

  	if (status === 'Rejected'){
  		return prefix + '-danger';
  	}
  	else if (status === 'Approved') {
  		return prefix + '-success';
  	}
  	return prefix + '-info';
};
