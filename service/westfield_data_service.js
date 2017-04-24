var express  = require('express');
var request = require('request'); 
var parseString = require('xml2js').parseString;
var Promise = require('es6-promise').Promise;
const NodeCache = require( "node-cache" );
const WestFieldCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });



var dburl = "https://94e3255e-7d4b-46c2-9bc2-50592b9fb06b-bluemix.cloudant.com";



exports.authenticate = function(res, details, callback){
	
	var username = details.username;
	var password = details.password;
	var uri = dburl+"/userprofile/_find"
	var reqBody ={
				"selector": {
					"username": username.toLowerCase(),
					"password": password
				}
	};
	
	request({
		method: 'POST',
		uri: uri,
		headers: {
			'Content-Type': 'application/json'
		},
		json: reqBody
	}, function(error, response, res_body) {
		if(error != null  || res_body.docs.length <=0 || res_body.docs[0]== null ||res_body.docs[0]== undefined){
			callback({
				"responsecode": "404",
				"message": "User not found with username and password combination"
			});
		}else{
			callback(res_body);
		}
		
	});
}


exports.getUserProfile = function(res, id, callback){
	
	var uri = dburl+"/userprofile/"+id;
	console.log(uri);
	request({
		method: 'GET',
		uri: uri
	}, function(error, response, res_body) {
		console.log(error);
		var parsedresponse = JSON.parse(res_body);
		if(error != null  || parsedresponse._id == null || parsedresponse._id == undefined){
			callback({
				"responsecode": "404",
				"message": "User not found"
			});
		}else{
			try{
				callback(JSON.parse(res_body));
			}catch(err){
				callback({
					"responsecode": "500",
					"message": "Failed to fetch User profile information"
				});
			}
			
		}
		
	});
}

exports.updateUserProfile = function(res, details, callback){
	var id  = details.id;
	var uri = dburl+"/userprofile/"+id;
	console.log(uri);
	exports.getUserProfile(res, id, function(profile){
		if(profile.responsecode != null && profile.responsecode != undefined){
			callback(profile);
		}else{
			if(details.preferredfirstname != undefined){
				profile.preferredfirstname = details.preferredfirstname;
			}
			if(details.preferredlastname != undefined){
				profile.preferredlastname = details.preferredlastname;
			}
			if(details.cellphonenumber != undefined){
				profile.cellphonenumber = details.cellphonenumber;
			}
			if(details.email != undefined){
				profile.email = details.email;
			}
			if(details.voice != undefined){
				profile.voice = details.voice;
			}		
			request({
				method: 'PUT',
				uri: uri,
				headers: {
					'Content-Type': 'application/json'
				},
				json: profile
			}, function(error, response, res_body) {
				if(error != null || res_body._id == null || res_body._id == undefined){
					console.log("Error occured while updating User information");
					callback({
						"responsecode": "500",
						"message": "Error occured while updating User information"
					});
				}else{
					callback(res_body);
				}
				
			});
		}
		
	});	
}

