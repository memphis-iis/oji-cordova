//use fs to read every json file in the current directory
const fs = require('fs');
const path = require('path');
fs.readdirSync(__dirname).forEach(file => {
    if (file.endsWith(".json")) {
        const assessment = fs.readFileSync(file, "utf8");
        const assessmentObj = JSON.parse(assessment);
        const singleASsessment = assessmentObj.assessment;
        const assessmentString = JSON.stringify(singleASsessment);
        title = singleASsessment.title;
        //replace spaces with underscores
        title = title.replace(/\s/g, '_');
        //add .json to the end of the file name
        title = title + '.json';
        fs.writeFileSync(path.join(__dirname, title), assessmentString);
        //delete the original file
        fs.unlinkSync(file);
    }
});