'use strict';

const questions = [
	{	
		'id':1,
		'type': 'text',
		'domId': 'name',
		'validationSchema': Joi.string().required(),

	},
	{
		'id':2,
		'type': 'text',
		'domId': 'degree',
		'validationSchema': Joi.string().required(),

	},
	{
		'id':3,
		'type': 'text',
		'domId': 'position',
		'validationSchema': Joi.string().required()

	},
	{
		'id': 4,
		'type': 'text',
		'domId': 'instituition',
		'validationSchema': Joi.string().required()
	},
	{
		'id': 5,
		'type': 'email',
		'domId': 'email',
		'validationSchema': Joi.string().email().required()
	},
	{
		'id': 6,
		'type': 'text',
		'domId': 'mentor',
		'validationSchema': Joi.string().allow('').optional()
	},
	{
		'id': 7,
		'type': 'select',
		'domId': 'traineeType'
	},
	{
		'id': 8,
		'type': 'text',
		'domId': 'traineeTypeOther',
		'validationSchema': Joi.string().required()
	},
	{
		'id': 9,
		'type': 'text',
		'domId': 'projectTitle',
		'validationSchema': Joi.string().max(255).required()
	},
	{
		'id': 10,
		'type': 'text',
		'domId': 'shortTitle',
		'validationSchema': Joi.string().max(40).required()
	},
	{
		'id': 11,
		'type': 'select',
		'domId': 'requireQData'
	},
	{
		'id': 12,
		'type': 'select',
		'domId': 'requireGenData'
	},
	{
		'id': 13,
		'type': 'multiCheck',
		'options': [{'domId':'plasma'}, {'domId':'serum'}, {'domId':'RBC'}, {'domId':'germlineDNA'},{'domId':'tumorTissue'}]		
	},
	{
		'id': 14,
		'type': 'text',
		'domId': 'analyteInterest',
		'validationSchema': Joi.string().required()
	},
	{
		'id': 15,
		'type': 'select',
		'domId': 'requireFunding'		
	},
	{
		'id': 16,
		'type': 'select',
		'domId': 'studyDesignType'
	},
	{
		'id': 17,
		'type': 'select',
		'domId': 'outcomeType'
	},
	{
		'id': 18,
		'type': 'text',
		'domId': 'outcomeInterest',
		'validationSchema': Joi.string().required() 
	},
	{
		'id': 19,
		'type': 'text',
		'domId': 'primaryExposure',
		'validationSchema': Joi.string().required() 
	},
	{
		'id': 20,
		'type': 'text',
		'domId': 'hypothesis',
		'validationSchema': Joi.string().required() 
	},
	{
		'id': 21,
		'type': 'text',
		'domId': 'minSampleSize',
		'validationSchema': Joi.string().allow('').optional()		
	},
	{
		'id': 22,
		'type': 'select',
		'domId': 'willCombineData'
	},
	{
		'id': 23,
		'type': 'text',
		'domId': 'analysisInstitution',
		'validationSchema': Joi.string().required()
	},	
	{
		'id': 24,
		'type': 'text',
		'domId': 'deadline',
		'validationSchema': Joi.string().required()
	},
	{
		'id': 25,
		'type': 'select',
		'domId': 'requireBiospecimens'
	},
	{
		'id': 26,
		'type': 'select',
		'domId': 'coverFeePlan'		
	}
]