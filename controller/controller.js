var services = require("../service/westfield_data_service");
var bodyParser  = require("body-parser");



// all service Request comes here
module.exports = function(app) {

	app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.post('/authenticate', function(req , res){
           var details = req.body;
            services.authenticate(res, details , function (found) {
                res.json(found);    
                res.end();
            });            
    });
	
	
	app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.get('/userprofile/:id', function(req , res){
           var id = req.params.id;
            services.getUserProfile(res, id , function (found) {
                res.json(found);    
                res.end();
            });            
    });
	
	app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.put('/userprofile', function(req , res){
		   var details = req.body;
            services.updateUserProfile(res, details, function (found) {
                res.json(found);    
                res.end();
            });            
    });
	
	app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.get('/retreiveInsuredRolesForPolicy/:policyNumber/:verificationDate', function(req , res){
			var policyNumber = req.params.policyNumber;
			var verificationDate = req.params.verificationDate;
            services.retreiveInsuredRolesForPolicy(res, policyNumber,verificationDate , function (found) {
                res.json(found);    
                res.end();
            });            
    });
	
	app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.get('/retrievePolicyDetailsForVendor/:policyNumber/:verificationDate', function(req , res){
			var policyNumber = req.params.policyNumber;
			var verificationDate = req.params.verificationDate;
            services.retrievePolicyDetailsForVendor(res, policyNumber,verificationDate , function (found) {
                res.json(found);    
                res.end();
            });            
    });
	
	app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.get('/westfiledapiintegration/:claimNumber', function(req , res){
			var claimNumber = req.params.claimNumber;
            services.westfieldClaimService(res, claimNumber, function (found) {
                res.json(found);    
                res.end();
            });            
    });
	
	app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.post('/cognitiveorchestrator2', function(req , res){
			var details = req.body;
            services.cognitiveOrchestrator(res, details, function (found) {
                res.json(found);    
                res.end();
            });            
    });
}