exports.retreiveInsuredRolesForPolicy = function(res, policyNumber,verificationDate, callback){

	var uri ="https://nodered-westfield.mybluemix.net/InsuredRolesForPolicy?token=5531999940875&id=NVDMV-2011-04-20-9:31:00:000000&policyNumber=" + policyNumber + "&verificationDate=" + verificationDate;
	console.log(uri);
	request({
		method: 'GET',
		uri: uri
	}, function(error, response, res_body) {
			if(error != null){
				console.log("Error occured while fetching InsuredRolesForPolicy");
				callback({
					"responsecode": "500",
					"message": "Error while fetching Insured roles for policy"
				});
			}else{
				try{
					parseString(res_body, function (err, result) {
						if(err != null){
							callback({
								"responsecode": "500",
								"message": "Failed to parse xml response"
							});
						}else{
							
							WestFieldCache.get( "naicscodes", function( err, value ){
								var naicscodes;
								if( err == null ){
									if(value == undefined){
										var naicsUri = dburl+ "/naics/1";
										request({
											method: 'GET',
											uri: naicsUri
										}, function(error, response, naicscodes) {
											var parsednaicscodes= JSON.parse(naicscodes);
											if(error != null || parsednaicscodes._id == null || parsednaicscodes._id ==  undefined){
												callback({
													"responsecode": "404",
													"message": "naics data not found"
												});
											}else{
												WestFieldCache.set( "naicscodes", naicscodes, function( err, success ){
													if(err != null){
														console.log("Failed to set naics codes cache");
													}
													prepareResponseDataForInsuredRoles(naicscodes,result, function(resp){
														callback(resp);
													});
												});
											}
										});
									}else{
										console.log( value );
										naicscodes = value;
										prepareResponseDataForInsuredRoles(naicscodes,result, function(resp){
											callback(resp);
										});
									}
								}else{
									var naicsUri = dburl+ "/naics/1";
									request({
										method: 'GET',
										uri: naicsUri
									}, function(error, response, naicscodes) {
										var parsednaicscodes = JSON.parse(naicscodes);
										if(error != null || parsednaicscodes._id == null || parsednaicscodes._id ==  undefined){
											callback({
												"responsecode": "404",
												"message": "naics data not found"
											});
										}else{
											WestFieldCache.set( "naicscodes", naicscodes, function( err, success ){
												console.log("Failed to set naics codes cache");
												prepareResponseDataForInsuredRoles(naicscodes,result, function(resp){
													callback(resp);
												});
											});
										}
									});
								}
							});
						}
					});
				}catch(err){
					callback({
						"responsecode": "500",
						"message": "Error while fetching Insured roles for policy"
					});
				}
			}
	}); 
}

function prepareResponseDataForInsuredRoles(naicscodes,result,callback){
	var businessDescription = "Contractor";
	var naicscode = "";
	if(typeof(result["soapenv:Envelope"]["soapenv:Body"][0]["RetrieveInsuredRolesForPolicyResponse"][0]["roles"][0]["party"][0]["industries"]) != "undefined"){
		if(typeof(result["soapenv:Envelope"]["soapenv:Body"][0]["RetrieveInsuredRolesForPolicyResponse"][0]["roles"][0]["party"][0]["industries"][0]["description"]!= "undefined")){
			businessDescription = result["soapenv:Envelope"]["soapenv:Body"][0]["RetrieveInsuredRolesForPolicyResponse"][0]["roles"][0]["party"][0]["industries"][0]["description"][0];
		}
		if(typeof(result["soapenv:Envelope"]["soapenv:Body"][0]["RetrieveInsuredRolesForPolicyResponse"][0]["roles"][0]["party"][0]["industries"][0]["industryCode"]!= "undefined")){
			naicscode = result["soapenv:Envelope"]["soapenv:Body"][0]["RetrieveInsuredRolesForPolicyResponse"][0]["roles"][0]["party"][0]["industries"][0]["industryCode"][0];
		}
	}
	//businessDescription = result["soapenv:Envelope"]["soapenv:Body"][0]["RetrieveInsuredRolesForPolicyResponse"][0]["roles"][0]["party"][0]["industries"][0]["description"][0];
	//naicscode = result["soapenv:Envelope"]["soapenv:Body"][0]["RetrieveInsuredRolesForPolicyResponse"][0]["roles"][0]["party"][0]["industries"][0]["industryCode"][0];
	console.log(businessDescription);
	var businessState = result["soapenv:Envelope"]["soapenv:Body"][0]["RetrieveInsuredRolesForPolicyResponse"][0]["roles"][0]["party"][0]["partyContactPreferences"][0]["contactPoints"][0]["state"][0];
	var businessCity = result["soapenv:Envelope"]["soapenv:Body"][0]["RetrieveInsuredRolesForPolicyResponse"][0]["roles"][0]["party"][0]["partyContactPreferences"][0]["contactPoints"][0]["city"][0];
	businessCity = businessCity.toLowerCase();
	businessCity = businessCity.charAt(0).toUpperCase() + businessCity.slice(1);
	
	
	var businessdescriptionsingular = "Contractor";
	var businessdescriptionplural = "Contractors";
	var industryterm = "Contractor";
	var skilltradebusiness = "Contractor";
	
	var naicscodesObject;
	try{
		naicscodesObject = JSON.parse(naicscodes);
	}catch(err){
		console.log("failed to parse naics codes");
		callback({
			"responsecode": "500",
			"message": "Error while parsing naics codes"
		});
		return;
	}
	
	for (i = 0; i < naicscodesObject.naicsmapping.length; i++) {
		if (naicscodesObject.naicsmapping[i].code == naicscode){
			businessdescriptionsingular = naicscodesObject.naicsmapping[i].businessdescriptionsingular;
			businessdescriptionplural = naicscodesObject.naicsmapping[i].businessdescriptionplural;
			industryterm = naicscodesObject.naicsmapping[i].industryterm;
			skilltradebusiness = naicscodesObject.naicsmapping[i].skilltradebusiness;
		}
	}

	var msg = {};
	msg.payload = {
		"businessDescription" : businessDescription,
		"businessState" : businessState,
		"businessCity" : businessCity,
		"businessdescriptionsingular" : businessdescriptionsingular,
		"businessdescriptionplural" : businessdescriptionplural,
		"industryterm" : industryterm,
		"skilltradebusiness" : skilltradebusiness
	}; 
	callback(msg);
};

