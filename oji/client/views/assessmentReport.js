Template.assessmentReport.helpers({
    'generalinfo': function (){
        resultsData = Trials.findOne({_id: this.assessmentId});
        console.log("resultsData: " + JSON.stringify(resultsData));
        assessmentData = Assessments.findOne({_id: resultsData.assessmentId});
        //get last accessed date readable
        dateAccessed = new Date(resultsData.lastAccessed).toLocaleDateString();
        data = { 
            title: assessmentData.title,
            lastAccessed: dateAccessed,
            questions: []
        }
        //get the timestamp of the first response
        console.log("data: " + data);
        initialTimeStamp = resultsData.data[1].timestamp;
        console.log("initialTimeStamp: " + initialTimeStamp);
        for(i=1; i < resultsData.data.length; i++){
            responseText= assessmentData.answers[resultsData.data[i].response];
            //get elapsed time
            thisTimeStamp = resultsData.data[i].timestamp;
            elapsedTime = thisTimeStamp - initialTimeStamp;
            //convert from milliseconds to minutes
            elapsedTime = Math.round(elapsedTime / 60000);
            qData = {
                question: assessmentData.questions[i].text,
                response: resultsData.data[i].response,
                timeElapsed: elapsedTime + " min",
                responseText: responseText,
                value: resultsData.data[i].responseValue,
                subscales: assessmentData.questions[i].subscales,
                screenshot: resultsData.data[i].screenshot || false
            }
            data.questions.push(qData);
        }
        console.log(data);
        return data;
    },
})

Template.assessmentReport.events({
    'click #controlpanel': function(event){
        event.preventDefault();
        target = "/control-panel/";
        window.location.href = target;
    },
})


Template.assessmentReport.onCreated(function() {
    Meteor.subscribe('assessments');
})
