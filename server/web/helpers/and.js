"use strict";

module.exports = (arg1, arg2, options) => {
  return arg1 && arg2 ? options.fn(this) : options.inverse(this);
};
