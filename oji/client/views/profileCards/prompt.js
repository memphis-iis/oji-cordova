import { moment } from 'meteor/momentjs:moment';

Template.prompt.helpers({
    'prompt': function(){
      //get a random number between 0 and 10
        const random = Math.floor(Math.random() * 10);
        //if the random number is less than 2, then return a prompt
        if(random < 5){
            //check if a thought log exists for today
            entries = Journals.find().fetch();
            curDate = moment().startOf('day').unix();
            //search through entries for today's date
            for(let entry of entries){
                entryDate = moment(entry.unixDate).startOf('day').unix();
                if(entryDate == curDate){
                    return {
                        "text": "How are you feeling today? Let's complete a thought log.",
                        "target": "journal",
                        "buttonText": "New Thought Log"
                    }
                }
            }
            //if no thought log exists for today 
            return {
                "text": "Have you done a relaxation technique today?",
                "target": "relaxationTechniques",
                "buttonText": "Relaxation Techniques"
            }
        } else {
            return false;
        }
    }
});