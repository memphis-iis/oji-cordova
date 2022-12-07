Template.moduleEditor.helpers({
    'module': function() {
        moduleId = this.moduleId; 
        curModule = Modules.findOne({_id: moduleId});
        pages = curModule.pages;
        for(i = 0; i < pages.length; i++){
            if(i == 0){
                pages[i].isFirst = true;
            }
            if(i == pages.length - 1){
                pages[i].isLast = true;
            }
            pages[i].isActivity = false;
            pages[i].isQuiz = false;
            if(pages[i].type == "activity"){
                pages[i].isActivity = true;
                if(typeof pages[i].questions !== "undefined"){
                    questions = pages[i].questions;
                    for(j=0;j < questions.length; j++){
                        questions[j].parent = i;
                        questions[j].isCombo = false;
                        questions[j].isMultiChoice = false;
                        if(questions[j].type == "combo"){ 
                            questions[j].isCombo = true;
                            if(typeof questions[j].fields !== "undefined"){
                                fields = questions[j].fields;
                                for(k=0;k < fields.length;k++){
                                    fields[k].page = i;
                                    fields[k].parent = j;
                                    fields[k].isMultiChoice = false;
                                    if(fields[k].type == "multiChoice"){
                                        fields[k].isMultiChoice = true;
                                        if(typeof fields[k].answers !== "undefined"){
                                            answers = fields[k].answers;
                                            for(l=0;l < answers.length; l++){
                                                answers[l].page = i;
                                                answers[l].question = j;
                                                answers[l].parent = k;
                                            }
                                        }
                                    }
                                }
                            }
                        } 
                        if(questions[j].type == "multiChoice"){
                            answers = questions[j].answers;
                            questions[j].isMultiChoice = true;
                            if(typeof answers !== "undefined"){
                                for(k = 0; k < answers.length; k++){
                                    answers[k].parent = j;
                                    answers[k].page = i;
                                }
                            }
                        }
                    }
                }
            }
            if(pages[i].type == "quiz"){
                pages[i].isQuiz = true;
                if(typeof pages[i].questions !== "undefined"){
                    questions = pages[i].questions;
                    for(j=0;j < questions.length; j++){
                        questions[j].parent = i;
                        questions[j].isCombo = false;
                        questions[j].isMultiChoice = false;
                        if(questions[j].type == "multiChoice"){
                            answers = questions[j].answers;
                            console.log("answers: " + answers);
                            questions[j].isMultiChoice = true;
                            if(typeof answers !== "undefined"){
                                for(k = 0; k < answers.length; k++){
                                    answers[k].parent = j;
                                    answers[k].page = i;
                                }
                            }
                        }
                    }
                }
            }
        }
        return curModule;
    },
    'json': function(){
        moduleId = this.moduleId; 
        curModule = Modules.findOne({_id: moduleId});
        return JSON.stringify(curModule, null, 2);
    },
});

Template.moduleEditor.events({
   'click #show-json': function(event) {
        $('#json').show();
        $('#hide-json').show();
        $('#show-json').hide();
    },
    'click #hide-json': function(event) {
        $('#json').hide();
        $('#show-json').show();
        $('#hide-json').hide();
    },
    'click #switch-display': function(event){
        moduleId = $('#moduleId').val();
        state = $('#switch').html();
        if(state == "false"){
            result = "true";
        } else {
            result = "false";
        }
        changeModule(moduleId, "display", result);
    },
    'click #open-editor': function(event){
        $('#clone').remove();
        field = event.target.getAttribute('data-field');
        value = event.target.getAttribute('data-value');
        if(event.target.getAttribute('data-target') == null){
            cloneTo = event.target;
        } else {
            cloneTo = "#" + event.target.getAttribute('data-target')
            $(cloneTo).hide();
        }
        $("#input-editor").val(value);
        $("#text-editor").clone().attr("id","clone").show().insertAfter(cloneTo);
        $('#clone button').attr("data-field",field).attr('data-target', cloneTo);
    },
    'click #button-save': function(event){
        event.preventDefault();
        field = event.target.getAttribute('data-field');
        cloneTo = event.target.getAttribute('data-target');
        $(cloneTo).show();
        result = "\"" + $('#clone #input-editor').val() + "\"";
        moduleId = $('#moduleId').val();
        changeModule(moduleId, field, result);
        $('#clone').remove();
    },
    'change .combo-save': function(event){
        field = event.target.getAttribute('data-field');
        result = "\"" + event.target.value + "\"";
        moduleId = $('#moduleId').val();
        changeModule(moduleId, field, result);
    },
    'click #delete-item': function(event){
        event.preventDefault();
        field = event.target.getAttribute('data-field');
        result = "\"" + $('#clone #input-editor').val() + "\"";
        moduleId = $('#moduleId').val();
        deleteModuleItem(moduleId, field);
    },
    'click #add-item': function(event){
        event.preventDefault();
        field = event.target.getAttribute('data-field');
        result = "\"" + $('#clone #input-editor').val() + "\"";
        moduleId = $('#moduleId').val();
        addModuleItem(moduleId, field);
    },
    'click #move-page-up': function(event){
        event.preventDefault();
        moduleId = $('#moduleId').val();
        pageId = parseInt(event.target.getAttribute('data-page'));
        swapTo = pageId - 1;
        Meteor.call('swapPageOrder',moduleId,pageId,swapTo);
    },
    'click #move-page-down': function(event){
        event.preventDefault();
        moduleId = $('#moduleId').val();
        pageId = parseInt(event.target.getAttribute('data-page'));
        swapTo = pageId + 1;
        Meteor.call('swapPageOrder',moduleId,pageId,swapTo);
    }
    
})

Template.moduleEditor.onCreated(function() {
    Meteor.subscribe('modules');

})

Template.moduleEditor.onCreated(function(){
    this.assessmentIdentifier = new ReactiveVar();
})

function changeModule(moduleId, field, result){
    Meteor.call('changeModule', {
        moduleId: moduleId,
        field: field,
        result: result,
    })
}

function deleteModuleItem(moduleId, field){
    Meteor.call('deleteModuleItem', {
        moduleId: moduleId,
        field: field,
    })
}

function addModuleItem(moduleId, field){
    Meteor.call('addModuleItem', {
        moduleId: moduleId,
        field: field,
    })
}

