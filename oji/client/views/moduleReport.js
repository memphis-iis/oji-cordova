Template.moduleReport.helpers({
    'generalinfo': function (){
        resultsData = ModuleResults.findOne();
        modData = Modules.findOne({_id: resultsData.moduleId})
        dateAccessed = new Date(0);
        data = { 
            lastAccessed: dateAccessed,
            title: modData.title,
            lastAccessed: resultsData.lastAccessed,

        }
        return data;
    },

    'pages': function(){
        resultsData = ModuleResults.findOne();
        modData = Modules.findOne({_id: resultsData.moduleId})
        responses = [];
        //get the timestamp of the first response
        firstTimeStamp = resultsData.responses[0].responseTimeStamp.toDate();
        for(i = 0; i < resultsData.responses.length; i++){
            if(modData.pages[resultsData.responses[i].pageId].questions[resultsData.responses[i].questionId].type != "combo"){
                data = {
                    question: modData.pages[resultsData.responses[i].pageId].questions[resultsData.responses[i].questionId].prompt,
                    response: resultsData.responses[i].response[0],
                    timeElapsed: (resultsData.responses[i].responseTimeStamp.toDate() - firstTimeStamp ) / /* convert to minutes */ 60000 + " minutes"
                }
                responses.push(data)
            } else {
                comboQuestions = modData.pages[resultsData.responses[i].pageId].questions[resultsData.responses[i].questionId].fields;
                for(j = 0; j < comboQuestions.length; j++){
                    data = {
                        question: comboQuestions[j].text,
                        response: resultsData.responses[i].response[j],
                        timeElapsed: (resultsData.responses[i].responseTimeStamp.toDate() - firstTimeStamp ) / /* convert to minutes */ 60000 + " minutes"
                    }
                    responses.push(data);
                }
            }
        }
        return responses;
    },
})

Template.moduleReport.events({
    'click #controlpanel': function(event){
        event.preventDefault();
        target = "/control-panel/";
        window.location.href = target;
    },
    'click #awardCertificate': function(event){
        event.preventDefault();
        resultsData = ModuleResults.findOne();
        modData = Modules.findOne({_id: resultsData.moduleId})
        Meteor.call('generateModuleCertificate',modData._id, resultsData.userId, function(error, result){
            if(error){
                console.log(error);
            } else {
                alert("Certificate generated");
            }
        });
    }

})


Template.moduleReport.onCreated(function() {
    Meteor.subscribe('modules');
})
