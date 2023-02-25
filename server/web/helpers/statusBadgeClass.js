'use strict';

module.exports = (status, prefix) => {

  	if (status === 'Revise Requested'){
  		return prefix + '-danger';
  	}
  	else if (status === 'Feasibility Checked') {
  		return prefix + '-success';
  	}
  	return prefix + '-info';
};