exports.retrievePolicyDetailsForVendor = function(res, policyNumber,verificationDate, callback){

	var uri ="https://nodered-westfield.mybluemix.net/policyDetailsForVendor?token=5531999940875&id=e562a47f-bfb3-4b74-a641-af5336591652&policyNumber=" + policyNumber + "&verificationDate=" + verificationDate;
	request({
		method: 'GET',
		uri: uri
	}, function(error, response, res_body) {
		if(error != null){
			console.log("Error while fetching Policy details for vendor");
			callback({
				"responsecode": "500",
				"message": "Error while fetching Policy details for vendor"
			});
		}else{
			try{
				parseString(res_body, function (err, result) {
					if(err != null){
						callback({
							"responsecode": "500",
							"message": "Failed to parse xml response"
						});
					}else{
						var vehicles = 0;
						var drivers = 0;
						var driverslessthan25 = 0;
						var namedinsured = result["soapenv:Envelope"]["soapenv:Body"][0]["RetrievePolicyDetailsForVendorResponse"][0]["insurancePolicy"][0]["rolesInFinancialServicesAgreement"][0]["party"][0]["allNames"][0]["fullName"][0]


						var finServAgreementComponents = result["soapenv:Envelope"]["soapenv:Body"][0]["RetrievePolicyDetailsForVendorResponse"][0]["insurancePolicy"][0]["financialServicesAgreementComponents"];

						for (i = 0; i < finServAgreementComponents.length; i++) {
						   if(finServAgreementComponents[i].rolesInFinancialServicesAgreement[0].type[0].name[0] == "Vehicle"){
							   vehicles = vehicles + 1;
						   }
						}

						var rolesInFinServAgreement = result["soapenv:Envelope"]["soapenv:Body"][0]["RetrievePolicyDetailsForVendorResponse"][0]["insurancePolicy"][0]["rolesInFinancialServicesAgreement"];
						var birthdateString;
						var today = new Date();
						console.log(today);
						var party;
						for (j = 0; j < rolesInFinServAgreement.length; j++) {
						   if(rolesInFinServAgreement[j]["$"]["xsi:type"] == "NamedDriver"){
							   drivers = drivers + 1;
							   party = rolesInFinServAgreement[j].party[0];
							   birthdateString = party.birthDate[0];
							   try{
								   birthdate = new Date(Date.parse(birthdateString.substr(0,9)));
							   }catch(err){
									callback({
										"responsecode": "500",
										"message": "Invalid birth date for user"
									});
									return;
							   }							   
							   if(today.getYear()-birthdate.getYear() < 25){
								   driverslessthan25 = driverslessthan25 + 1;
							   }
						   }
						}

						var msg = {};
						msg = {
							"namedInsured" : namedinsured,
							"numberOfVehicles" : vehicles,
							"numberOfDrivers" : drivers,
							"driversUnder25" : driverslessthan25,
						};
						callback(msg);
					}
					
				});
			}catch(err){
				callback({
					"responsecode": "500",
					"message": "Error while fetching Policy details for vendor"
				});
			}
		}
					
	}); 
}


