'use strict';

module.exports = (status, prefix) => {

  	if (status === 'rejected'){
  		return prefix + '-danger';
  	}
  	else if (status === 'approved') {
  		return prefix + '-success';
  	}
  	return prefix + '-info';
};
