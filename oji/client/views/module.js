Template.module.helpers({
    'module': () => Modules.findOne(),
    'pageid': function() {return parseInt(Meteor.user().curModule.pageId);},
    'questionid': function() {return parseInt(this.questionId) + 1;},
    'totalpages': function(){
        return Modules.findOne().pages.length;
    },
    'completed' : function(){
        if(Meteor.user().curModule.pageId == "completed"){
            return true;
        } else {
            return false;
        }
    },
    'page': function(){
        page = Modules.findOne().pages[parseInt(this.pageId)];
        const t = Template.instance();
        if(page.type == "text"){
            page.typeText = true;
            t.pageType.set("text");
        };
        if(page.type == "activity"){
            page.typeActivity = true;
            t.pageType.set("activity");
        };
        if(!page.imgStyle){
            page.imgStyle = "max-width:50%; height:auto; margin:10px;"
        }
        return page;
    },
    'question': function(){
        page = Modules.findOne().pages[parseInt(this.pageId)];
        question = page.questions[parseInt(this.questionId)];
        const t = Template.instance();
        if(question.type == "blank"){
            question.typeBlank = true;
        };
        if(question.type == "multiChoice"){
            question.typeMultiChoice = true;
        };
        if(question.type == "longText"){
            question.typeLongText = true;
        };
        if(question.type == "dropdown"){
            question.typeDropDown = true;
        };
        if(question.type == "combo"){
            question.typeCombo= true;
            fields = question.fields;
            for(i = 0; i < fields.length; i++){
                if(fields[i].type == "blank"){
                    fields[i].typeBlank = true;
                };
                if(fields[i].type == "longtext"){
                    fields[i].typeLongText = true;
                };
                if(fields[i].type == "multiChoice"){
                    fields[i].typeMultiChoice = true;
                    for(j = 0; j < fields[i].answers.length; j++){
                        fields[i].answers[j].group = i;
                    }
                };
                
            }
        };
        t.questionType.set(question.type);
        question.length = question.length;
        if(!question.imgStyle){
            question.imgStyle = "max-width:50%; height:auto; margin:10px;";
        }
        return question;
    },
    'percentDone': function(){
        length = Modules.findOne().pages.length;
        percent = parseInt(this.pageId) / length * 100;
        return percent.toFixed(0);
    },
});

Template.module.events({
    'click .continue': function(event) {
        event.preventDefault();
        const t = Template.instance();
        let target = "";
        let moduleId = Meteor.user().curModule.moduleId;
        let moduleData = ModuleResults.findOne({_id: moduleId});
        moduleData.lastAccessed = Date.now().toString();
        thisPage = Meteor.user().curModule.pageId;
        thisQuestion = parseInt(Meteor.user().curModule.questionId);
        if(t.pageType.get() == "activity"){
            questionData = {};
            questionData.questionType = t.questionType.get();
            if(questionData.questionType == "blank"){
                response = $('.textInput').val();
            }
            if(questionData.questionType == "multiChoice"){
                response = $(event.target).html();
            }
            if(questionData.questionType == "longText"){
                response = $('.textareaInput').val();
            }
            if(questionData.questionType == "combo"){
                allInput = document.getElementsByClassName('combo');
                response = [];
                for(i = 0; i < allInput.length; i++){
                    if ($(allInput[i]).prop('nodeName') == "INPUT" || $(allInput[i]).prop('nodeName') == "TEXTAREA"){
                        response.push($(allInput[i]).val());
                    }
                    if ($(allInput[i]).hasClass('btn-info')){
                        response.push($(allInput[i]).html());
                    }
                }
            }
            data = {
                pageId: thisPage,
                questionId: thisQuestion,
                response: response,
                responseTimeStamp: Date.now().toString()
            }
            moduleData.responses.push(data);
            moduleData.nextPage = thisPage;
            moduleData.nextQuestion = parseInt(thisQuestion) + 1;
            if(typeof Modules.findOne().pages[moduleData.nextPage] !== "undefined"){
                if(typeof Modules.findOne().pages[moduleData.nextPage].questions !== "undefined"){
                    if(moduleData.nextQuestion >= Modules.findOne().pages[moduleData.nextPage].questions.length){
                        moduleData.nextPage = thisPage + 1;
                        moduleData.nextQuestion = 0;
                        target = "/module/" + Modules.findOne()._id + "/" + moduleData.nextPage;
                    } else  {
                        target = "/module/" + Modules.findOne()._id + "/" + moduleData.nextPage + "/" + moduleData.nextQuestion;
                    }
                 }
            }
            Meteor.call("saveModuleData", moduleData);
            
        } else {
            moduleData.nextPage = parseInt(thisPage) + 1;
            moduleData.nextQuestion = 0;
            data = {
                pageId: thisPage,
                response: "read",
                responseTimeStamp: Date.now().toString()
            }
            Meteor.call("saveModuleData", moduleData);
            target = "/module/" + Modules.findOne()._id + "/" + moduleData.nextPage;
        }
        if(moduleData.nextPage >= Modules.findOne().pages.length){
            moduleData.nextPage = "completed";
            moduleData.nextQuestion = "completed";
            index = user.assigned.findIndex(x => x.assignmentId === moduleId);
            if(index != -1){
                user.assigned.splice(index, 1);
            }
            user.assigned.splice(index, 1);
            Meteor.call('changeAssignmentOneUser', [userId, user.assigned]);
            Meteor.call("saveModuleData", moduleData);
            target = "/module/" + Modules.findOne()._id + "/completed";
        } 

        Router.go(target);
    },
    'click #startActivity': function(event){
        target =  $(location).attr('href') + "/0";
        Router.go(target);
    },
    'click .multichoice': function(event){
        event.preventDefault();
        const collection = document.getElementsByClassName("multichoice");
        for (let i = 0; i < collection.length; i++){
            if(collection[i].dataset.group == $(event.target).data("group")){
                collection[i].classList.remove("btn-info");
            }
        }
        event.target.classList.toggle('btn-info');
    },
    'click #startModule': function(event){
        event.preventDefault();
        data = {
            userId: Meteor.userId(),
            moduleId: Modules.findOne()._id, 
            responses: []
        }
        Meteor.call("createNewModuleTrial", data);
        target = "/module/" + Modules.findOne()._id + "/0";
        Router.go(target);
    },
    'click #goBack': function(event){
        target = "/profile/"
        Router.go(target);
    }
})

Template.module.onCreated(function(){
    this.questionType = new ReactiveVar("");
    this.pageType = new ReactiveVar("");
    this.pageId = new ReactiveVar("");
})