exports.westfieldClaimService = function(res, claimNumber, callback){

	var uri ="https://nodered-westfield.mybluemix.net/SimpleServlet?token=5531999940875&id=e562a47f-bfb3-4b74-a641-af5336591652&claimNumber=" + claimNumber;
	request({
		method: 'GET',
		uri: uri
	}, function(error, response, res_body) {
		if(error != null){
			console.log("Error while fetching Westfield claim details");
			callback({
				"responsecode": "500",
				"message": "Error while fetching Westfield claim details"
			});
		}else{
			try{
				parseString(res_body, function (err, result) {
					if(err != null){
						callback({
							"responsecode": "500",
							"message": "Failed to parse xml response"
						});
					}else{
						var policyNumber = result["tns:Envelope"]["tns:Body"][0]["WX:RetrieveClaimDetailsResponse"][0]["WX:claimFolder"][0]["WX:underlyingAgreements"][0]["WX:policyNumber"];
						var lossCause = result["tns:Envelope"]["tns:Body"][0]["WX:RetrieveClaimDetailsResponse"][0]["WX:claimFolder"][0]["WX:claimedLossEvents"][0]["WX:causeOfLoss"];
						var detailedLossCause = result["tns:Envelope"]["tns:Body"][0]["WX:RetrieveClaimDetailsResponse"][0]["WX:claimFolder"][0]["WX:claimedLossEvents"][0]["WX:detailedLossCause"];
						var firstName = result["tns:Envelope"]["tns:Body"][0]["WX:RetrieveClaimDetailsResponse"][0]["WX:claimFolder"][0]["WX:underlyingAgreements"][0]["WX:rolesInFinancialServicesAgreement"][0]["WX:party"][0]["WX:allNames"][0]["WX:firstName"]
						var lastName = result["tns:Envelope"]["tns:Body"][0]["WX:RetrieveClaimDetailsResponse"][0]["WX:claimFolder"][0]["WX:underlyingAgreements"][0]["WX:rolesInFinancialServicesAgreement"][0]["WX:party"][0]["WX:allNames"][0]["WX:lastName"]
						
						var msg = {};
						msg = {
							"lossCause" : lossCause,
							"policyNumber" : policyNumber,
							"detailedLossCause" : detailedLossCause
						};
						callback(msg);						
					}
				});
			}catch(err){
				callback({
					"responsecode": "500",
					"message": "Error while fetching Westfield claim details"
				});
			}
		}
					
	}); 
}

