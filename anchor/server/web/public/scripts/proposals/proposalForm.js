'use strict';

const questions = [	
	{
		'id':1,
		'type': 'text',
		'domId': 'authors',
		'validationSchema': Joi.string().required(),

	},
	{
		'id':2,
		'type': 'text',
		'domId': 'background',
		'validationSchema': Joi.string().required()

	},
	{
		'id': 3,
		'type': 'text',
		'domId': 'studyPopulation',
		'validationSchema': Joi.string().required()
	},
	{
		'id': 4,
		'type': 'text',
		'domId': 'outcome',
		'validationSchema': Joi.string().required()
	},
	{
		'id': 5,
		'type': 'text',
		'domId': 'exposures',
		'validationSchema': Joi.string().required()
	},
	{
		'id': 6,
		'type': 'text',
		'domId': 'rationale',
		'validationSchema': Joi.string().allow('').optional()
	},
	{
		'id': 7,
		'type': 'text',
		'domId': 'statisticalApproach',
		'validationSchema': Joi.string().required()
	},
	{
		'id': 8,
		'type': 'text',
		'domId': 'references',
		'validationSchema': Joi.string().required()
	},
	{
		'id': 9,
		'type': 'text',
		'domId': 'forConsortium',
		'validationSchema': Joi.string().allow('').optional()
	}
]