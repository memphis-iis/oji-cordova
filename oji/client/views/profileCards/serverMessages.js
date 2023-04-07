Template.serverMessages.helpers({
    'serverMessage': function(){
        return Settings.findOne({}).publicMessage;
    }
});