exports.cognitiveOrchestrator = function(res,details,callback){

	var props = {};
	props.profileId  	= details.id;
	props.input  		= details.input;
	props.details 		= details;
	
	exports.getUserProfile(res, props.profileId, function(userProfile){
		if(userProfile.responsecode != null && userProfile.responsecode != undefined){
			callback(userProfile);
		}else{
			props.profile  = userProfile;
			if(props.input == -1){
				
				var p1 = new Promise(function(resolve,reject){
					exports.westfieldClaimService(res, props.profile.claimNumber, function(response){
						if(response.lossCause == undefined){
							reject(response);
						}else{
							props.lossCause 		= response.lossCause;
							props.policyNumber 		= response.policyNumber;
							resolve(props);
						}
					});
				});
				
				var p2 =  new Promise(function(resolve,reject){
					var today = new Date();
					exports.retrievePolicyDetailsForVendor(res, props.profile.policynumber,today, function(policyDetails){
						if(policyDetails.namedInsured == undefined){
							reject(policyDetails);
						}else{
							props.namedInsured 		= policyDetails.namedInsured;
							props.numberOfVehicles 	= policyDetails.numberOfVehicles;
							props.numberOfDrivers 	= policyDetails.numberOfDrivers;
							props.driversUnder25 	= policyDetails.driversUnder25;
							resolve(props);
						}
					});
				})
				
				var p3  = new Promise(function(resolve,reject){
					exports.retreiveInsuredRolesForPolicy(res, props.profile.policynumber,"2017-01-01T00:01:00.000-05:00", function(insuredRoles){
						if(insuredRoles.businessDescription == undefined){
							reject(insuredRoles);
						}else{
							props.businessDescription 	= insuredRoles.businessDescription;
							props.businessState 		= insuredRoles.businessState;
							props.businessCity 			= insuredRoles.businessCity;
							props.businessdescriptionsingular = insuredRoles.businessdescriptionsingular;
							props.businessdescriptionplural = insuredRoles.businessdescriptionplural;
							props.industryterm = insuredRoles.industryterm;
							props.skilltradebusiness = insuredRoles.skilltradebusiness;
							resolve(props);
						}
					});
				});
				
				Promise.all([p1,p2,p3]).then(function(results){
					doWatsonConversation(props,function(conversationResp){
						callback(conversationResp);
					});
				}).catch(function (error) { 
					callback(error);
				});
			}else{
				doWatsonConversation(props,function(conversationResp){
					callback(conversationResp);
				});
			}
		}
		
	});
	
}

function doWatsonConversation(props, callback){
	
	var profile = props.profile;
	props.payload = props.details;

	var temp_msg = props.payload.input;
	var username = profile.username;
	workspace_id = "03754f9c-23fd-496d-86ac-132a510a38a7";
	var context = JSON.parse("{}");
	if (typeof(props.payload.context) != "undefined"){
		var test  = JSON.stringify(props.payload.context);
		if (test.length > 2) {
			try{
				context = JSON.parse(props.payload.context);
			}catch(err){
				callback({
					"responsecode": "500",
					"message": "Error in Watson conversation"
				});
			}
		}
	}

	context.SupplyPhones = profile.providesCellPhones;
	context.User_First_Name = profile.preferredfirstname;
	context.Subtopic_Completion = profile.completedsubtopics;
	context.Topic = profile.lastcompletedtopic;
	context.Subtopic = profile.lastcompletedsubtopic;
	context.Topic_Completion =profile.completedtopics;


	context.Loss_Cause = props.lossCause;
	context.Fault_Rating = profile.claimfaultrating;


	if(temp_msg == "-1"){
	context.Named_Insured = props.namedInsured;
	context.Business_Desc = props.businessDescription;
	context.Num_Vehicles =  props.numberOfVehicles;
	context.Num_Drivers = props.numberOfDrivers;
	context.Industry = "Industry";
	context.Business_State = props.businessState;
	context.Business_City = props.businessCity;

	//context.DriversUnder25 =flow.get('driversUnder25');
	context.DriversUnder25 ="0";
	
	context.Business_Desc_Sing = props.businessdescriptionsingular;
	context.Business_Desc_Plural = props.businessdescriptionplural;
	context.Industry_Term = props.industryterm;
	context.Skill_Trade_Buisness = props.skilltradebusiness;
	
	}

	props.payload = temp_msg;

	var params = {
		 context: context, 
		 workspace_id : workspace_id
	};

	/* var watsonConversationInput =  {
		payload: temp_msg,
		params : params,
		req : props.req,
		res : props.res,
		profile : props.profile,
		profileId : props.profileId
	}; */
	var watsonConversationInput =  {
		context : context,
		input	:{
			text: temp_msg
		},
		workspace_id: workspace_id
	}
	var uri  = "https://gateway.watsonplatform.net/conversation/api/v1/workspaces/"+workspace_id+"/message?version=2017-04-21"
	request({
		method: 'POST',
		uri: uri,
		headers: {
			'Content-Type': 'application/json'
		},
		json: watsonConversationInput
	}, function(error, response, res_body) {
		
		if(error != null || res_body.output == null || res_body.output == undefined){
			callback({
				"responsecode": "500",
				"message": "Error in Watson conversation"
			});
		}else{
			console.log(error);
			//console.log(response);
			console.log(res_body);
			var Watson_response = JSON.stringify(res_body.output.text);
			var Watson_context = JSON.stringify(res_body.context);
			var watsonResp = {
					text: Watson_response.substring(2,Watson_response.length-2),
					username: "Watson",
					context: Watson_context
				};
			var updateUserProfileRequestBody = {};
			updateUserProfileRequestBody = profile;
			updateUserProfileRequestBody.preferredfirstname = res_body.context.User_First_Name;
			updateUserProfileRequestBody.providesCellPhones = res_body.context.SupplyPhones;
			updateUserProfileRequestBody.completedsubtopics = res_body.context.Subtopic_Completion;
			updateUserProfileRequestBody.lastcompletedtopic = res_body.context.Topic;
			updateUserProfileRequestBody.lastcompletedsubtopic = res_body.context.Subtopic;
			updateUserProfileRequestBody.completedtopics = res_body.context.Topic_Completion;
			updateUserProfileRequestBody._rev = profile._rev;
			exports.updateUserProfile(res, profile._id, updateUserProfileRequestBody, function(updateUserResp){
				callback(watsonResp);
			});
		}
		
		
	});
}

exports.resetCache = function(res,key,callback){
	if(key == 'ALL'){
		WestFieldCache.flushAll();
		console.log("All cached object cleared");
		callback({
			"responsecode": "200",
			"message": "All cached object cleared"
		});
	}else{
		WestFieldCache.del(key, function( err, count ){
			if(!err ){
				console.log( count+ " cached object deleted" );
				callback({
					"responsecode": "200",
					"message": count+ " cached object cleared"
				}); 
			}else{
				console.log( "Failed to clear cached object" );
				callback({
					"responsecode": "500",
					"message": "Failed to clear cached object"
				}); 
			}
		});
	
	}
}

exports.resetUserprofile = function(res, details, callback){
	
	var username = details.username;
	var uri = dburl+"/userprofile/_find"
	var reqBody ={
		"selector": {
			"username": username.toLowerCase()
		}
	};
	
	request({
		method: 'POST',
		uri: uri,
		headers: {
			'Content-Type': 'application/json'
		},
		json: reqBody
	}, function(error, response, res_body) {		
		if(error != null){
			callback({
				"responsecode": "500",
				"message": "Failed to fetch User profile information"
			}); 
		}else{
		
			var profile;
			try{
				profile = JSON.parse(res_body);
			}catch(err){
				callback({
					"responsecode": "500",
					"message": "Failed to fetch User profile information"
				});
				return;
			}
			
			if(profile.docs.length <= 0 || profile.docs[0] == null || profile.docs[0] == undefined){
				callback({
					"responsecode": "500",
					"message": "Failed to fetch User profile information"
				}); 
			}else{
				var resetValues =  profile.docs[0];
				resetValues.completedsubtopics = [];
				resetValues.providesCellPhones = "";
				resetValues.preferredfirstname = "first";
				resetValues.completedtopics = [];
				resetValues.lastcompletedtopic = "";
				resetValues.lastcompletedsubtopic = "";
				
				var updateUri = dburl+"/userprofile/"+profile.docs[0]._id;
				request({
					method: 'PUT',
					uri: updateUri,
					headers: {
						'Content-Type': 'application/json'
					},
					json: resetValues
				}, function(error, response, resp_body) {	
					if(error != null){
						callback({
							"responsecode": "500",
							"message": "Failed to reset user profile information"
						}); 
					}else{
						callback(resp_body);
					}
				});
			}
		}
	});
}